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

// Penguncian tahap kini dihitung dari hasil ketuntasan nyata:
// lihat src/lib/mastery/access.ts.
