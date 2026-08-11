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
  activityInstructionSchema,
  activitySchema,
  caseSchema,
  learningUnitSchema,
  moduleSchema,
  publicationSchema,
  stageUpdateSchema,
} from "@/lib/validation/content";
import { isUniqueViolation } from "@/server/repositories/shared";

import type { FormState } from "@/actions/administration/accounts";

function fail(error: unknown): FormState {
  if (isUniqueViolation(error)) {
    return {
      error: "Urutan tersebut sudah dipakai. Muat ulang lalu coba lagi.",
    };
  }
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

/** Nomor urut berikutnya dihitung dari data agar tidak bentrok. */
async function nextSequence(
  table: "modules" | "learning_units" | "activities",
  column: string,
  parentId: string,
): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from(table)
    .select("sequence")
    .eq(column, parentId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.sequence ?? 0) + 1;
}

async function classOfUnit(unitId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("learning_units")
    .select("modules(class_id)")
    .eq("id", unitId)
    .maybeSingle();
  return data?.modules.class_id ?? null;
}

async function classOfStage(stageId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("learning_stages")
    .select("learning_units(modules(class_id))")
    .eq("id", stageId)
    .maybeSingle();
  return data?.learning_units.modules.class_id ?? null;
}

export async function createModuleAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = moduleSchema.safeParse({
      classId: formData.get("classId"),
      title: formData.get("title"),
      description: formData.get("description") ?? undefined,
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const lecturer = await requireLecturerOfClass(parsed.data.classId);
    const supabase = await createClient();

    const { error } = await supabase.from("modules").insert({
      class_id: parsed.data.classId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      sequence: await nextSequence("modules", "class_id", parsed.data.classId),
      created_by: lecturer.id,
    });

    if (error) return fail(error);

    revalidatePath(`/app/lecturer/classes/${parsed.data.classId}/builder`);
    return { ok: true, message: "Modul berhasil ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

export async function createLearningUnitAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = learningUnitSchema.safeParse({
      moduleId: formData.get("moduleId"),
      title: formData.get("title"),
      objective: formData.get("objective"),
      unitKind: formData.get("unitKind") ?? "core",
      opensAt: formData.get("opensAt") ?? undefined,
      closesAt: formData.get("closesAt") ?? undefined,
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { data: moduleRow } = await supabase
      .from("modules")
      .select("class_id")
      .eq("id", parsed.data.moduleId)
      .maybeSingle();

    if (!moduleRow) return { error: "Modul tidak ditemukan." };

    const lecturer = await requireLecturerOfClass(moduleRow.class_id);

    // Trigger seed_learning_stages() membuat enam tahap otomatis (LOCK-PED-002).
    const { error } = await supabase.from("learning_units").insert({
      module_id: parsed.data.moduleId,
      title: parsed.data.title,
      objective: parsed.data.objective,
      unit_kind: parsed.data.unitKind,
      opens_at: parsed.data.opensAt || null,
      closes_at: parsed.data.closesAt || null,
      sequence: await nextSequence(
        "learning_units",
        "module_id",
        parsed.data.moduleId,
      ),
      created_by: lecturer.id,
    });

    if (error) return fail(error);

    revalidatePath(`/app/lecturer/classes/${moduleRow.class_id}/builder`);
    return {
      ok: true,
      message: "Unit dibuat beserta enam tahap pembelajaran.",
    };
  } catch (error) {
    return fail(error);
  }
}

export async function upsertCaseAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = caseSchema.safeParse({
      learningUnitId: formData.get("learningUnitId"),
      title: formData.get("title"),
      context: formData.get("context"),
      body: formData.get("body"),
      keyQuestion: formData.get("keyQuestion"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await classOfUnit(parsed.data.learningUnitId);
    if (!classId) return { error: "Unit tidak ditemukan." };

    const lecturer = await requireLecturerOfClass(classId);
    const supabase = await createClient();

    const { error } = await supabase.from("cases").upsert(
      {
        learning_unit_id: parsed.data.learningUnitId,
        title: parsed.data.title,
        context: parsed.data.context,
        body: parsed.data.body,
        key_question: parsed.data.keyQuestion,
        created_by: lecturer.id,
      },
      { onConflict: "learning_unit_id" },
    );

    if (error) return fail(error);

    revalidatePath(
      `/app/lecturer/classes/${classId}/builder/units/${parsed.data.learningUnitId}`,
    );
    return { ok: true, message: "Kasus berhasil disimpan." };
  } catch (error) {
    return fail(error);
  }
}

export async function updateStageAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = stageUpdateSchema.safeParse({
      stageId: formData.get("stageId"),
      title: formData.get("title"),
      focus: formData.get("focus"),
      isEnabled: formData.get("isEnabled") === "on",
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await classOfStage(parsed.data.stageId);
    if (!classId) return { error: "Tahap tidak ditemukan." };

    await requireLecturerOfClass(classId);
    const supabase = await createClient();

    // stage_key dan sequence sengaja tidak disertakan: keduanya dikunci trigger.
    const { error } = await supabase
      .from("learning_stages")
      .update({
        title: parsed.data.title,
        focus: parsed.data.focus,
        is_enabled: parsed.data.isEnabled,
      })
      .eq("id", parsed.data.stageId);

    if (error) return fail(error);

    revalidatePath(`/app/lecturer/classes/${classId}/builder`, "layout");
    return { ok: true, message: "Tahap diperbarui." };
  } catch (error) {
    return fail(error);
  }
}

export async function createActivityAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const thresholdValue = formData.get("masteryThreshold");
    const parsed = activitySchema.safeParse({
      learningStageId: formData.get("learningStageId"),
      title: formData.get("title"),
      prompt: formData.get("prompt"),
      activityType: formData.get("activityType"),
      rubricId: formData.get("rubricId") ?? "",
      allowsAi: formData.get("allowsAi") === "on",
      allowedAiFunctions: formData.getAll("allowedAiFunctions").map(String),
      dueAt: formData.get("dueAt") ?? undefined,
      ...(thresholdValue ? { masteryThreshold: thresholdValue } : {}),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await classOfStage(parsed.data.learningStageId);
    if (!classId) return { error: "Tahap tidak ditemukan." };

    const lecturer = await requireLecturerOfClass(classId);
    const supabase = await createClient();

    const { error } = await supabase.from("activities").insert({
      learning_stage_id: parsed.data.learningStageId,
      title: parsed.data.title,
      prompt: parsed.data.prompt,
      activity_type: parsed.data.activityType,
      rubric_id: parsed.data.rubricId || null,
      mastery_threshold: parsed.data.masteryThreshold ?? null,
      allows_ai: parsed.data.allowsAi,
      allowed_ai_functions: parsed.data.allowsAi
        ? (parsed.data.allowedAiFunctions as never[])
        : [],
      due_at: parsed.data.dueAt || null,
      sequence: await nextSequence(
        "activities",
        "learning_stage_id",
        parsed.data.learningStageId,
      ),
      created_by: lecturer.id,
    });

    if (error) return fail(error);

    revalidatePath(`/app/lecturer/classes/${classId}/builder`, "layout");
    return { ok: true, message: "Aktivitas berhasil ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

export async function createInstructionAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = activityInstructionSchema.safeParse({
      activityId: formData.get("activityId"),
      audience: formData.get("audience"),
      content: formData.get("content"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await requireRoleOrThrow("lecturer");
    const supabase = await createClient();

    const { data: existing } = await supabase
      .from("activity_instructions")
      .select("sequence")
      .eq("activity_id", parsed.data.activityId)
      .eq("audience", parsed.data.audience)
      .order("sequence", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("activity_instructions").insert({
      activity_id: parsed.data.activityId,
      audience: parsed.data.audience,
      content: parsed.data.content,
      sequence: (existing?.sequence ?? 0) + 1,
    });

    if (error) return fail(error);

    revalidatePath("/app/lecturer/classes", "layout");
    return { ok: true, message: "Instruksi ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Publikasi berjenjang: unit hanya boleh terbit bila kasus dan minimal satu
 * aktivitas sudah ada, agar mahasiswa tidak menerima konten setengah jadi.
 */
export async function publishUnitAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = publicationSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const classId = await classOfUnit(parsed.data.id);
    if (!classId) return { error: "Unit tidak ditemukan." };

    await requireLecturerOfClass(classId);
    const supabase = await createClient();

    if (parsed.data.status === "published") {
      const { data: unit } = await supabase
        .from("learning_units")
        .select("cases(id), learning_stages(activities(id))")
        .eq("id", parsed.data.id)
        .maybeSingle();

      if (!unit?.cases) {
        return {
          error: "Unit belum memiliki kasus. Tulis kasus sebelum menerbitkan.",
        };
      }

      const activityCount = unit.learning_stages.reduce(
        (total, stage) => total + stage.activities.length,
        0,
      );

      if (activityCount === 0) {
        return {
          error:
            "Unit belum memiliki aktivitas. Tambahkan minimal satu aktivitas sebelum menerbitkan.",
        };
      }
    }

    const { error } = await supabase
      .from("learning_units")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id);

    if (error) return fail(error);

    revalidatePath(`/app/lecturer/classes/${classId}/builder`, "layout");
    return {
      ok: true,
      message:
        parsed.data.status === "published"
          ? "Unit diterbitkan dan kini terlihat mahasiswa."
          : "Status unit diperbarui.",
    };
  } catch (error) {
    return fail(error);
  }
}

export async function publishModuleAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = publicationSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { data: moduleRow } = await supabase
      .from("modules")
      .select("class_id")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (!moduleRow) return { error: "Modul tidak ditemukan." };

    await requireLecturerOfClass(moduleRow.class_id);

    const { error } = await supabase
      .from("modules")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id);

    if (error) return fail(error);

    revalidatePath(
      `/app/lecturer/classes/${moduleRow.class_id}/builder`,
      "layout",
    );
    return { ok: true, message: "Status modul diperbarui." };
  } catch (error) {
    return fail(error);
  }
}

export async function publishActivityAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = publicationSchema.safeParse({
      id: formData.get("id"),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await requireRoleOrThrow("lecturer");
    const supabase = await createClient();

    const { error } = await supabase
      .from("activities")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.id);

    if (error) return fail(error);

    revalidatePath("/app/lecturer/classes", "layout");
    return { ok: true, message: "Status aktivitas diperbarui." };
  } catch (error) {
    return fail(error);
  }
}
