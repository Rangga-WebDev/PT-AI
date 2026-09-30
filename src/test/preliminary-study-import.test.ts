/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  buildImportPlan,
  categoryFor,
  deriveSheetNames,
  formatReport,
  parseBlueprint,
  parseCsv,
  scaledScore,
} from "../../scripts/lib/preliminary-study.mjs";

// Berkas uji sintetis kecil (2 soal, total maksimum 8), tidak pernah diimpor.
const HEADER =
  "ID,Kategori,Soal 1,Soal 2,Skor 1,Skor 2,Total Skor,Nilai (0-100)";
const VALID_ROWS = [
  'U01,Rendah,"Jawaban uji, dengan koma","Baris satu\nbaris dua",1,2,3,37.5',
  'U02,Sedang,Jawaban uji,"Kutip ""ganda""  ",3,2,5,62.5',
  "U03,Tinggi,Jawaban uji,Jawaban lain,4,3,7,87.5",
];
const BLUEPRINT = [
  "KISI-KISI UJI,,,,,",
  ",,,,,",
  "No,Kecakapan (Facione),Indikator,Bentuk Tugas,Nomor Butir,Bobot",
  "1,Interpretasi,Indikator uji,Tugas uji,1,4",
  "2,Analisis,Indikator uji,Tugas uji,2,4",
  ",,,Total Skor Maksimum,,8",
].join("\n");

function plan(
  rows: string[] = VALID_ROWS,
  options: { blueprint?: string; expected?: number } = {},
) {
  return buildImportPlan({
    answers: {
      fileName: "uji-jawaban.csv",
      sheetName: "Jawaban Uji",
      bytes: Buffer.from([HEADER, ...rows].join("\n"), "utf8"),
    },
    blueprint: {
      fileName: "uji-kisi.csv",
      sheetName: "Kisi Uji",
      bytes: Buffer.from(options.blueprint ?? BLUEPRINT, "utf8"),
    },
    expectedRespondents: options.expected ?? 3,
  });
}

function withRow(index: number, row: string) {
  return VALID_ROWS.map((value, position) =>
    position === index ? row : value,
  );
}

describe("parseCsv", () => {
  it("membaca kutip, koma dan baris baru di dalam sel, kutip lolos, CRLF, dan BOM", () => {
    expect(
      parseCsv('\uFEFFa,b\r\n"x, y","baris\nkedua"\r\n"kata ""kutip""",z'),
    ).toEqual([
      ["a", "b"],
      ["x, y", "baris\nkedua"],
      ['kata "kutip"', "z"],
    ]);
  });

  it("mengenali pemisah titik koma dari ekspor Excel berlokal Indonesia", () => {
    expect(parseCsv('ID;Nilai\nM01;"43,75"')).toEqual([
      ["ID", "Nilai"],
      ["M01", "43,75"],
    ]);
  });

  it("menolak tanda kutip yang tidak tertutup", () => {
    expect(() => parseCsv('a,"b\nc')).toThrow("csv_unterminated_quote");
  });
});

describe("skala dan kategori penelitian", () => {
  it("mengonversi total ke 0-100 dengan dua desimal", () => {
    expect(scaledScore(21, 48)).toBe(43.75);
    expect(scaledScore(23, 48)).toBe(47.92);
    expect(scaledScore(48, 48)).toBe(100);
  });

  it.each([
    [0, "Rendah"],
    [59.99, "Rendah"],
    [60, "Sedang"],
    [79.99, "Sedang"],
    [80, "Tinggi"],
    [100, "Tinggi"],
  ])("nilai %s termasuk %s", (score, label) => {
    expect(categoryFor(score)).toBe(label);
  });
});

describe("deriveSheetNames", () => {
  it("memisahkan nama buku kerja dari nama sheet hasil ekspor", () => {
    expect(
      deriveSheetNames(
        "Instrumen_BK_50 (1)-Jawaban Lengkap 50.csv",
        "Instrumen_BK_50 (1)-1. Kisi-kisi Instrumen.csv",
      ),
    ).toEqual(["Jawaban Lengkap 50", "1. Kisi-kisi Instrumen"]);
  });

  it("memakai nama berkas utuh bila tidak ada buku kerja bersama", () => {
    expect(deriveSheetNames("jawaban.csv", "kisi.csv")).toEqual([
      "jawaban",
      "kisi",
    ]);
  });
});

describe("parseBlueprint", () => {
  it("memetakan nomor butir ke kecakapan beserta baris sumbernya", () => {
    const rows = parseCsv(
      BLUEPRINT.replace(
        "Analisis,Indikator uji,Tugas uji,2,4",
        'Regulasi diri,Indikator uji,Tugas uji,"2, 3",4',
      ),
    );
    expect(parseBlueprint(rows)).toEqual({
      items: [
        { itemNumber: 1, dimension: "interpretation", sourceRow: 4 },
        { itemNumber: 2, dimension: "self_regulation", sourceRow: 5 },
        { itemNumber: 3, dimension: "self_regulation", sourceRow: 5 },
      ],
      issues: [],
    });
  });

  it("melaporkan kecakapan yang tidak dikenal", () => {
    const rows = parseCsv(BLUEPRINT.replace("Analisis", "Kreativitas"));
    expect(parseBlueprint(rows).issues).toEqual([
      "Kisi-kisi baris 5: kecakapan tidak dikenal.",
    ]);
  });
});

describe("buildImportPlan", () => {
  it("menyusun dataset tanpa galat dan mempertahankan jawaban persis", () => {
    const result = plan();

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.dataset).toMatchObject({
      itemCount: 2,
      maxItemScore: 4,
      respondentCount: 3,
      sourceFile: "uji-jawaban.csv",
      sourceSheet: "Jawaban Uji",
    });
    expect(result.dataset.sourceChecksum).toMatch(/^[0-9a-f]{64}$/);
    expect(
      result.items.map((item) => [item.itemNumber, item.dimension]),
    ).toEqual([
      [1, "interpretation"],
      [2, "analysis"],
    ]);
    expect(
      result.respondents.map((item) => [item.code, item.sourceRow]),
    ).toEqual([
      ["U01", 2],
      ["U02", 3],
      ["U03", 4],
    ]);
    expect(
      result.respondents[0]?.answers.map(
        (item: { answer: string }) => item.answer,
      ),
    ).toEqual(["Jawaban uji, dengan koma", "Baris satu\nbaris dua"]);
    expect(result.respondents[1]?.answers[1]).toEqual({
      itemNumber: 2,
      answer: 'Kutip "ganda"  ',
      score: 2,
      answerColumn: "Soal 2",
      scoreColumn: "Skor 2",
    });
    expect(result.summary.categories).toEqual([
      { label: "Rendah", count: 1 },
      { label: "Sedang", count: 1 },
      { label: "Tinggi", count: 1 },
    ]);
  });

  it("menolak jumlah responden yang tidak sesuai", () => {
    expect(plan(VALID_ROWS, { expected: 50 }).errors).toContain(
      "Jumlah responden 3, seharusnya 50.",
    );
  });

  it("menolak ID responden ganda", () => {
    const rows = withRow(2, "U01,Tinggi,Jawaban uji,Jawaban lain,4,3,7,87.5");
    expect(plan(rows).errors).toContain(
      "ID U01 muncul lebih dari sekali (baris 2, 4).",
    );
  });

  it.each([
    ["5", "di luar rentang"],
    ["2.5", "pecahan"],
    ["", "kosong"],
  ])("menolak skor %s (%s)", (score) => {
    const rows = withRow(
      2,
      `U03,Tinggi,Jawaban uji,Jawaban lain,4,${score},7,87.5`,
    );
    expect(plan(rows).errors).toContain(
      "Baris 4, Skor 2: bukan skor bulat 0–4.",
    );
  });

  it("menolak total yang tidak sama dengan jumlah skor butir", () => {
    const rows = withRow(2, "U03,Tinggi,Jawaban uji,Jawaban lain,4,3,8,87.5");
    expect(plan(rows).errors).toContain(
      "Baris 4: Total Skor 8 tidak sama dengan jumlah skor butir 7.",
    );
  });

  it("menolak nilai 0-100 yang tidak sesuai total", () => {
    const rows = withRow(2, "U03,Tinggi,Jawaban uji,Jawaban lain,4,3,7,88");
    expect(plan(rows).errors).toContain(
      "Baris 4: Nilai 88 tidak sama dengan 87.5 (total 7 dari 8).",
    );
  });

  it("menolak kategori yang tidak sesuai rentang penelitian", () => {
    const rows = withRow(2, "U03,Sedang,Jawaban uji,Jawaban lain,4,3,7,87.5");
    expect(plan(rows).errors).toContain(
      "Baris 4: kategori Sedang tidak sesuai nilai 87.5 (seharusnya Tinggi).",
    );
  });

  it("menolak jawaban kosong yang tetap diberi skor, tetapi menerima kosong bernilai 0", () => {
    const scored = withRow(0, 'U01,Rendah,"  ",Jawaban,1,2,3,37.5');
    expect(plan(scored).errors).toContain(
      "Baris 2, Soal 1: jawaban kosong tetapi skornya 1.",
    );

    const unanswered = withRow(0, "U01,Rendah,,Jawaban,0,2,2,25");
    expect(plan(unanswered).errors).toEqual([]);
  });

  it("menolak butir yang tidak dipetakan kisi-kisi", () => {
    const blueprint = BLUEPRINT.replace(
      "2,Analisis,Indikator uji,Tugas uji,2,4\n",
      "",
    );
    expect(plan(VALID_ROWS, { blueprint }).errors).toContain(
      "Kisi-kisi: Soal 2 tidak dipetakan ke kecakapan.",
    );
  });

  it("menolak berkas yang bukan UTF-8", () => {
    const result = buildImportPlan({
      answers: {
        fileName: "a.csv",
        sheetName: "A",
        bytes: Buffer.from([0x49, 0x44, 0xe9, 0x0a]),
      },
      blueprint: {
        fileName: "b.csv",
        sheetName: "B",
        bytes: Buffer.from(BLUEPRINT, "utf8"),
      },
      expectedRespondents: 1,
    });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "Berkas jawaban: berkas bukan UTF-8. Ekspor ulang sebagai CSV UTF-8.",
    );
  });

  it("mencatat jawaban identik yang diberi skor berbeda tanpa menolak impor", () => {
    const result = plan();

    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([
      "Soal 1: 3 jawaban hanya berisi 2 teks berbeda.",
      "Soal 1: 1 teks jawaban identik diberi skor berbeda.",
    ]);
  });

  it("tidak pernah mencetak isi jawaban pada laporan", () => {
    const rows = withRow(
      2,
      "U03,Sedang,Jawaban rahasia,Jawaban lain,9,3,7,87.5",
    );
    const report = formatReport(plan(rows));

    expect(report).toContain("impor ditolak");
    expect(report).not.toContain("Jawaban rahasia");
    expect(report).not.toContain("dengan koma");
  });
});
