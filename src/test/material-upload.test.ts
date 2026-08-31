/** @format */

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationError, AuthorizationError } from "@/lib/errors";

const requireUserOrThrow = vi.fn();
const requireLecturerOfClass = vi.fn();
const putMaterialObject = vi.fn();
const removeMaterialObject = vi.fn();
const recordExtractionOutcome = vi.fn();
const insert = vi.fn();
const deleteEq = vi.fn();

// Penjaga `server-only` dilumpuhkan hanya di berkas ini. Melonggarkannya lewat
// alias Vitest akan mencabut penjaga itu dari seluruh proyek.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/auth", () => ({
  requireUserOrThrow: () => requireUserOrThrow(),
  requireLecturerOfClass: (classId: string) => requireLecturerOfClass(classId),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      insert: (row: Record<string, unknown>) => insert(row),
      delete: () => ({ eq: (_column: string, id: string) => deleteEq(id) }),
    }),
  }),
}));

vi.mock("@/server/repositories/materials", () => ({
  nextMaterialSequence: async () => 1,
}));

vi.mock("@/server/services/material-storage", () => ({
  checksumOf: (bytes: Uint8Array) => `sha256-${bytes.byteLength}`,
  putMaterialObject: (args: unknown) => putMaterialObject(args),
  removeMaterialObject: (args: unknown) => removeMaterialObject(args),
  recordExtractionOutcome: (id: string, outcome: unknown) =>
    recordExtractionOutcome(id, outcome),
}));

const { uploadClassMaterial } =
  await import("@/server/services/material-upload");
const { POST } = await import("@/app/api/materials/upload/route");

const CLASS_ID = "11111111-1111-4111-8111-111111111111";
const LECTURER = { id: "22222222-2222-4222-8222-222222222222" };

const PDF = new Uint8Array([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a, 0x25,
]);
const MARKDOWN = new TextEncoder().encode("# RPS\n\nBab satu.");
const SVG = new TextEncoder().encode('<svg onload="alert(1)"></svg>');
const ZIP = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);

const fields = {
  classId: CLASS_ID,
  title: "RPS Pendidikan Kewarganegaraan",
  materialKind: "rps",
  visibility: "student",
};

function upload(
  file: Partial<{ name: string; type: string; bytes: Uint8Array }> = {},
  overrides: Record<string, unknown> = {},
) {
  return uploadClassMaterial({
    fields: { ...fields, ...overrides },
    file: {
      name: file.name ?? "rps.pdf",
      type: file.type ?? "application/pdf",
      bytes: file.bytes ?? PDF,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireUserOrThrow.mockResolvedValue(LECTURER);
  requireLecturerOfClass.mockResolvedValue(LECTURER);
  insert.mockResolvedValue({ error: null });
  putMaterialObject.mockResolvedValue(undefined);
  removeMaterialObject.mockResolvedValue(undefined);
  recordExtractionOutcome.mockResolvedValue(undefined);
  deleteEq.mockResolvedValue({ error: null });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("otorisasi unggahan", () => {
  it("menolak pengguna tanpa sesi", async () => {
    requireUserOrThrow.mockRejectedValue(new AuthenticationError());

    const result = await upload();

    expect(result).toMatchObject({ ok: false, reason: "unauthenticated" });
  });

  // Mahasiswa gagal pada requireLecturerOfThatClass karena perannya bukan dosen.
  it("menolak mahasiswa", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    const result = await upload();

    expect(result).toMatchObject({ ok: false, reason: "forbidden" });
  });

  it("menolak dosen di luar kelas tujuan", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    const result = await upload();

    expect(result.ok).toBe(false);
    expect(requireLecturerOfClass).toHaveBeenCalledWith(CLASS_ID);
  });

  it("menerima dosen pengampu kelas", async () => {
    const result = await upload();

    expect(result).toMatchObject({ ok: true, extractionStatus: "pending" });
  });

  // Kredensial service role tidak boleh menyentuh Storage sebelum wewenang
  // pengguna diputuskan lewat sesinya sendiri.
  it("tidak menyentuh Storage bila otorisasi gagal", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    await upload();

    expect(putMaterialObject).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });

  it("mengotorisasi sebelum memeriksa isi berkas", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    const result = await upload({ type: "text/html", bytes: SVG });

    expect(result).toMatchObject({ reason: "forbidden" });
  });
});

describe("penolakan berkas", () => {
  it("menolak berkas melebihi 25 MB", async () => {
    const oversized = new Uint8Array(26_214_401);
    oversized.set(PDF, 0);

    const result = await upload({ bytes: oversized });

    expect(result).toMatchObject({ ok: false, reason: "file_rejected" });
    expect(putMaterialObject).not.toHaveBeenCalled();
  });

  it("menolak tipe yang dipalsukan peramban", async () => {
    const result = await upload({
      name: "menyamar.pdf",
      type: "application/pdf",
      bytes: MARKDOWN,
    });

    expect(result).toMatchObject({ ok: false, reason: "file_rejected" });
  });

  it("menolak magic byte yang tidak dikenal", async () => {
    const result = await upload({
      type: "application/pdf",
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00]),
    });

    expect(result).toMatchObject({ ok: false, reason: "file_rejected" });
  });

  it("menolak HTML, SVG, dan JavaScript", async () => {
    for (const type of [
      "text/html",
      "image/svg+xml",
      "application/javascript",
    ]) {
      const result = await upload({ name: `berkas`, type, bytes: SVG });
      expect(result).toMatchObject({ ok: false, reason: "file_rejected" });
    }

    expect(insert).not.toHaveBeenCalled();
  });

  it("menolak metadata yang tidak lolos skema", async () => {
    const result = await upload({}, { title: "ab" });

    expect(result).toMatchObject({ ok: false, reason: "invalid" });
  });
});

describe("konsistensi baris dan objek", () => {
  it("menyimpan kunci objek berbentuk kelas/id dan checksum berkas", async () => {
    const result = await upload();

    expect(result.ok).toBe(true);
    const row = insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(row["storage_path"]).toBe(`${CLASS_ID}/${row["id"]}`);
    expect(row["checksum"]).toBe(`sha256-${PDF.byteLength}`);
    expect(row["size_bytes"]).toBe(PDF.byteLength);
  });

  it("membersihkan baris ketika unggahan objek gagal", async () => {
    putMaterialObject.mockRejectedValue(new Error("storage down"));

    const result = await upload();

    expect(result).toMatchObject({ ok: false, reason: "server" });
    const row = insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(deleteEq).toHaveBeenCalledWith(row["id"]);
    expect(removeMaterialObject).toHaveBeenCalledWith({
      classId: CLASS_ID,
      resourceId: row["id"],
    });
  });

  // Objek tidak pernah ditulis sebelum barisnya ada, sehingga objek yatim
  // tidak dapat terbentuk. Gerbangnya adalah penolakan basis data.
  it("tidak menulis objek ketika baris ditolak basis data", async () => {
    insert.mockResolvedValue({
      error: { code: "23514", message: "ck_learning_resources_mime" },
    });

    const result = await upload();

    expect(result.ok).toBe(false);
    expect(putMaterialObject).not.toHaveBeenCalled();
    expect(deleteEq).not.toHaveBeenCalled();
  });

  it("tidak membocorkan SQLSTATE atau nama constraint ke pemanggil", async () => {
    insert.mockResolvedValue({
      error: {
        code: "23514",
        message: "new row violates check constraint ck_learning_resources_mime",
        details: "Failing row contains (...)",
      },
    });

    const result = await upload();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).not.toContain("23514");
    expect(result.error).not.toContain("ck_learning_resources");
    expect(result.error).not.toContain("constraint");
  });
});

describe("provenans ekstraksi", () => {
  it("membiarkan berkas biner berstatus pending", async () => {
    const result = await upload();

    expect(result).toMatchObject({ extractionStatus: "pending" });
    expect(recordExtractionOutcome).not.toHaveBeenCalled();
  });

  it("membaca teks Markdown pada saat unggah", async () => {
    const result = await upload({
      name: "rps.md",
      type: "text/markdown",
      bytes: MARKDOWN,
    });

    expect(result).toMatchObject({ extractionStatus: "succeeded" });
    expect(recordExtractionOutcome).toHaveBeenCalledWith(expect.any(String), {
      status: "succeeded",
      text: "# RPS\n\nBab satu.",
    });
  });

  // Unggahan yang sudah berhasil tidak boleh dibatalkan oleh kegagalan
  // ekstraksi; berkasnya tetap ada dan tetap dapat diunduh.
  it("tetap berhasil meski pencatatan ekstraksi gagal", async () => {
    recordExtractionOutcome.mockRejectedValue(new Error("db down"));

    const result = await upload({
      name: "rps.md",
      type: "text/markdown",
      bytes: MARKDOWN,
    });

    expect(result).toMatchObject({ ok: true, extractionStatus: "pending" });
    expect(deleteEq).not.toHaveBeenCalled();
  });
});

describe("Route Handler POST /api/materials/upload", () => {
  function request(body: BodyInit | null, headers: Record<string, string>) {
    return new Request("http://localhost/api/materials/upload", {
      method: "POST",
      headers,
      body,
    });
  }

  function form(bytes: Uint8Array, type: string, name: string): FormData {
    const data = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      data.set(key, value);
    }
    data.set("file", new File([bytes as BufferSource], name, { type }));
    return data;
  }

  it("menolak permintaan tanpa content-length", async () => {
    const response = await POST(request(null, {}));

    expect(response.status).toBe(411);
    expect(putMaterialObject).not.toHaveBeenCalled();
  });

  // Body tidak boleh dibaca lebih dahulu hanya untuk kemudian ditolak.
  it("menolak berdasarkan content-length sebelum membaca body", async () => {
    const response = await POST(
      request("x", { "content-length": String(200 * 1024 * 1024) }),
    );

    expect(response.status).toBe(413);
    expect(requireUserOrThrow).not.toHaveBeenCalled();
  });

  it("menolak body yang bukan multipart", async () => {
    const response = await POST(
      request("bukan form", {
        "content-length": "10",
        "content-type": "text/plain",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("mengembalikan 401 untuk pengguna tanpa sesi", async () => {
    requireUserOrThrow.mockRejectedValue(new AuthenticationError());

    const response = await POST(
      request(form(PDF, "application/pdf", "rps.pdf"), {
        "content-length": "2048",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ ok: false });
  });

  it("mengembalikan 403 untuk dosen di luar kelas", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    const response = await POST(
      request(form(PDF, "application/pdf", "rps.pdf"), {
        "content-length": "2048",
      }),
    );

    expect(response.status).toBe(403);
  });

  it("mengembalikan 415 untuk berkas yang ditolak", async () => {
    const response = await POST(
      request(form(ZIP, "application/pdf", "menyamar.pdf"), {
        "content-length": "2048",
      }),
    );

    expect(response.status).toBe(415);
  });

  it("mengembalikan 201 dan hanya id sumber daya", async () => {
    const response = await POST(
      request(form(PDF, "application/pdf", "rps.pdf"), {
        "content-length": "2048",
      }),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toEqual({
      ok: true,
      resourceId: expect.any(String),
      extractionStatus: "pending",
    });
    expect(JSON.stringify(body)).not.toContain(CLASS_ID);
  });
});
