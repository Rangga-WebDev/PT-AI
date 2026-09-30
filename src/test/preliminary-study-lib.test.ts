/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  categoryLevel,
  categoryRangeLabel,
  filterRespondents,
  formatDecimal,
  formatPercent,
  formatSkillScore,
  groupAnswersBySkill,
  itemRangeLabel,
  paginate,
  preliminaryOverviewSchema,
  preliminaryRespondentDetailSchema,
  scoreHistogram,
  skillExtremes,
  sortRespondents,
  type PreliminaryRespondent,
} from "@/lib/research/preliminary-study";

const CATEGORIES = [
  { label: "Rendah", min: 0, max: 60 },
  { label: "Sedang", min: 60, max: 80 },
  { label: "Tinggi", min: 80, max: 100 },
];

function respondent(
  code: string,
  category: string,
  score: number,
  interpretation = 2,
): PreliminaryRespondent {
  return {
    id: `00000000-0000-4000-8000-${code.padStart(12, "0")}`,
    code,
    category,
    total: Math.round((score * 48) / 100),
    score,
    skills: { interpretation },
  };
}

describe("kontrak RPC", () => {
  it("menerima ringkasan dari basis data dan menolak dimensi asing", () => {
    const overview = {
      dataset: {
        id: "9137dad8-a5f0-41ab-b7a3-c957011aedc7",
        title: "Tes uji",
        itemCount: 2,
        maxItemScore: 4,
        respondentCount: 1,
        sourceFile: "uji.csv",
        sourceSheet: "Uji",
        importedAt: "2026-09-28T03:00:00.000000+00:00",
      },
      summary: { respondents: 1, average: 50, lowest: 50, highest: 50 },
      categories: [{ ...CATEGORIES[0], count: 1, percent: 100 }],
      skills: [{ dimension: "interpretation", average: 2 }],
      items: [{ itemNumber: 1, dimension: "interpretation", average: 2 }],
      scores: [{ score: 50, category: "Rendah" }],
    };

    expect(preliminaryOverviewSchema.parse(overview)).toEqual(overview);
    expect(
      preliminaryOverviewSchema.safeParse({
        ...overview,
        skills: [{ dimension: "creativity", average: 2 }],
      }).success,
    ).toBe(false);
  });

  it("menuntut jawaban lengkap pada detail responden", () => {
    expect(
      preliminaryRespondentDetailSchema.safeParse({
        id: "9137dad8-a5f0-41ab-b7a3-c957011aedc7",
        code: "M01",
      }).success,
    ).toBe(false);
  });
});

describe("format Indonesia", () => {
  it("memakai koma desimal", () => {
    expect(formatDecimal(57.21)).toBe("57,21");
    expect(formatDecimal(50)).toBe("50,00");
    expect(formatDecimal(null)).toBe("–");
    expect(formatSkillScore(1.5)).toBe("1,5");
    expect(formatSkillScore(undefined)).toBe("–");
    expect(formatPercent(54)).toBe("54%");
    expect(formatPercent(33.33)).toBe("33,3%");
  });

  it("menulis rentang kategori sesuai pedoman", () => {
    expect(
      CATEGORIES.map((_, index) => categoryRangeLabel(CATEGORIES, index)),
    ).toEqual(["< 60", "60–79,99", "≥ 80"]);
  });

  it("memberi tingkat ordinal pada kategori", () => {
    expect(
      ["Rendah", "Sedang", "Tinggi"].map((label) =>
        categoryLevel(CATEGORIES, label),
      ),
    ).toEqual([0, 1, 2]);
  });

  it("meringkas nomor soal per kecakapan", () => {
    expect(itemRangeLabel([2, 1])).toBe("Soal 1–2");
    expect(itemRangeLabel([1, 3])).toBe("Soal 1, 3");
    expect(itemRangeLabel([7])).toBe("Soal 7");
  });
});

describe("olah data grafik", () => {
  it("menemukan kecakapan terendah dan tertinggi", () => {
    expect(
      skillExtremes([
        { dimension: "interpretation", average: 2.11 },
        { dimension: "analysis", average: 2.25 },
        { dimension: "self_regulation", average: 2.44 },
      ]),
    ).toEqual({
      lowest: { dimension: "interpretation", average: 2.11 },
      highest: { dimension: "self_regulation", average: 2.44 },
    });
    expect(
      skillExtremes([
        { dimension: "interpretation", average: 2 },
        { dimension: "analysis", average: 2 },
      ]),
    ).toBeNull();
  });

  it("mengelompokkan nilai per rentang 5 poin, 100 masuk rentang terakhir", () => {
    const bins = scoreHistogram([
      { score: 31.25, category: "Rendah" },
      { score: 59.99, category: "Rendah" },
      { score: 60, category: "Sedang" },
      { score: 100, category: "Tinggi" },
    ]);
    expect(bins).toHaveLength(20);
    expect(bins[6]?.entries).toHaveLength(1);
    expect(bins[11]?.entries.map((entry) => entry.score)).toEqual([59.99]);
    expect(bins[12]?.entries.map((entry) => entry.score)).toEqual([60]);
    expect(bins[19]).toMatchObject({ from: 95, to: 100 });
    expect(bins[19]?.entries.map((entry) => entry.score)).toEqual([100]);
  });
});

describe("tabel responden", () => {
  const rows = [
    respondent("M10", "Sedang", 64.58, 3),
    respondent("M2", "Rendah", 43.75, 1),
    respondent("M1", "Tinggi", 91.67, 4),
    respondent("M3", "Rendah", 37.5, 1.5),
  ];
  const order = CATEGORIES.map((item) => item.label);

  it("menyaring menurut ID dan kategori", () => {
    expect(
      filterRespondents(rows, { query: " m1", category: null }).map(
        (row) => row.code,
      ),
    ).toEqual(["M10", "M1"]);
    expect(
      filterRespondents(rows, { query: "", category: "Rendah" }).map(
        (row) => row.code,
      ),
    ).toEqual(["M2", "M3"]);
  });

  it("mengurutkan ID secara alami dan nilai secara numerik", () => {
    expect(
      sortRespondents(rows, "code", "asc", order).map((row) => row.code),
    ).toEqual(["M1", "M2", "M3", "M10"]);
    expect(
      sortRespondents(rows, "score", "desc", order).map((row) => row.code),
    ).toEqual(["M1", "M10", "M2", "M3"]);
    expect(
      sortRespondents(rows, "category", "asc", order).map((row) => row.code),
    ).toEqual(["M3", "M2", "M10", "M1"]);
    expect(
      sortRespondents(rows, "interpretation", "asc", order).map(
        (row) => row.code,
      ),
    ).toEqual(["M2", "M3", "M10", "M1"]);
  });

  it("membagi halaman dan menjaga nomor halaman tetap sah", () => {
    const many = Array.from({ length: 23 }, (_, index) => index + 1);
    expect(paginate(many, 3, 10)).toMatchObject({
      page: 3,
      pageCount: 3,
      start: 21,
      end: 23,
      total: 23,
    });
    expect(paginate(many, 9, 10).page).toBe(3);
    expect(paginate([], 1, 10)).toMatchObject({
      rows: [],
      page: 1,
      pageCount: 1,
      start: 0,
      end: 0,
    });
  });
});

describe("jawaban per kecakapan", () => {
  it("mengelompokkan menurut urutan enam kecakapan dan menghitung rata-rata", () => {
    const groups = groupAnswersBySkill([
      { itemNumber: 3, dimension: "analysis", score: 2, answer: "c" },
      { itemNumber: 2, dimension: "interpretation", score: 3, answer: "b" },
      { itemNumber: 1, dimension: "interpretation", score: 4, answer: "a" },
    ]);
    expect(
      groups.map((group) => [
        group.dimension,
        group.average,
        group.answers.map((answer) => answer.itemNumber),
      ]),
    ).toEqual([
      ["interpretation", 3.5, [1, 2]],
      ["analysis", 2, [3]],
    ]);
  });
});
