/** @format */

"use server";

import { createHash } from "node:crypto";

import { revalidatePath } from "next/cache";

import { toActionError } from "@/lib/errors";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { draftSchema, submitAttemptSchema } from "@/lib/validation/attempts";
import {
  CER_ELEMENTS,
  composeCerNarrative,
  submitCerSchema,
} from "@/lib/validation/cer";
import { recordLearningEvent } from "@/server/analytics/events";
import { isUniqueViolation } from "@/server/repositories/shared";

export interface AttemptActionResult {
  ok?: boolean;
  error?: string;
  savedAt?: string;
  baselineId?: string;
}

function fail(error: unknown): AttemptActionResult {
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

/** Aktivitas harus benar-benar terbaca mahasiswa; RLS tetap pertahanan terakhir. */
async function assertActivityReadable(activityId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("id")
    .eq("id", activityId)
    .eq("status", "published")
    .maybeSingle();
  return Boolean(data);
}

export async function saveDraftAction(
  activityId: string,
  content: string,
): Promise<AttemptActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = draftSchema.safeParse({ activityId, content });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Draf tidak valid." };
    }

    if (!(await assertActivityReadable(parsed.data.activityId))) {
      return { error: "Aktivitas tidak tersedia." };
    }

    const supabase = await createClient();

    // Draft tidak disimpan lagi setelah baseline ada agar tidak ada dua
    // sumber kebenaran atas jawaban mahasiswa.
    const { data: baseline } = await supabase
      .from("attempts")
      .select("id")
      .eq("activity_id", parsed.data.activityId)
      .eq("student_id", student.id)
      .eq("is_baseline", true)
      .maybeSingle();

    if (baseline) {
      return { error: "Respons awal sudah terkirim dan tidak dapat diubah." };
    }

    const savedAt = new Date().toISOString();
    const { error } = await supabase.from("attempt_drafts").upsert(
      {
        activity_id: parsed.data.activityId,
        student_id: student.id,
        content: parsed.data.content,
        updated_at: savedAt,
      },
      { onConflict: "activity_id,student_id" },
    );

    if (error) {
      const result = toActionError(error);
      return result.ok ? {} : { error: result.error };
    }

    return { ok: true, savedAt };
  } catch (error) {
    const result = toActionError(error);
    return result.ok ? {} : { error: result.error };
  }
}

export async function submitAttemptAction(
  activityId: string,
  content: string,
  clientSubmissionId: string,
): Promise<AttemptActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = submitAttemptSchema.safeParse({
      activityId,
      content,
      clientSubmissionId,
    });
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Respons tidak valid.",
      };
    }

    if (!(await assertActivityReadable(parsed.data.activityId))) {
      return { error: "Aktivitas tidak tersedia." };
    }

    const supabase = await createClient();

    // Kiriman ulang dengan penanda yang sama dianggap berhasil, bukan galat.
    const { data: existingSubmission } = await supabase
      .from("attempts")
      .select("id")
      .eq("client_submission_id", parsed.data.clientSubmissionId)
      .maybeSingle();

    if (existingSubmission) {
      return { ok: true, baselineId: existingSubmission.id };
    }

    const { data: baseline } = await supabase
      .from("attempts")
      .select("id")
      .eq("activity_id", parsed.data.activityId)
      .eq("student_id", student.id)
      .eq("is_baseline", true)
      .maybeSingle();

    if (baseline) {
      return {
        error:
          "Respons awal untuk aktivitas ini sudah tersimpan dan tidak dapat ditimpa.",
      };
    }

    // Hash dihitung di server; nilai dari klien tidak dapat dipercaya.
    const contentHash = createHash("sha256")
      .update(parsed.data.content)
      .digest("hex");

    const { data: inserted, error } = await supabase
      .from("attempts")
      .insert({
        activity_id: parsed.data.activityId,
        student_id: student.id,
        attempt_number: 1,
        is_baseline: true,
        content: parsed.data.content,
        content_hash: contentHash,
        client_submission_id: parsed.data.clientSubmissionId,
      })
      .select("id")
      .single();

    if (error) {
      if (isUniqueViolation(error)) {
        return {
          error:
            "Respons awal untuk aktivitas ini sudah tersimpan dan tidak dapat ditimpa.",
        };
      }
      const result = toActionError(error);
      return result.ok ? {} : { error: result.error };
    }

    await supabase
      .from("attempt_drafts")
      .delete()
      .eq("activity_id", parsed.data.activityId)
      .eq("student_id", student.id);

    await recordLearningEvent({
      studentId: student.id,
      activityId: parsed.data.activityId,
      eventType: "attempt_submitted",
      payload: { contentLength: parsed.data.content.length },
    });

    revalidatePath("/app/student/progress");
    return { ok: true, baselineId: inserted.id };
  } catch (error) {
    const result = toActionError(error);
    return result.ok ? {} : { error: result.error };
  }
}

/**
 * Aktivitas argumentatif: unsur CER disimpan terpisah di `attempt_answers`,
 * sementara narasi gabungannya tetap menjadi isi kanonik `attempts.content`.
 * Komposisi dilakukan di server agar teks tersimpan selalu cocok dengan
 * unsur-unsurnya.
 */
export async function submitCerAttemptAction(
  input: unknown,
): Promise<AttemptActionResult> {
  try {
    await requireStudentAccess();

    const parsed = submitCerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Argumen tidak valid.",
      };
    }

    const { activityId, clientSubmissionId, elements } = parsed.data;
    const narrative = composeCerNarrative(elements);

    const attempt = await submitAttemptAction(
      activityId,
      narrative,
      clientSubmissionId,
    );

    if (!attempt.ok || !attempt.baselineId) return attempt;

    const supabase = await createClient();
    const rows = CER_ELEMENTS.map((key, index) => ({ key, index }))
      .filter(({ key }) => elements[key].trim().length > 0)
      .map(({ key, index }) => ({
        attempt_id: attempt.baselineId!,
        question_key: key,
        content: elements[key].trim(),
        sequence: index + 1,
      }));

    const { error } = await supabase.from("attempt_answers").insert(rows);

    // Baseline sudah tersimpan dan tidak dapat ditarik kembali. Kegagalan
    // dekomposisi dilaporkan apa adanya, bukan disembunyikan.
    if (error && !isUniqueViolation(error)) return fail(error);

    return attempt;
  } catch (error) {
    return fail(error);
  }
}
