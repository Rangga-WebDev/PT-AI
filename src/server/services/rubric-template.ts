/** @format */

import "server-only";

import {
  PTAI_CT_CRITERIA,
  PTAI_CT_RUBRIC_DESCRIPTION,
  PTAI_CT_RUBRIC_TITLE,
  PTAI_CT_RUBRIC_VERSION,
} from "@/lib/assessment/ptai-critical-thinking-rubric";
import { createClient } from "@/lib/supabase/server";

export type RubricTemplateFailure =
  | "rubric_failed"
  | "criteria_failed"
  | "levels_failed";

export type RubricTemplateResult =
  | { ok: true; rubricId: string }
  | { ok: false; reason: RubricTemplateFailure; message: string };

/**
 * Membuat satu instance rubrik standar: 6 kriteria dan 30 level. Bila tahap
 * mana pun gagal, rubrik induk dihapus supaya tidak tertinggal rubrik separuh
 * jadi yang lolos ke daftar pilihan dosen.
 */
export async function createStandardRubric(input: {
  organizationId: string;
  createdBy: string;
  title?: string;
}): Promise<RubricTemplateResult> {
  const supabase = await createClient();

  const { data: rubric, error: rubricError } = await supabase
    .from("rubrics")
    .insert({
      organization_id: input.organizationId,
      title: input.title?.trim() || PTAI_CT_RUBRIC_TITLE,
      description: `${PTAI_CT_RUBRIC_DESCRIPTION} (versi ${PTAI_CT_RUBRIC_VERSION})`,
      status: "published",
      created_by: input.createdBy,
    })
    .select("id")
    .single();

  if (rubricError || !rubric) {
    return {
      ok: false,
      reason: "rubric_failed",
      message: "Rubrik standar gagal dibuat.",
    };
  }

  const discard = async (
    reason: RubricTemplateFailure,
    message: string,
  ): Promise<RubricTemplateResult> => {
    await supabase.from("rubrics").delete().eq("id", rubric.id);
    return { ok: false, reason, message };
  };

  const { data: criteria, error: criteriaError } = await supabase
    .from("rubric_criteria")
    .insert(
      PTAI_CT_CRITERIA.map((criterion, index) => ({
        rubric_id: rubric.id,
        code: criterion.code,
        description: criterion.focus,
        dimension: criterion.dimension,
        weight: criterion.weight,
        sequence: index + 1,
      })),
    )
    .select("id, code");

  if (criteriaError || criteria?.length !== PTAI_CT_CRITERIA.length) {
    return discard("criteria_failed", "Kriteria rubrik standar gagal dibuat.");
  }

  const idByCode = new Map(criteria.map((row) => [row.code, row.id]));

  const levels = PTAI_CT_CRITERIA.flatMap((criterion) =>
    criterion.levels.map((level, index) => ({
      rubric_criterion_id: idByCode.get(criterion.code) ?? "",
      level_order: index + 1,
      label: level.label,
      descriptor: level.descriptor,
      score: level.score,
    })),
  );

  const { error: levelError } = await supabase
    .from("rubric_levels")
    .insert(levels);

  if (levelError) {
    return discard("levels_failed", "Level rubrik standar gagal dibuat.");
  }

  return { ok: true, rubricId: rubric.id };
}
