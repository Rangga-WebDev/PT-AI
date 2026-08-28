/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { AiFunction } from "@/lib/constants/stages";
import { toActionError } from "@/lib/errors";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { requestCoachFeedback } from "@/server/ai/coach";

export interface AiActionResult {
  ok?: boolean;
  error?: string;
}

const AI_FUNCTIONS = [
  "guiding_questions",
  "rubric_feedback",
  "hint",
  "counter_argument",
  "error_classification",
  "learning_path",
] as const;

const requestSchema = z.object({
  activityId: z.string().uuid("Aktivitas tidak valid."),
  attemptId: z.string().uuid("Respons awal tidak valid."),
  aiFunction: z.enum(AI_FUNCTIONS, { message: "Fungsi AI tidak valid." }),
});

const incidentSchema = z.object({
  feedbackId: z.string().uuid("Umpan balik tidak valid."),
  classId: z.string().uuid("Kelas tidak valid."),
  reason: z
    .string()
    .trim()
    .min(10, "Alasan laporan minimal 10 karakter.")
    .max(1000, "Alasan laporan terlalu panjang."),
});

const disclosureSchema = z.object({
  activityId: z.string().uuid("Aktivitas tidak valid."),
  attemptId: z.string().uuid("Respons awal tidak valid."),
  statement: z
    .string()
    .trim()
    .min(10, "Pernyataan minimal 10 karakter.")
    .max(2000, "Pernyataan terlalu panjang."),
  functionsUsed: z.array(z.enum(AI_FUNCTIONS)).default([]),
});

function fail(error: unknown): AiActionResult {
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

export async function requestAiFeedbackAction(
  input: unknown,
): Promise<AiActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Permintaan tidak valid.",
      };
    }

    const result = await requestCoachFeedback({
      studentId: student.id,
      activityId: parsed.data.activityId,
      attemptId: parsed.data.attemptId,
      function: parsed.data.aiFunction as AiFunction,
    });

    if (!result.ok) return { error: result.error };

    revalidatePath("/app/student/learn", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Mahasiswa wajib menyatakan sikap atas tiap saran (LOCK-PED-011). */
export async function markFeedbackAction(
  feedbackId: string,
  action: "accepted" | "ignored" | "reported",
): Promise<AiActionResult> {
  try {
    await requireStudentAccess();
    const supabase = await createClient();

    const { error } = await supabase
      .from("ai_feedback")
      .update({ student_action: action, acted_at: new Date().toISOString() })
      .eq("id", feedbackId);

    if (error) return fail(error);

    revalidatePath("/app/student/learn", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function verifyCitationAction(
  citationId: string,
  verified: boolean,
): Promise<AiActionResult> {
  try {
    await requireStudentAccess();
    const supabase = await createClient();

    const { error } = await supabase
      .from("ai_citations")
      .update({ verified_by_student: verified })
      .eq("id", citationId);

    if (error) return fail(error);

    revalidatePath("/app/student/learn", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function reportAiIncidentAction(
  input: unknown,
): Promise<AiActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = incidentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Laporan tidak valid.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("ai_incidents").insert({
      reporter_id: student.id,
      ai_feedback_id: parsed.data.feedbackId,
      class_id: parsed.data.classId,
      reason: parsed.data.reason,
    });

    if (error) return fail(error);

    await supabase
      .from("ai_feedback")
      .update({
        student_action: "reported",
        acted_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.feedbackId);

    revalidatePath("/app/student/learn", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function submitAiDisclosureAction(
  input: unknown,
): Promise<AiActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = disclosureSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Pernyataan tidak valid.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("ai_disclosures").insert({
      student_id: student.id,
      activity_id: parsed.data.activityId,
      attempt_id: parsed.data.attemptId,
      statement: parsed.data.statement,
      functions_used: parsed.data.functionsUsed,
    });

    if (error) return fail(error);

    revalidatePath("/app/student/learn", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
