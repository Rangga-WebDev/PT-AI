/** @format */

import { z } from "zod";

const uuid = (label: string) => z.string().uuid(`${label} tidak valid.`);

// Yang dikirim adalah level rubrik, bukan persentase; batas di sini hanya
// penjaga bentuk. Keabsahan sesungguhnya diuji terhadap level rubriknya.
export const criterionScoreSchema = z.object({
  criterionId: uuid("Kriteria"),
  score: z.coerce
    .number()
    .min(0, "Skor kriteria minimal 0.")
    .max(999.99, "Skor kriteria di luar batas yang wajar."),
});

export const masteryAssessmentSchema = z.object({
  attemptId: uuid("Respons awal"),
  outcome: z.enum(["not_met", "partially_met", "met"], {
    message: "Hasil ketuntasan tidak valid.",
  }),
  comment: z
    .string()
    .trim()
    .min(10, "Catatan penilaian minimal 10 karakter.")
    .max(2000, "Catatan penilaian terlalu panjang."),
  criteriaScores: z.array(criterionScoreSchema).default([]),
});

export const branchingRuleSchema = z.object({
  activityId: uuid("Aktivitas"),
  errorCategoryId: z.string().uuid().optional().or(z.literal("")),
  action: z.enum(["remedial", "enrichment", "continue", "hold"], {
    message: "Tindakan branching tidak valid.",
  }),
  targetUnitId: z.string().uuid().optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(999).default(100),
  // Aturan tanpa penjelasan tidak dapat disimpan (LOCK-PED-009).
  explanation: z
    .string()
    .trim()
    .min(10, "Penjelasan aturan minimal 10 karakter.")
    .max(1000, "Penjelasan terlalu panjang."),
});

export const branchingDecisionSchema = z.object({
  studentId: uuid("Mahasiswa"),
  activityId: uuid("Aktivitas"),
  branchingRuleId: z.string().uuid().optional().or(z.literal("")),
  errorCategoryId: z.string().uuid().optional().or(z.literal("")),
  action: z.enum(["remedial", "enrichment", "continue", "hold"], {
    message: "Tindakan branching tidak valid.",
  }),
  reason: z
    .string()
    .trim()
    .min(10, "Alasan keputusan minimal 10 karakter.")
    .max(1000, "Alasan terlalu panjang."),
});

export const masteryOverrideSchema = z.object({
  masteryResultId: uuid("Hasil ketuntasan"),
  outcome: z.enum(["not_met", "partially_met", "met"], {
    message: "Hasil ketuntasan tidak valid.",
  }),
  reason: z
    .string()
    .trim()
    .min(10, "Alasan override minimal 10 karakter.")
    .max(1000, "Alasan terlalu panjang."),
});

export type MasteryAssessmentInput = z.infer<typeof masteryAssessmentSchema>;
export type BranchingRuleInput = z.infer<typeof branchingRuleSchema>;
