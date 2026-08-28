/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { toActionError } from "@/lib/errors";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  reflectionSchema,
  submitRevisionSchema,
} from "@/lib/validation/revision";
import { recordLearningEvent } from "@/server/analytics/events";
import { isUniqueViolation } from "@/server/repositories/shared";

export interface RevisionActionResult {
  ok?: boolean;
  error?: string;
  revisionId?: string;
}

export async function submitRevisionAction(
  input: unknown,
): Promise<RevisionActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = submitRevisionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Revisi tidak valid.",
      };
    }

    const supabase = await createClient();

    // Kiriman ulang dengan penanda yang sama dianggap berhasil, bukan galat.
    const { data: existing } = await supabase
      .from("revisions")
      .select("id")
      .eq("client_submission_id", parsed.data.clientSubmissionId)
      .maybeSingle();

    if (existing) {
      return { ok: true, revisionId: existing.id };
    }

    const { data: attempt } = await supabase
      .from("attempts")
      .select("id, activity_id, student_id, is_baseline")
      .eq("id", parsed.data.attemptId)
      .maybeSingle();

    if (!attempt || attempt.student_id !== student.id || !attempt.is_baseline) {
      return { error: "Respons awal tidak ditemukan." };
    }

    const { data: last } = await supabase
      .from("revisions")
      .select("revision_number")
      .eq("attempt_id", parsed.data.attemptId)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: inserted, error } = await supabase
      .from("revisions")
      .insert({
        attempt_id: parsed.data.attemptId,
        student_id: student.id,
        revision_number: (last?.revision_number ?? 0) + 1,
        content: parsed.data.content,
        client_submission_id: parsed.data.clientSubmissionId,
      })
      .select("id")
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return { error: "Revisi ini sudah tersimpan." };
      }
      const result = toActionError(error);
      return result.ok ? {} : { error: result.error };
    }

    // Revisi tanpa alasan tidak bermakna secara pedagogis, jadi alasan ditulis
    // bersamaan. Bila penulisannya gagal, revisi tetap ada dan tidak dapat
    // dihapus (append-only) — mahasiswa diberi tahu agar melengkapinya.
    const { error: reasonError } = await supabase
      .from("revision_reasons")
      .insert({
        revision_id: inserted.id,
        reason_type: parsed.data.reason.reasonType,
        detail: parsed.data.reason.detail,
        ai_feedback_id: parsed.data.reason.aiFeedbackId || null,
      });

    if (reasonError) {
      const result = toActionError(reasonError);
      return {
        revisionId: inserted.id,
        error: result.ok
          ? "Revisi tersimpan, tetapi alasannya gagal disimpan."
          : result.error,
      };
    }

    await recordLearningEvent({
      studentId: student.id,
      activityId: attempt.activity_id,
      eventType: "revision_submitted",
      payload: {
        revisionNumber: (last?.revision_number ?? 0) + 1,
        reasonType: parsed.data.reason.reasonType,
      },
    });

    revalidatePath("/app/student/progress");
    return { ok: true, revisionId: inserted.id };
  } catch (error) {
    const result = toActionError(error);
    return result.ok ? {} : { error: result.error };
  }
}
export interface ReflectionActionResult {
  ok?: boolean;
  error?: string;
}

export async function submitReflectionAction(
  input: unknown,
): Promise<ReflectionActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = reflectionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Refleksi tidak valid.",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("reflections").insert({
      activity_id: parsed.data.activityId,
      student_id: student.id,
      attempt_id: parsed.data.attemptId,
      revision_id: parsed.data.revisionId || null,
      initial_summary: parsed.data.initialSummary,
      feedback_summary: parsed.data.feedbackSummary,
      verified_sources_summary: parsed.data.verifiedSourcesSummary,
      final_summary: parsed.data.finalSummary,
      change_reason: parsed.data.changeReason,
      ai_accepted: parsed.data.aiAccepted,
      ai_rejected: parsed.data.aiRejected,
      bias_found: parsed.data.biasFound,
      next_strategy: parsed.data.nextStrategy,
    });

    if (error) {
      if (isUniqueViolation(error)) {
        return {
          error:
            "Refleksi untuk respons awal ini sudah tersimpan dan tidak dapat diubah.",
        };
      }
      const result = toActionError(error);
      return result.ok ? {} : { error: result.error };
    }

    await recordLearningEvent({
      studentId: student.id,
      activityId: parsed.data.activityId,
      eventType: "reflection_submitted",
    });

    revalidatePath("/app/student/progress");
    return { ok: true };
  } catch (error) {
    const result = toActionError(error);
    return result.ok ? {} : { error: result.error };
  }
}
