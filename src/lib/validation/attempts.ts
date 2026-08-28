/** @format */

import { z } from "zod";

export const MAX_ATTEMPT_LENGTH = 20000;

const attemptContent = z
  .string()
  .trim()
  .min(20, "Respons minimal 20 karakter agar dapat ditinjau.")
  .max(MAX_ATTEMPT_LENGTH, "Respons melebihi batas panjang yang diizinkan.");

export const draftSchema = z.object({
  activityId: z.string().uuid("Aktivitas tidak valid."),
  content: z.string().max(MAX_ATTEMPT_LENGTH, "Draf terlalu panjang."),
});

export const submitAttemptSchema = z.object({
  activityId: z.string().uuid("Aktivitas tidak valid."),
  content: attemptContent,
  // Dikirim klien agar percobaan ulang jaringan tidak membuat baseline ganda.
  clientSubmissionId: z.string().uuid("Penanda kiriman tidak valid."),
});

export type DraftInput = z.infer<typeof draftSchema>;
export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
