/** @format */

import type { Database } from "@/lib/supabase/types";

export type StageKey = Database["public"]["Enums"]["stage_key"];
export type CtDimension = Database["public"]["Enums"]["ct_dimension"];
export type AiFunction = Database["public"]["Enums"]["ai_function"];

/** Urutan enam tahap bersifat LOCKED (LOCK-PED-002) dan tidak dapat diubah. */
export const STAGE_ORDER: readonly StageKey[] = [
  "interpretation",
  "analysis",
  "evaluation",
  "inference",
  "explanation",
  "reflection",
] as const;

export const STAGE_LABEL: Record<StageKey, string> = {
  interpretation: "Interpretasi",
  analysis: "Analisis",
  evaluation: "Evaluasi",
  inference: "Inferensi",
  explanation: "Eksplanasi",
  reflection: "Refleksi",
};

export const DIMENSION_LABEL: Record<CtDimension, string> = {
  interpretation: "Interpretasi",
  analysis: "Analisis",
  evaluation: "Evaluasi",
  inference: "Inferensi",
  explanation: "Eksplanasi",
  self_regulation: "Regulasi diri",
};

export const ACTIVITY_TYPE_LABEL: Record<string, string> = {
  written_response: "Respons tertulis",
  claim_mapping: "Pemetaan klaim",
  source_verification: "Verifikasi sumber",
  reflection: "Refleksi",
};

export const AI_FUNCTION_LABEL: Record<string, string> = {
  guiding_questions: "Pertanyaan penuntun",
  rubric_feedback: "Umpan balik rubrik",
  hint: "Petunjuk",
  counter_argument: "Kontraargumen",
  error_classification: "Klasifikasi kesalahan",
  learning_path: "Rekomendasi jalur belajar",
};

export const PUBLICATION_LABEL: Record<string, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

export type StageAccess = "available" | "locked" | "disabled";

/**
 * Penguncian tahap menegakkan urutan LOCK-PED-002. Selama ketuntasan belum
 * dibangun (PHASE 11), hanya tahap pertama yang terbuka; parameter
 * `highestUnlockedSequence` disiapkan agar dapat diperluas tanpa mengubah UI.
 */
export function resolveStageAccess(
  sequence: number,
  isEnabled: boolean,
  highestUnlockedSequence = 1,
): StageAccess {
  if (!isEnabled) return "disabled";
  return sequence <= highestUnlockedSequence ? "available" : "locked";
}
