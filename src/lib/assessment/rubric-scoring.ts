/** @format */

import type { CtDimension } from "@/lib/constants/stages";
import { weightedRubricScore } from "@/lib/mastery/access";

export interface ScorableCriterion {
  id: string;
  dimension: CtDimension;
  weight: number;
  levels: { score: number }[];
}

export type RubricScoringFailure =
  | "incomplete_rubric"
  | "unknown_level"
  | "missing_selection";

export const RUBRIC_SCORING_MESSAGE: Record<RubricScoringFailure, string> = {
  incomplete_rubric:
    "Rubrik belum lengkap dan belum dapat digunakan untuk penilaian.",
  unknown_level:
    "Level yang dipilih tidak ada pada rubrik ini, sehingga nilai tidak dihitung.",
  missing_selection:
    "Setiap kriteria rubrik harus dipilih levelnya sebelum penilaian disimpan.",
};

export interface RubricScore {
  /** Nilai akhir 0–100 hasil normalisasi berbobot. */
  score: number;
  /** Persentase per kriteria, dipakai profil enam dimensi. */
  dimensions: { dimension: CtDimension; score: number }[];
}

export type RubricScoreResult =
  | { ok: true; data: RubricScore }
  | { ok: false; reason: RubricScoringFailure };

export function criterionMaxScore(levels: { score: number }[]): number {
  return levels.reduce((max, level) => Math.max(max, level.score), 0);
}

export function isRubricComplete(criteria: ScorableCriterion[]): boolean {
  if (criteria.length === 0) return false;

  return criteria.every(
    (criterion) =>
      criterion.weight > 0 &&
      criterion.levels.length >= 2 &&
      criterionMaxScore(criterion.levels) > 0,
  );
}

/**
 * Satu-satunya tempat nilai akhir dihitung. Level mentah yang dipilih dosen
 * dinormalisasi terhadap level tertinggi kriterianya sendiri, bukan terhadap
 * angka 4 atau 100 yang dipatok, agar rubrik berskala lain tetap benar.
 */
export function scoreRubric(
  criteria: ScorableCriterion[],
  selections: Record<string, number>,
): RubricScoreResult {
  if (!isRubricComplete(criteria)) {
    return { ok: false, reason: "incomplete_rubric" };
  }

  const entries: { weight: number; score: number; maxScore: number }[] = [];
  const dimensions: { dimension: CtDimension; score: number }[] = [];

  for (const criterion of criteria) {
    const selected = selections[criterion.id];
    if (selected === undefined) {
      return { ok: false, reason: "missing_selection" };
    }

    if (!criterion.levels.some((level) => level.score === selected)) {
      return { ok: false, reason: "unknown_level" };
    }

    const maxScore = criterionMaxScore(criterion.levels);
    entries.push({ weight: criterion.weight, score: selected, maxScore });
    dimensions.push({
      dimension: criterion.dimension,
      score: Math.round((selected / maxScore) * 10000) / 100,
    });
  }

  return {
    ok: true,
    data: { score: weightedRubricScore(entries), dimensions },
  };
}
