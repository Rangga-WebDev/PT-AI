/** @format */

import type { CriterionSuggestion } from "@/lib/ai/review-schema";
import type { MasteryOutcome } from "@/lib/mastery/access";

import { scoreRubric, type ScorableCriterion } from "./rubric-scoring";

export interface SuggestedAssessment {
  selections: Record<string, number>;
  /** Null bila ada kriteria tanpa usulan level yang dapat dipakai. */
  score: number | null;
  missingCriterionIds: string[];
}

/** Usulan AI diubah menjadi pilihan level yang sama bentuknya dengan formulir dosen. */
export function summarizeSuggestion(
  criteria: ScorableCriterion[],
  suggestions: CriterionSuggestion[],
): SuggestedAssessment {
  const byId = new Map(suggestions.map((entry) => [entry.criterionId, entry]));
  const selections: Record<string, number> = {};
  const missingCriterionIds: string[] = [];

  for (const criterion of criteria) {
    const entry = byId.get(criterion.id);
    if (!entry || entry.insufficientEvidence || entry.suggestedScore === null) {
      missingCriterionIds.push(criterion.id);
    } else {
      selections[criterion.id] = entry.suggestedScore;
    }
  }

  if (missingCriterionIds.length > 0) {
    return { selections, score: null, missingCriterionIds };
  }

  const scored = scoreRubric(criteria, selections);
  return {
    selections,
    score: scored.ok ? scored.data.score : null,
    missingCriterionIds: scored.ok ? [] : criteria.map((item) => item.id),
  };
}

/**
 * Usulan awal hasil ketuntasan dari nilai rubrik terhadap ambang. Hanya
 * pengisi awal formulir; dosen yang menyimpan, dan dapat mengubahnya.
 */
export function proposeOutcome(
  score: number,
  threshold: number,
): MasteryOutcome {
  if (score >= threshold) return "met";
  if (score >= threshold / 2) return "partially_met";
  return "not_met";
}
