/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  PTAI_CT_CRITERIA,
  PTAI_CT_MAX_LEVEL,
  PTAI_CT_RUBRIC_VERSION,
} from "@/lib/assessment/ptai-critical-thinking-rubric";
import {
  criterionMaxScore,
  isRubricComplete,
  scoreRubric,
  type ScorableCriterion,
} from "@/lib/assessment/rubric-scoring";
import type { CtDimension } from "@/lib/constants/stages";

const DIMENSIONS: CtDimension[] = [
  "interpretation",
  "analysis",
  "evaluation",
  "inference",
  "explanation",
  "self_regulation",
];

/** Rubrik standar dalam bentuk yang dipakai mesin penilaian. */
const standard: ScorableCriterion[] = PTAI_CT_CRITERIA.map(
  (criterion, index) => ({
    id: `c${index}`,
    dimension: criterion.dimension,
    weight: criterion.weight,
    levels: criterion.levels,
  }),
);

const select = (values: number[]): Record<string, number> =>
  Object.fromEntries(
    standard.map((criterion, i) => [criterion.id, values[i]!]),
  );

describe("rubrik standar PT-AI", () => {
  it("memiliki tepat enam kriteria", () => {
    expect(PTAI_CT_CRITERIA).toHaveLength(6);
  });

  it("memakai keenam dimensi berpikir kritis tanpa duplikat", () => {
    const used = PTAI_CT_CRITERIA.map((criterion) => criterion.dimension);
    expect(new Set(used).size).toBe(6);
    expect(used.slice().sort()).toEqual(DIMENSIONS.slice().sort());
  });

  it("memberi setiap kriteria lima level 0 sampai 4", () => {
    for (const criterion of PTAI_CT_CRITERIA) {
      expect(criterion.levels.map((level) => level.score)).toEqual([
        0, 1, 2, 3, 4,
      ]);
      expect(criterionMaxScore(criterion.levels)).toBe(PTAI_CT_MAX_LEVEL);
    }
  });

  it("tidak memuat deskriptor atau label kosong", () => {
    for (const criterion of PTAI_CT_CRITERIA) {
      expect(criterion.focus.trim().length).toBeGreaterThan(20);
      for (const level of criterion.levels) {
        expect(level.label.trim().length).toBeGreaterThan(0);
        expect(level.descriptor.trim().length).toBeGreaterThan(20);
      }
    }
  });

  it("tidak memakai deskriptor yang sama pada dua level", () => {
    const all = PTAI_CT_CRITERIA.flatMap((criterion) =>
      criterion.levels.map((level) => level.descriptor),
    );
    expect(new Set(all).size).toBe(all.length);
  });

  it("memberi bobot setara pada semua dimensi", () => {
    const weights = new Set(PTAI_CT_CRITERIA.map((c) => c.weight));
    expect(weights).toEqual(new Set([1]));
  });

  it("mencantumkan versi rumusan agar perubahan dapat ditelusuri", () => {
    expect(PTAI_CT_RUBRIC_VERSION).toBeGreaterThanOrEqual(1);
  });
});

describe("normalisasi nilai", () => {
  it("memberi 0 ketika semua kriteria pada level terendah", () => {
    const result = scoreRubric(standard, select([0, 0, 0, 0, 0, 0]));
    expect(result).toMatchObject({ ok: true, data: { score: 0 } });
  });

  it("memberi 100 ketika semua kriteria pada level tertinggi", () => {
    const result = scoreRubric(standard, select([4, 4, 4, 4, 4, 4]));
    expect(result).toMatchObject({ ok: true, data: { score: 100 } });
  });

  it("menghitung 3,4,2,3,3,2 menjadi 70,83", () => {
    const result = scoreRubric(standard, select([3, 4, 2, 3, 3, 2]));
    expect(result.ok && result.data.score).toBe(70.83);
  });

  it("menyertakan persentase per dimensi, bukan level mentah", () => {
    const result = scoreRubric(standard, select([3, 4, 2, 3, 3, 2]));
    expect(result.ok && result.data.dimensions).toEqual([
      { dimension: "interpretation", score: 75 },
      { dimension: "analysis", score: 100 },
      { dimension: "evaluation", score: 50 },
      { dimension: "inference", score: 75 },
      { dimension: "explanation", score: 75 },
      { dimension: "self_regulation", score: 50 },
    ]);
  });

  it("membagi terhadap total bobot, bukan jumlah kriteria", () => {
    const weighted = standard.map((criterion, index) => ({
      ...criterion,
      weight: index === 1 ? 5 : 1,
    }));

    // (3 + 5x4 + 2 + 3 + 3 + 2) / (10 x 4) = 0,825
    const result = scoreRubric(weighted, select([3, 4, 2, 3, 3, 2]));
    expect(result.ok && result.data.score).toBe(82.5);
  });

  it("membaca skor tertinggi dari level, bukan mengandaikan 4", () => {
    const tenPoint: ScorableCriterion[] = [
      {
        id: "x",
        dimension: "analysis",
        weight: 1,
        levels: [{ score: 0 }, { score: 5 }, { score: 10 }],
      },
    ];

    expect(scoreRubric(tenPoint, { x: 5 })).toMatchObject({
      ok: true,
      data: { score: 50 },
    });
  });
});

describe("rubrik yang belum layak dipakai", () => {
  it("menolak rubrik tanpa kriteria", () => {
    expect(isRubricComplete([])).toBe(false);
    expect(scoreRubric([], {})).toEqual({
      ok: false,
      reason: "incomplete_rubric",
    });
  });

  it("menolak kriteria yang belum punya level", () => {
    const criteria: ScorableCriterion[] = [
      { id: "x", dimension: "analysis", weight: 1, levels: [] },
    ];
    expect(scoreRubric(criteria, { x: 0 })).toEqual({
      ok: false,
      reason: "incomplete_rubric",
    });
  });

  it("menolak kriteria yang seluruh levelnya bernilai nol", () => {
    const criteria: ScorableCriterion[] = [
      {
        id: "x",
        dimension: "analysis",
        weight: 1,
        levels: [{ score: 0 }, { score: 0 }],
      },
    ];
    expect(isRubricComplete(criteria)).toBe(false);
  });

  it("menolak level yang tidak ada pada rubrik", () => {
    expect(scoreRubric(standard, select([3, 4, 2, 3, 3, 7]))).toEqual({
      ok: false,
      reason: "unknown_level",
    });
  });

  it("menolak penilaian yang belum menyentuh semua kriteria", () => {
    const partial = { [standard[0]!.id]: 3, [standard[1]!.id]: 4 };
    expect(scoreRubric(standard, partial)).toEqual({
      ok: false,
      reason: "missing_selection",
    });
  });

  it("menolak nilai pecahan yang tidak ada sebagai level", () => {
    expect(scoreRubric(standard, select([3, 4, 2, 3, 3, 2.5]))).toEqual({
      ok: false,
      reason: "unknown_level",
    });
  });
});
