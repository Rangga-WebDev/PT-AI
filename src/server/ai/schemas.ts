/** @format */

import { z } from "zod";

import type { AiFunction } from "@/lib/constants/stages";

/**
 * Keluaran AI divalidasi dua lapis: `responseSchema` di sisi penyedia, lalu
 * skema Zod di sisi kita. Kegagalan lapis kedua dicatat `schema_rejected` dan
 * tidak pernah ditampilkan ke mahasiswa.
 */

export const AI_FEEDBACK_KINDS = [
  "guiding_question",
  "strength",
  "gap",
  "counter_argument",
  "hint",
  "recommendation",
] as const;

export const CT_DIMENSIONS = [
  "interpretation",
  "analysis",
  "evaluation",
  "inference",
  "explanation",
  "self_regulation",
] as const;

const citationSchema = z.object({
  chunkId: z.string().default(""),
  quotedText: z.string().trim().min(1).max(1000),
});

const itemSchema = z.object({
  kind: z.enum(AI_FEEDBACK_KINDS),
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(2000),
  dimension: z.enum(CT_DIMENSIONS).optional(),
  citations: z.array(citationSchema).max(5).default([]),
});

export const aiResponseSchema = z.object({
  items: z.array(itemSchema).min(1).max(6),
});

export type AiResponse = z.infer<typeof aiResponseSchema>;
export type AiResponseItem = z.infer<typeof itemSchema>;

/** Bentuk skema yang dikirim ke penyedia; sengaja dijaga sederhana. */
export const providerResponseSchema = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          kind: { type: "STRING", enum: [...AI_FEEDBACK_KINDS] },
          title: { type: "STRING" },
          body: { type: "STRING" },
          dimension: { type: "STRING", enum: [...CT_DIMENSIONS] },
          citations: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                chunkId: { type: "STRING" },
                quotedText: { type: "STRING" },
              },
              required: ["chunkId", "quotedText"],
            },
          },
        },
        required: ["kind", "title", "body", "citations"],
      },
    },
  },
  required: ["items"],
} as const;

/** Jenis butir yang wajar untuk tiap fungsi; dipakai memandu prompt. */
export const EXPECTED_KINDS: Record<AiFunction, string[]> = {
  guiding_questions: ["guiding_question"],
  rubric_feedback: ["strength", "gap"],
  hint: ["hint"],
  counter_argument: ["counter_argument"],
  error_classification: ["gap"],
  learning_path: ["recommendation"],
};
