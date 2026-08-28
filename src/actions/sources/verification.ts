/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { CRITERION_KEYS } from "@/lib/constants/verification";
import { toActionError } from "@/lib/errors";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { claimLinkSchema, verificationSchema } from "@/lib/validation/sources";
import { recordLearningEvent } from "@/server/analytics/events";
import { isUniqueViolation } from "@/server/repositories/shared";

export interface VerificationActionResult {
  ok?: boolean;
  error?: string;
}

function fail(error: unknown): VerificationActionResult {
  if (isUniqueViolation(error)) {
    return { error: "Anda sudah menautkan sumber tersebut pada klaim ini." };
  }
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

export async function submitVerificationAction(
  input: unknown,
): Promise<VerificationActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = verificationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Verifikasi tidak valid.",
      };
    }

    // Checklist dinormalkan agar hanya keenam kunci resmi yang tersimpan.
    const checklist = Object.fromEntries(
      CRITERION_KEYS.map((key) => [key, parsed.data.checklist[key] === true]),
    );

    const supabase = await createClient();
    const { error } = await supabase.from("source_verifications").insert({
      source_id: parsed.data.sourceId,
      source_version_id: parsed.data.sourceVersionId || null,
      student_id: student.id,
      activity_id: parsed.data.activityId,
      verdict: parsed.data.verdict,
      checklist,
      note: parsed.data.note,
    });

    if (error) return fail(error);

    await recordLearningEvent({
      studentId: student.id,
      activityId: parsed.data.activityId,
      eventType: "source_verified",
      payload: { verdict: parsed.data.verdict },
    });

    revalidatePath(`/app/student/sources/${parsed.data.sourceId}`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function linkClaimToSourceAction(
  input: unknown,
): Promise<VerificationActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = claimLinkSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Tautan tidak valid.",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("claim_source_links").insert({
      claim_id: parsed.data.claimId,
      source_id: parsed.data.sourceId,
      link_type: parsed.data.linkType,
      note: parsed.data.note ?? null,
      linked_by: student.id,
    });

    if (error) return fail(error);

    revalidatePath("/app/student/sources", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/** Menautkan bukti adalah kerja eksploratif, jadi tautan boleh dicabut. */
export async function unlinkClaimSourceAction(
  linkId: string,
): Promise<VerificationActionResult> {
  try {
    await requireStudentAccess();

    const supabase = await createClient();
    const { error } = await supabase
      .from("claim_source_links")
      .delete()
      .eq("id", linkId);

    if (error) return fail(error);

    revalidatePath("/app/student/sources", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
