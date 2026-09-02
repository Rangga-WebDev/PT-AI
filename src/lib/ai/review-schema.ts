/** @format */

import { z } from "zod";

/**
 * Keluaran asisten penilaian. Skornya tidak pernah menjadi nilai akhir: ia
 * hanya usulan yang harus dilihat, diubah, atau diabaikan dosen.
 */

export const REVIEW_CONFIDENCE = ["low", "medium", "high"] as const;

export const CONFIDENCE_LABEL: Record<
  (typeof REVIEW_CONFIDENCE)[number],
  string
> = {
  low: "Keyakinan rendah",
  medium: "Keyakinan sedang",
  high: "Keyakinan tinggi",
};

const evidenceRefSchema = z.object({
  artifactId: z.string().trim().min(1),
  excerpt: z.string().trim().min(1).max(600),
});

const criterionSuggestionSchema = z.object({
  criterionId: z.string().trim().min(1),
  suggestedScore: z.number().nullable(),
  confidence: z.enum(REVIEW_CONFIDENCE),
  evidence: z.array(evidenceRefSchema).max(6).default([]),
  rationale: z.string().trim().min(10).max(1500),
  insufficientEvidence: z.boolean(),
});

export const reviewSuggestionSchema = z.object({
  criteria: z.array(criterionSuggestionSchema).min(1).max(20),
  overallObservations: z
    .array(z.string().trim().min(5).max(500))
    .max(8)
    .default([]),
  suggestedFeedback: z.string().trim().min(10).max(3000),
  limitations: z.array(z.string().trim().min(5).max(500)).max(8).default([]),
});

export type ReviewSuggestion = z.infer<typeof reviewSuggestionSchema>;
export type CriterionSuggestion = z.infer<typeof criterionSuggestionSchema>;

export const reviewProviderSchema = {
  type: "OBJECT",
  properties: {
    criteria: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          criterionId: { type: "STRING" },
          suggestedScore: { type: "NUMBER", nullable: true },
          confidence: { type: "STRING", enum: [...REVIEW_CONFIDENCE] },
          evidence: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                artifactId: { type: "STRING" },
                excerpt: { type: "STRING" },
              },
              required: ["artifactId", "excerpt"],
            },
          },
          rationale: { type: "STRING" },
          insufficientEvidence: { type: "BOOLEAN" },
        },
        required: [
          "criterionId",
          "confidence",
          "evidence",
          "rationale",
          "insufficientEvidence",
        ],
      },
    },
    overallObservations: { type: "ARRAY", items: { type: "STRING" } },
    suggestedFeedback: { type: "STRING" },
    limitations: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["criteria", "suggestedFeedback", "limitations"],
} as const;
