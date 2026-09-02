/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { toActionError } from "@/lib/errors";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  rubricCriterionSchema,
  rubricLevelSchema,
  rubricSchema,
} from "@/lib/validation/content";
import { isUniqueViolation } from "@/server/repositories/shared";
import { createStandardRubric } from "@/server/services/rubric-template";

import type { FormState } from "@/actions/administration/accounts";

function fail(error: unknown): FormState {
  if (isUniqueViolation(error)) {
    return { error: "Kode kriteria tersebut sudah dipakai pada rubrik ini." };
  }
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

export async function createRubricAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");
    const parsed = rubricSchema.safeParse({
      title: formData.get("title"),
      description: formData.get("description") ?? undefined,
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("rubrics").insert({
      organization_id: lecturer.organizationId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      created_by: lecturer.id,
    });

    if (error) return fail(error);

    revalidatePath("/app/lecturer/rubrics");
    return { ok: true, message: "Rubrik berhasil dibuat." };
  } catch (error) {
    return fail(error);
  }
}

export async function createCriterionAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireRoleOrThrow("lecturer");
    const parsed = rubricCriterionSchema.safeParse({
      rubricId: formData.get("rubricId"),
      code: formData.get("code"),
      description: formData.get("description"),
      dimension: formData.get("dimension"),
      weight: formData.get("weight"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { data: last } = await supabase
      .from("rubric_criteria")
      .select("sequence")
      .eq("rubric_id", parsed.data.rubricId)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("rubric_criteria").insert({
      rubric_id: parsed.data.rubricId,
      code: parsed.data.code,
      description: parsed.data.description,
      dimension: parsed.data.dimension,
      weight: parsed.data.weight,
      sequence: (last?.sequence ?? 0) + 1,
    });

    if (error) return fail(error);

    revalidatePath("/app/lecturer/rubrics");
    return { ok: true, message: "Kriteria ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

export async function createLevelAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireRoleOrThrow("lecturer");
    const parsed = rubricLevelSchema.safeParse({
      criterionId: formData.get("criterionId"),
      label: formData.get("label"),
      descriptor: formData.get("descriptor"),
      score: formData.get("score"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { data: last } = await supabase
      .from("rubric_levels")
      .select("level_order")
      .eq("rubric_criterion_id", parsed.data.criterionId)
      .order("level_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("rubric_levels").insert({
      rubric_criterion_id: parsed.data.criterionId,
      level_order: (last?.level_order ?? 0) + 1,
      label: parsed.data.label,
      descriptor: parsed.data.descriptor,
      score: parsed.data.score,
    });

    if (error) return fail(error);

    revalidatePath("/app/lecturer/rubrics");
    return { ok: true, message: "Level ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

/** Rubrik standar dibuat utuh atau tidak sama sekali, tidak pernah separuh. */
export async function createStandardRubricAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const title = String(formData.get("title") ?? "").trim();
    const result = await createStandardRubric({
      organizationId: lecturer.organizationId,
      createdBy: lecturer.id,
      ...(title ? { title } : {}),
    });

    if (!result.ok) return { error: result.message };

    revalidatePath("/app/lecturer/rubrics");
    return {
      ok: true,
      message:
        "Rubrik standar PT-AI dibuat dengan enam kriteria dan level 0\u20134.",
    };
  } catch (error) {
    return fail(error);
  }
}
