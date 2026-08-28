/** @format */

import { z } from "zod";

import { MAX_ATTEMPT_LENGTH } from "./attempts";

const uuid = (label: string) => z.string().uuid(`${label} tidak valid.`);

export const REVISION_REASON_TYPES = [
  "ai_suggestion_accepted",
  "ai_suggestion_rejected",
  "new_evidence",
  "lecturer_feedback",
  "self_review",
  "other",
] as const;

export type RevisionReasonType = (typeof REVISION_REASON_TYPES)[number];

export const REVISION_REASON_LABEL: Record<RevisionReasonType, string> = {
  ai_suggestion_accepted: "Menerima saran AI",
  ai_suggestion_rejected: "Menolak saran AI",
  new_evidence: "Menemukan bukti baru",
  lecturer_feedback: "Menindaklanjuti masukan dosen",
  self_review: "Hasil peninjauan sendiri",
  other: "Lainnya",
};

const reasonDetail = z
  .string()
  .trim()
  .min(10, "Alasan revisi minimal 10 karakter.")
  .max(1000, "Alasan revisi terlalu panjang.");

export const revisionReasonSchema = z.object({
  reasonType: z.enum(REVISION_REASON_TYPES, {
    message: "Jenis alasan revisi tidak valid.",
  }),
  detail: reasonDetail,
  aiFeedbackId: z.string().uuid().optional().or(z.literal("")),
});

export const submitRevisionSchema = z
  .object({
    attemptId: uuid("Respons awal"),
    content: z
      .string()
      .trim()
      .min(20, "Revisi minimal 20 karakter agar dapat ditinjau.")
      .max(MAX_ATTEMPT_LENGTH, "Revisi melebihi batas panjang yang diizinkan."),
    clientSubmissionId: uuid("Penanda kiriman"),
    reason: revisionReasonSchema,
  })
  // Menerima atau menolak saran AI hanya bermakna bila saran itu ditunjuk.
  .refine(
    (value) =>
      !value.reason.reasonType.startsWith("ai_suggestion") ||
      Boolean(value.reason.aiFeedbackId),
    {
      message: "Pilih saran AI yang Anda terima atau tolak.",
      path: ["reason", "aiFeedbackId"],
    },
  );

const reflectionField = (label: string) =>
  z
    .string()
    .trim()
    .min(10, `${label} minimal 10 karakter.`)
    .max(2000, `${label} terlalu panjang.`);

/** Sembilan unsur wajib LOCK-PED-011; tidak boleh diringkas jadi satu kotak teks. */
export const reflectionSchema = z.object({
  activityId: uuid("Aktivitas"),
  attemptId: uuid("Respons awal"),
  revisionId: z.string().uuid().optional().or(z.literal("")),
  initialSummary: reflectionField("Ringkasan respons awal"),
  feedbackSummary: reflectionField("Ringkasan umpan balik"),
  verifiedSourcesSummary: reflectionField("Ringkasan sumber terverifikasi"),
  finalSummary: reflectionField("Ringkasan jawaban akhir"),
  changeReason: reflectionField("Alasan perubahan"),
  aiAccepted: reflectionField("Saran AI yang diterima"),
  aiRejected: reflectionField("Saran AI yang ditolak"),
  biasFound: reflectionField("Bias yang ditemukan"),
  nextStrategy: reflectionField("Strategi berikutnya"),
});

export const lecturerFeedbackSchema = z.object({
  revisionId: uuid("Revisi"),
  content: z
    .string()
    .trim()
    .min(10, "Umpan balik minimal 10 karakter.")
    .max(2000, "Umpan balik terlalu panjang."),
});

export type SubmitRevisionInput = z.infer<typeof submitRevisionSchema>;
export type ReflectionInput = z.infer<typeof reflectionSchema>;
export type LecturerFeedbackInput = z.infer<typeof lecturerFeedbackSchema>;
