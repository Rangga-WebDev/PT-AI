/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { toActionError } from "@/lib/errors";
import {
  requireLecturerOfClass,
  requireRoleOrThrow,
} from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  branchingDecisionSchema,
  branchingRuleSchema,
} from "@/lib/validation/assessment";

import type { FormState } from "@/actions/administration/accounts";

function fail(error: unknown): FormState {
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

async function classOfActivity(activityId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("activities")
    .select("learning_stages(learning_units(modules(class_id)))")
    .eq("id", activityId)
    .maybeSingle();
  return data?.learning_stages.learning_units.modules.class_id ?? null;
}

export async function createBranchingRuleAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = branchingRuleSchema.safeParse({
      activityId: formData.get("activityId"),
      errorCategoryId: formData.get("errorCategoryId") ?? "",
      action: formData.get("action"),
      targetUnitId: formData.get("targetUnitId") ?? "",
      priority: formData.get("priority") ?? 100,
      explanation: formData.get("explanation"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await classOfActivity(parsed.data.activityId);
    if (!classId) return { error: "Aktivitas tidak ditemukan." };

    const lecturer = await requireLecturerOfClass(classId);
    const supabase = await createClient();

    const { error } = await supabase.from("branching_rules").insert({
      activity_id: parsed.data.activityId,
      error_category_id: parsed.data.errorCategoryId || null,
      action: parsed.data.action,
      target_unit_id: parsed.data.targetUnitId || null,
      priority: parsed.data.priority,
      explanation: parsed.data.explanation,
      created_by: lecturer.id,
    });

    if (error) return fail(error);

    revalidatePath(`/app/lecturer/classes/${classId}/branching`);
    return { ok: true, message: "Aturan branching ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Keputusan adaptif selalu beralasan dan dapat dibaca mahasiswa (LOCK-PED-009).
 * `decided_by = 'lecturer'` karena yang memutuskan adalah manusia.
 */
export async function recordBranchingDecisionAction(
  input: unknown,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await requireRoleOrThrow("lecturer");

    const parsed = branchingDecisionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Keputusan tidak valid.",
      };
    }

    const classId = await classOfActivity(parsed.data.activityId);
    if (!classId) return { error: "Aktivitas tidak ditemukan." };

    await requireLecturerOfClass(classId);
    const supabase = await createClient();

    const { error } = await supabase.from("branching_decisions").insert({
      student_id: parsed.data.studentId,
      activity_id: parsed.data.activityId,
      branching_rule_id: parsed.data.branchingRuleId || null,
      error_category_id: parsed.data.errorCategoryId || null,
      action: parsed.data.action,
      reason: parsed.data.reason,
      decided_by: "lecturer",
    });

    if (error) {
      const result = toActionError(error);
      return result.ok ? {} : { error: result.error };
    }

    revalidatePath("/app/lecturer/review", "layout");
    revalidatePath("/app/student/progress");
    return { ok: true };
  } catch (error) {
    const result = toActionError(error);
    return result.ok ? {} : { error: result.error };
  }
}
