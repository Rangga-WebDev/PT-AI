/** @format */

import { z } from "zod";

// Enam dimensi berpikir kritis; tidak boleh bertambah dari sisi AI.
export const CT_DIMENSIONS = [
  "interpretation",
  "analysis",
  "evaluation",
  "inference",
  "explanation",
  "self_regulation",
] as const;

export const CT_DIMENSION_LABEL: Record<
  (typeof CT_DIMENSIONS)[number],
  string
> = {
  interpretation: "Interpretasi",
  analysis: "Analisis",
  evaluation: "Evaluasi",
  inference: "Inferensi",
  explanation: "Eksplanasi",
  self_regulation: "Regulasi diri",
};

export const QUICK_SETUP_DOCUMENT_TYPES = [
  "rps",
  "cpmk",
  "syllabus",
  "module",
  "reading",
  "other",
] as const;

export type QuickSetupDocumentType =
  (typeof QUICK_SETUP_DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABEL: Record<QuickSetupDocumentType, string> = {
  rps: "RPS",
  cpmk: "CPMK / Sub-CPMK",
  syllabus: "Silabus",
  module: "Modul",
  reading: "Bahan ajar",
  other: "Dokumen lain",
};

export const OUTCOME_TYPES = ["CPMK", "Sub-CPMK", "other"] as const;

const trimmed = (min: number, max: number) =>
  z.string().trim().min(min).max(max);

const learningOutcomeSchema = z.object({
  code: trimmed(1, 40).optional(),
  title: trimmed(3, 400),
  description: trimmed(1, 2000).optional(),
  type: z.enum(OUTCOME_TYPES).optional(),
});

const meetingSchema = z.object({
  sequence: z.number().int().min(1).max(64),
  title: trimmed(3, 300),
  topic: trimmed(1, 500).optional(),
  objectives: z.array(trimmed(3, 500)).max(12).default([]),
  suggestedMaterials: z.array(trimmed(1, 300)).max(12).default([]),
  suggestedActivities: z.array(trimmed(1, 300)).max(12).default([]),
  assessmentSuggestions: z.array(trimmed(1, 300)).max(12).default([]),
  criticalThinkingDimensions: z.array(z.enum(CT_DIMENSIONS)).max(6).default([]),
  ptaiCandidate: z.boolean().default(false),
  ptaiRationale: trimmed(1, 600).optional(),
});

const referenceSchema = z.object({
  title: trimmed(3, 400),
  note: trimmed(1, 500).optional(),
});

/**
 * Yang dinyatakan berasal dari dokumen dipisahkan dari yang disarankan AI
 * sejak di skema, bukan hanya di tampilan. Menggabungkan keduanya akan membuat
 * dosen mengira saran AI tertulis di RPS-nya.
 */
export const quickSetupDraftSchema = z.object({
  course: z
    .object({
      title: trimmed(3, 300).optional(),
      description: trimmed(1, 2000).optional(),
    })
    .optional(),
  learningOutcomes: z.array(learningOutcomeSchema).max(40).default([]),
  meetings: z.array(meetingSchema).max(32).default([]),
  references: z.array(referenceSchema).max(60).default([]),
  warnings: z.array(trimmed(3, 500)).max(20).default([]),
  ambiguities: z.array(trimmed(3, 500)).max(20).default([]),
});

export type QuickSetupDraft = z.infer<typeof quickSetupDraftSchema>;
export type QuickSetupMeeting = z.infer<typeof meetingSchema>;
export type QuickSetupOutcome = z.infer<typeof learningOutcomeSchema>;

/** Skema yang dikirim ke penyedia; sengaja dijaga datar dan sederhana. */
export const quickSetupProviderSchema = {
  type: "OBJECT",
  properties: {
    course: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        description: { type: "STRING" },
      },
    },
    learningOutcomes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          code: { type: "STRING" },
          title: { type: "STRING" },
          description: { type: "STRING" },
          type: { type: "STRING", enum: [...OUTCOME_TYPES] },
        },
        required: ["title"],
      },
    },
    meetings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          sequence: { type: "INTEGER" },
          title: { type: "STRING" },
          topic: { type: "STRING" },
          objectives: { type: "ARRAY", items: { type: "STRING" } },
          suggestedMaterials: { type: "ARRAY", items: { type: "STRING" } },
          suggestedActivities: { type: "ARRAY", items: { type: "STRING" } },
          assessmentSuggestions: { type: "ARRAY", items: { type: "STRING" } },
          criticalThinkingDimensions: {
            type: "ARRAY",
            items: { type: "STRING", enum: [...CT_DIMENSIONS] },
          },
          ptaiCandidate: { type: "BOOLEAN" },
          ptaiRationale: { type: "STRING" },
        },
        required: ["sequence", "title", "objectives"],
      },
    },
    references: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          note: { type: "STRING" },
        },
        required: ["title"],
      },
    },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
    ambiguities: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["learningOutcomes", "meetings", "warnings", "ambiguities"],
} as const;

export function summarizeDraft(draft: QuickSetupDraft): {
  outcomes: number;
  meetings: number;
  references: number;
  ptaiCandidates: number;
} {
  return {
    outcomes: draft.learningOutcomes.length,
    meetings: draft.meetings.length,
    references: draft.references.length,
    ptaiCandidates: draft.meetings.filter((m) => m.ptaiCandidate).length,
  };
}
