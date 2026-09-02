/** @format */

// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { lecturerGuide } from "@/content/guides/lecturer-guide";
import { studentGuide } from "@/content/guides/student-guide";
import type { Guide } from "@/content/guides/types";
import { LECTURER_NAV, STUDENT_NAV } from "@/lib/navigation";

const { GUIDE_OUTPUTS, renderGuide } =
  await import("../../scripts/build-guides.mjs");

const guides: [string, Guide][] = [
  ["dosen", lecturerGuide],
  ["mahasiswa", studentGuide],
];

/** Seluruh teks satu panduan, untuk memeriksa klaim yang tidak boleh ada. */
function plainText(guide: Guide): string {
  const parts: string[] = [guide.title, guide.intro];

  for (const section of guide.sections) {
    parts.push(section.title);
    for (const block of section.blocks) {
      if (block.kind === "paragraph" || block.kind === "note") {
        parts.push(block.text);
      } else if (block.kind === "limit") {
        parts.push(block.text);
      } else if (block.kind === "steps" || block.kind === "list") {
        parts.push(...block.items);
      } else {
        for (const item of block.items) {
          parts.push(item.term, item.description);
        }
      }
    }
  }

  return parts.join("\n").toLowerCase();
}

describe.each(guides)("panduan %s", (_name, guide) => {
  it("memiliki jangkar daftar isi yang unik", () => {
    const ids = guide.sections.map((section) => section.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => /^[a-z0-9-]+$/.test(id))).toBe(true);
  });

  it("tidak memuat bagian kosong", () => {
    for (const section of guide.sections) {
      expect(section.title.trim().length).toBeGreaterThan(3);
      expect(section.blocks.length).toBeGreaterThan(0);
    }
  });

  it("menjelaskan enam dimensi berpikir kritis", () => {
    const text = plainText(guide);
    for (const dimension of [
      "interpretasi",
      "analisis",
      "evaluasi",
      "inferensi",
      "eksplanasi",
      "regulasi diri",
    ]) {
      expect(text).toContain(dimension);
    }
  });

  it("tidak memakai istilah teknis basis data", () => {
    const text = plainText(guide);
    for (const term of [
      "rls",
      "rpc",
      "postgres",
      "supabase",
      "service role",
      "learning_resources",
      "mastery_results",
      "signed url",
      "endpoint",
    ]) {
      expect(text).not.toMatch(new RegExp(`\\b${term}\\b`));
    }
  });

  it("tidak menjanjikan fitur yang belum ada", () => {
    const text = plainText(guide);
    for (const claim of [
      "ocr",
      "impor massal",
      "unggah daftar",
      "mendaftar sendiri",
      "gabung dengan kode",
      "kode undangan",
      "pptx",
      "xlsx",
    ]) {
      expect(text).not.toContain(claim);
    }
  });

  it("tidak mengklaim AI memberi nilai akhir", () => {
    const text = plainText(guide);
    expect(text).not.toContain("ai menilai");
    expect(text).not.toContain("ai memberi nilai");
    expect(text).not.toContain("dinilai otomatis oleh ai");
  });
});

describe("panduan dosen", () => {
  const text = plainText(lecturerGuide);

  it("menuntun alur dosen dari awal sampai penilaian", () => {
    for (const step of [
      "buat kelas",
      "tambah mahasiswa",
      "unggah berkas",
      "susun draf dengan ai",
      "terapkan ke kelas",
      "gunakan template pt-ai",
      "terbitkan kelas",
      "lihat portofolio",
      "simpan penilaian",
      "bantu review dengan ai",
    ]) {
      expect(text).toContain(step);
    }
  });

  it("menegaskan bahwa keputusan nilai milik dosen", () => {
    expect(text).toContain("menyimpan nilai");
    expect(text).toContain("keputusan");
    expect(
      lecturerGuide.sections.some((section) => section.id === "batas-ai"),
    ).toBe(true);
  });

  it("menyatakan batas yang belum tersedia secara terbuka", () => {
    const limits = lecturerGuide.sections
      .flatMap((section) => section.blocks)
      .filter((block) => block.kind === "limit");

    expect(limits.length).toBeGreaterThanOrEqual(3);
    expect(text).toContain("pendaftaran mandiri oleh mahasiswa");
  });
});

describe("panduan mahasiswa", () => {
  const text = plainText(studentGuide);

  it("menuntun alur mahasiswa dari materi sampai portofolio", () => {
    for (const step of [
      "materi",
      "pt-ai",
      "simpan respons awal",
      "simpan verifikasi",
      "simpan revisi",
      "simpan refleksi",
      "portofolio",
    ]) {
      expect(text).toContain(step);
    }
  });

  it("menjelaskan bahwa bantuan AI menyusul respons awal", () => {
    expect(text).toContain(
      "bantuan ai baru tersedia setelah respons awal anda tersimpan",
    );
    expect(text).toContain("bukan menggantikannya");
  });

  it("menyatakan bahwa mahasiswa tidak dapat mendaftar sendiri", () => {
    expect(text).toContain("tidak dapat mendaftarkan diri sendiri");
  });
});

describe("navigasi panduan", () => {
  it("menautkan panduan dosen hanya pada menu dosen", () => {
    const lecturerHrefs = LECTURER_NAV.flatMap((section) =>
      section.items.map((item) => item.href),
    );
    const studentHrefs = STUDENT_NAV.flatMap((section) =>
      section.items.map((item) => item.href),
    );

    expect(lecturerHrefs).toContain("/app/lecturer/guide");
    expect(lecturerHrefs).not.toContain("/app/student/guide");
    expect(studentHrefs).toContain("/app/student/guide");
    expect(studentHrefs).not.toContain("/app/lecturer/guide");
  });
});

describe("terbitan Markdown", () => {
  it.each(GUIDE_OUTPUTS)(
    "docs/guides/$file sama dengan sumbernya",
    async ({ file, guide }) => {
      const target = path.resolve("docs/guides", file);
      const onDisk = await readFile(target, "utf8");

      expect(onDisk.replace(/\r\n/g, "\n")).toBe(renderGuide(guide));
    },
  );
});
