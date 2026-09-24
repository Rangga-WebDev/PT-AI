/** @format */

"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/actions/administration/accounts";
import {
  hasTraceableUnitExcerpts,
  unitPlanMetadataSchema,
  unitPlanSchema,
  UNIT_PLAN_ERROR,
  UNIT_PLAN_KIND,
} from "@/lib/ai/unit-plan";
import { toActionError } from "@/lib/errors";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  generateSixUnitDraft,
  QUICK_SETUP_MESSAGE,
} from "@/server/ai/quick-setup";
import {
  consumeRateLimit,
  RATE_LIMIT_MESSAGE,
} from "@/server/services/rate-limit";

const generateSchema = z.object({
  classId: z.uuid("Kelas tidak valid."),
  moduleId: z.uuid("Pilih pertemuan tujuan."),
  resourceId: z.uuid("Pilih materi sumber."),
  instruction: z
    .string()
    .trim()
    .max(1000, "Permintaan maksimal 1000 karakter."),
});
const identitySchema = z.object({
  classId: z.uuid(),
  draftId: z.uuid(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
});
const applyResultSchema = z.object({
  unitIds: z.array(z.uuid()).length(6),
  alreadyApplied: z.boolean(),
});

function fail(error: unknown): { error: string } {
  const mapped = toActionError(error);
  return {
    error: mapped.ok
      ? "Draf gagal diproses. Coba lagi beberapa saat."
      : mapped.error,
  };
}

function refresh(classId: string, draftId?: string) {
  revalidatePath(`/app/lecturer/classes/${classId}/builder`);
  revalidatePath(`/app/lecturer/classes/${classId}/meetings`);
  if (draftId)
    revalidatePath(
      `/app/lecturer/classes/${classId}/builder/drafts/${draftId}`,
    );
}

export async function generateUnitPlanAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const input = generateSchema.safeParse({
      classId: formData.get("classId"),
      moduleId: formData.get("moduleId"),
      resourceId: formData.get("resourceId"),
      instruction: formData.get("instruction") ?? "",
    });
    if (!input.success)
      return { fieldErrors: input.error.flatten().fieldErrors };
    const lecturer = await requireLecturerOfClass(input.data.classId);
    if (!(await consumeRateLimit("quick_setup")))
      return { error: RATE_LIMIT_MESSAGE.quick_setup };
    const result = await generateSixUnitDraft(input.data);
    if (!result.ok) return { error: QUICK_SETUP_MESSAGE[result.reason] };
    const { provenance } = result;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_material_drafts")
      .insert({
        class_id: input.data.classId,
        requested_by: lecturer.id,
        source_resource_id: provenance.resourceId,
        grounding: "source_bound",
        instruction: {
          kind: UNIT_PLAN_KIND,
          moduleId: provenance.moduleId,
          moduleTitle: provenance.moduleTitle,
          resourceTitle: provenance.resourceTitle,
          checksum: provenance.checksum,
          extractedAt: provenance.extractedAt,
          instruction: provenance.instruction,
          sourceTextHash: provenance.sourceTextHash,
          truncated: provenance.truncated,
        },
        output: JSON.stringify(result.draft),
        model: provenance.model,
        prompt_version: provenance.promptVersion,
      })
      .select("id")
      .single();
    if (error) return fail(error);
    if (!data)
      return { error: "Draf gagal disimpan. Belum ada unit yang dibuat." };
    refresh(input.data.classId);
    return {
      ok: true,
      message: "Enam unit tersusun sebagai draf untuk ditinjau.",
      redirectTo: `/app/lecturer/classes/${input.data.classId}/builder/drafts/${data.id}`,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function saveUnitPlanAction(
  input: unknown,
): Promise<{ ok: true; updatedAt: string } | { error: string }> {
  try {
    const parsed = identitySchema
      .extend({ plan: unitPlanSchema })
      .safeParse(input);
    if (!parsed.success)
      return {
        error:
          "Isi draf tidak valid. Pastikan keenam unit dan aktivitas terisi lengkap.",
      };
    await requireLecturerOfClass(parsed.data.classId);
    const supabase = await createClient();
    const draft = await supabase
      .from("ai_material_drafts")
      .select("source_resource_id, instruction")
      .eq("id", parsed.data.draftId)
      .eq("class_id", parsed.data.classId)
      .eq("status", "draft")
      .eq("instruction->>kind", UNIT_PLAN_KIND)
      .maybeSingle();
    if (draft.error) return fail(draft.error);
    const meta = unitPlanMetadataSchema.safeParse(draft.data?.instruction);
    if (!draft.data?.source_resource_id || !meta.success)
      return { error: UNIT_PLAN_ERROR.not_reviewable! };
    const source = await supabase
      .from("learning_resources")
      .select("extracted_text")
      .eq("id", draft.data.source_resource_id)
      .eq("class_id", parsed.data.classId)
      .eq("extraction_status", "succeeded")
      .is("deleted_at", null)
      .maybeSingle();
    if (source.error) return fail(source.error);
    const sourceText = source.data?.extracted_text;
    if (
      !sourceText ||
      createHash("sha256").update(sourceText).digest("hex") !==
        meta.data.sourceTextHash
    ) {
      return { error: UNIT_PLAN_ERROR.source_changed! };
    }
    if (!hasTraceableUnitExcerpts(parsed.data.plan, sourceText))
      return { error: UNIT_PLAN_ERROR.untraceable_output! };
    const saved = await supabase
      .from("ai_material_drafts")
      .update({ output: JSON.stringify(parsed.data.plan) })
      .eq("id", parsed.data.draftId)
      .eq("class_id", parsed.data.classId)
      .eq("status", "draft")
      .eq("updated_at", parsed.data.expectedUpdatedAt)
      .select("updated_at")
      .maybeSingle();
    if (saved.error) return fail(saved.error);
    if (!saved.data) return { error: UNIT_PLAN_ERROR.stale_draft! };
    refresh(parsed.data.classId, parsed.data.draftId);
    return { ok: true, updatedAt: saved.data.updated_at };
  } catch (error) {
    return fail(error);
  }
}

export async function applyUnitPlanAction(
  input: unknown,
): Promise<
  { ok: true; unitIds: string[]; alreadyApplied: boolean } | { error: string }
> {
  try {
    const parsed = identitySchema.safeParse(input);
    if (!parsed.success) return { error: "Identitas draf tidak valid." };
    await requireLecturerOfClass(parsed.data.classId);
    const supabase = await createClient();
    const draft = await supabase
      .from("ai_material_drafts")
      .select("id")
      .eq("id", parsed.data.draftId)
      .eq("class_id", parsed.data.classId)
      .eq("instruction->>kind", UNIT_PLAN_KIND)
      .maybeSingle();
    if (draft.error) return fail(draft.error);
    if (!draft.data) return { error: "Draf tidak ditemukan pada kelas ini." };
    const result = await supabase.rpc("apply_ai_unit_plan", {
      p_draft_id: parsed.data.draftId,
      p_expected_updated_at: parsed.data.expectedUpdatedAt,
    });
    if (result.error) {
      const message = UNIT_PLAN_ERROR[result.error.message];
      return message ? { error: message } : fail(result.error);
    }
    const applied = applyResultSchema.safeParse(result.data);
    if (!applied.success)
      return {
        error:
          "Hasil penerapan belum dapat dikonfirmasi. Muat ulang halaman sebelum mencoba lagi.",
      };
    refresh(parsed.data.classId, parsed.data.draftId);
    return { ok: true, ...applied.data };
  } catch (error) {
    return fail(error);
  }
}
