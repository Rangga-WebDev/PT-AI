/** @format */

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  checkUpload,
  createLinkMaterialSchema,
  decodeUtf8Text,
  detectSignature,
  isInlineExtractable,
  materialParentSchema,
  materialStorageKey,
  MATERIAL_MAX_BYTES,
  MATERIAL_MIME_ALLOWLIST,
  safeDisplayFilename,
  updateMaterialSchema,
} from "@/lib/validation/materials";

const PDF_HEAD = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37,
]);
const ZIP_HEAD = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const TEXT_HEAD = new TextEncoder().encode("# Modul PKn\n\nBab satu.");
const BINARY_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x1a]);

const DOCX =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("kunci objek bahan ajar", () => {
  it("disusun dari identitas, bukan nama berkas", () => {
    expect(
      materialStorageKey(
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ),
    ).toBe(
      "11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222",
    );
  });
});

describe("nama berkas tampilan", () => {
  it("membuang komponen path", () => {
    expect(safeDisplayFilename("../../etc/passwd")).toBe("passwd");
    expect(safeDisplayFilename("C:\\Users\\dosen\\RPS.pdf")).toBe("RPS.pdf");
  });

  it("membuang karakter kendali", () => {
    expect(safeDisplayFilename("rps\u0000\u001b.pdf")).toBe("rps.pdf");
  });

  it("tidak pernah mengembalikan nama kosong", () => {
    expect(safeDisplayFilename("   ")).toBe("berkas");
  });

  it("membatasi panjang", () => {
    expect(safeDisplayFilename("a".repeat(400))).toHaveLength(180);
  });
});

describe("pengenalan isi berkas", () => {
  it("mengenali PDF dari tanda tangannya", () => {
    expect(detectSignature(PDF_HEAD)).toBe("pdf");
  });

  it("mengenali kontainer OOXML sebagai zip", () => {
    expect(detectSignature(ZIP_HEAD)).toBe("zip");
  });

  it("mengenali teks UTF-8", () => {
    expect(detectSignature(TEXT_HEAD)).toBe("text");
  });

  it("menolak byte biner yang bukan PDF maupun zip", () => {
    expect(detectSignature(BINARY_HEAD)).toBe("unknown");
  });

  it("menolak berkas kosong", () => {
    expect(detectSignature(new Uint8Array())).toBe("unknown");
  });
});

describe("pemeriksaan unggahan", () => {
  it("menerima PDF yang sah", () => {
    const result = checkUpload({
      filename: "RPS Pendidikan Kewarganegaraan.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      head: PDF_HEAD,
    });

    expect(result).toEqual({
      ok: true,
      mimeType: "application/pdf",
      filename: "RPS Pendidikan Kewarganegaraan.pdf",
    });
  });

  it("menerima parameter charset pada tipe teks", () => {
    const result = checkUpload({
      filename: "catatan.md",
      mimeType: "text/markdown; charset=utf-8",
      sizeBytes: 20,
      head: TEXT_HEAD,
    });

    expect(result.ok).toBe(true);
  });

  it("menolak berkas kosong", () => {
    const result = checkUpload({
      filename: "kosong.pdf",
      mimeType: "application/pdf",
      sizeBytes: 0,
      head: new Uint8Array(),
    });

    expect(result).toEqual({ ok: false, reason: "empty" });
  });

  it("menolak berkas di atas 25 MB", () => {
    const result = checkUpload({
      filename: "besar.pdf",
      mimeType: "application/pdf",
      sizeBytes: MATERIAL_MAX_BYTES + 1,
      head: PDF_HEAD,
    });

    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("menolak tipe di luar allowlist", () => {
    const result = checkUpload({
      filename: "jahat.html",
      mimeType: "text/html",
      sizeBytes: 100,
      head: TEXT_HEAD,
    });

    expect(result).toEqual({ ok: false, reason: "mime_not_allowed" });
  });

  // Tipe yang dideklarasikan peramban berasal dari klien; isi berkaslah yang
  // menentukan. Tanpa pemeriksaan ini, berkas apa pun dapat menyamar sebagai PDF.
  it("menolak berkas yang isinya tidak cocok dengan tipe yang dinyatakan", () => {
    const result = checkUpload({
      filename: "menyamar.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
      head: BINARY_HEAD,
    });

    expect(result).toEqual({ ok: false, reason: "content_mismatch" });
  });

  it("menolak berkas biner yang menyamar sebagai teks", () => {
    const result = checkUpload({
      filename: "menyamar.txt",
      mimeType: "text/plain",
      sizeBytes: 100,
      head: BINARY_HEAD,
    });

    expect(result).toEqual({ ok: false, reason: "content_mismatch" });
  });

  it("menerima DOCX karena kontainernya memang zip", () => {
    const result = checkUpload({
      filename: "modul.docx",
      mimeType: DOCX,
      sizeBytes: 2048,
      head: ZIP_HEAD,
    });

    expect(result.ok).toBe(true);
  });
});

describe("skema bahan ajar", () => {
  it("menolak tautan non-http", () => {
    const result = createLinkMaterialSchema.safeParse({
      classId: "11111111-1111-4111-8111-111111111111",
      title: "Video pengantar",
      materialKind: "reading",
      visibility: "student",
      resourceType: "link",
      url: "javascript:alert(1)",
    });

    expect(result.success).toBe(false);
  });

  it("menuntut tepat satu induk", () => {
    expect(
      materialParentSchema.safeParse({
        classId: "11111111-1111-4111-8111-111111111111",
        moduleId: "22222222-2222-4222-8222-222222222222",
      }).success,
    ).toBe(false);

    expect(materialParentSchema.safeParse({}).success).toBe(false);

    expect(
      materialParentSchema.safeParse({
        classId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(true);
  });

  it("menolak visibilitas di luar dua nilai yang dikenal", () => {
    const result = updateMaterialSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      title: "Bahan",
      materialKind: "rps",
      visibility: "public",
    });

    expect(result.success).toBe(false);
  });
});

describe("kelayakan ekstraksi", () => {
  it("hanya tipe teks yang diekstraksi sebaris", () => {
    expect(isInlineExtractable("text/plain")).toBe(true);
    expect(isInlineExtractable("text/markdown")).toBe(true);
  });

  // Keduanya akan diekstraksi pekerja berikutnya. Menandainya di luar jangkauan
  // sekarang akan membuat status `unsupported` yang tidak benar.
  it("berkas biner dibiarkan untuk pekerja ekstraksi berikutnya", () => {
    expect(isInlineExtractable("application/pdf")).toBe(false);
    expect(isInlineExtractable(DOCX)).toBe(false);
  });
});

describe("pembacaan teks", () => {
  it("mengembalikan isi yang sudah dirapikan", () => {
    expect(decodeUtf8Text(new TextEncoder().encode("  Bab satu.  "))).toBe(
      "Bab satu.",
    );
  });

  it("menolak byte yang bukan UTF-8", () => {
    expect(decodeUtf8Text(new Uint8Array([0xff, 0xfe, 0xfd]))).toBeNull();
  });

  // Teks kosong tidak boleh menghasilkan `succeeded`: constraint basis data
  // menuntut extracted_text tidak null ketika statusnya succeeded.
  it("menganggap berkas berisi spasi saja sebagai gagal", () => {
    expect(decodeUtf8Text(new TextEncoder().encode("   \n\t "))).toBeNull();
  });
});

// Batas MIME hidup di tiga tempat: bucket Storage, constraint tabel, dan
// aplikasi. Menambah tipe di satu tempat saja adalah cara paling mudah
// melubangi allowlist, jadi kecocokannya diperiksa mesin.
describe("keselarasan allowlist dengan migrasi 0027", () => {
  const migration = readFileSync(
    path.resolve("supabase/migrations/20260901100027_storage_buckets.sql"),
    "utf8",
  );

  const bucketBlock =
    migration
      .split("insert into storage.buckets")
      .find((block) => block.includes("'materials',"))
      ?.split("on conflict")[0] ?? "";

  it("setiap tipe yang diterima aplikasi juga diterima bucket materials", () => {
    for (const mime of MATERIAL_MIME_ALLOWLIST) {
      expect(bucketBlock).toContain(`'${mime}'`);
    }
  });

  it("bucket materials tidak menerima tipe yang tidak dikenal aplikasi", () => {
    const declared = [...bucketBlock.matchAll(/'([a-z]+\/[^']+)'/g)].map(
      (match) => match[1],
    );

    expect(declared.sort()).toEqual([...MATERIAL_MIME_ALLOWLIST].sort());
  });

  it("batas ukuran aplikasi sama dengan batas bucket", () => {
    expect(migration).toContain(String(MATERIAL_MAX_BYTES));
  });
});
