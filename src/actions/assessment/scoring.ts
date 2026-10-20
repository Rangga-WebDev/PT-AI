/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toActionError } from "@/lib/errors";
import {
  RUBRIC_SCORING_MESSAGE,
  scoreRubric,
  type RubricScore,
} from "@/lib/assessment/rubric-scoring";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  masteryAssessmentSchema,
  masteryOverrideSchema,
  type MasteryAssessmentInput,
} from "@/lib/validation/assessment";
import { recordLearningEvent } from "@/server/analytics/events";

export interface AssessmentActionResult {
  ok?: boolean;
  error?: string;
}

function fail(error: unknown): AssessmentActionResult {
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

/**
 * Penilaian mutu adalah wewenang dosen (LOCK-PED-010). Hasilnya ditulis sebagai
 * baris baru `mastery_results` berstatus final; keputusan lama tidak dihapus.
 */
export async function submitMasteryAssessmentAction(
  input: unknown,
): Promise<AssessmentActionResult> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = masteryAssessmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Penilaian tidak valid.",
      };
    }

    const result = await saveAssessment(lecturer.id, parsed.data);
    if (result.ok) {
      revalidatePath("/app/lecturer/review", "layout");
      revalidatePath("/app/student/learn", "layout");
    }
    return result;
  } catch (error) {
    return fail(error);
  }
}

export interface BulkAssessmentResult {
  saved: string[];
  failed: { attemptId: string; error: string }[];
  error?: string;
}

const bulkAssessmentSchema = z
  .array(masteryAssessmentSchema)
  .min(1, "Tidak ada penilaian yang dipilih.")
  .max(100, "Simpan paling banyak 100 penilaian sekaligus.");

/**
 * Setiap butir tetap keputusan dosen yang menekan simpan; jalur massal hanya
 * menghemat klik. Jejaknya dicatat agar penelitian dapat memisahkan keputusan
 * massal dari keputusan yang ditinjau satu per satu.
 */
export async function submitBulkAssessmentsAction(
  input: unknown,
): Promise<BulkAssessmentResult> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = bulkAssessmentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        saved: [],
        failed: [],
        error: parsed.error.issues[0]?.message ?? "Penilaian tidak valid.",
      };
    }

    const saved: string[] = [];
    const failed: BulkAssessmentResult["failed"] = [];

    for (const item of parsed.data) {
      const result = await saveAssessment(lecturer.id, item);
      if (result.ok) saved.push(item.attemptId);
      else
        failed.push({
          attemptId: item.attemptId,
          error: result.error ?? "Penilaian gagal disimpan.",
        });
    }

    if (saved.length > 0) {
      const { error: auditError } = await createAdminClient()
        .from("audit_logs")
        .insert({
          actor_id: lecturer.id,
          actor_role: "lecturer",
          action: "assessment_bulk_saved",
          subject_table: "attempts",
          after: {
            at: new Date().toISOString(),
            attemptIds: saved,
            count: saved.length,
          },
        });
      if (auditError) {
        console.error("[assessment] bulk audit", {
          sqlstate: auditError.code ?? null,
        });
      }

      revalidatePath("/app/lecturer/review", "layout");
      revalidatePath("/app/student/learn", "layout");
    }

    return { saved, failed };
  } catch (error) {
    const result = fail(error);
    return {
      saved: [],
      failed: [],
      error: result.error ?? "Penilaian gagal disimpan.",
    };
  }
}

async function saveAssessment(
  lecturerId: string,
  data: MasteryAssessmentInput,
): Promise<AssessmentActionResult> {
  const supabase = await createClient();

  const { data: attempt } = await supabase
    .from("attempts")
    .select(
      `activity_id, student_id,
       activities!inner(
         rubric_id,
         rubrics(rubric_criteria(id, weight, dimension, rubric_levels(score))),
         learning_stages!inner(learning_units!inner(modules!inner(class_id)))
       )`,
    )
    .eq("id", data.attemptId)
    .maybeSingle();

  if (!attempt) return { error: "Respons awal tidak ditemukan." };

  const criteria = (attempt.activities.rubrics?.rubric_criteria ?? []).map(
    (item) => ({
      id: item.id,
      dimension: item.dimension,
      weight: item.weight,
      levels: item.rubric_levels.map((level) => ({
        score: Number(level.score),
      })),
    }),
  );

  // Level mentah pilihan dosen; nilai akhir dihitung, tidak pernah dikirim
  // klien.
  const selections = Object.fromEntries(
    data.criteriaScores.map((entry) => [entry.criterionId, entry.score]),
  );

  let score: number | null = null;
  let dimensions: RubricScore["dimensions"] = [];

  if (criteria.length > 0) {
    const computed = scoreRubric(criteria, selections);
    if (!computed.ok) {
      return { error: RUBRIC_SCORING_MESSAGE[computed.reason] };
    }
    score = computed.data.score;
    dimensions = computed.data.dimensions;
  }

  const criteriaScores = Object.fromEntries(
    criteria.map((criterion) => [
      criterion.id,
      selections[criterion.id] as number,
    ]),
  );

  const { error: masteryError } = await supabase
    .from("mastery_results")
    .insert({
      activity_id: attempt.activity_id,
      student_id: attempt.student_id,
      evaluator_kind: "lecturer",
      evaluator_id: lecturerId,
      outcome: data.outcome,
      score,
      rubric_id: attempt.activities.rubric_id,
      criteria_scores: criteriaScores,
      is_final: true,
    });

  if (masteryError) return fail(masteryError);

  // Skor per kriteria mengalir ke profil enam dimensi, selalu terikat waktu.
  // Yang disimpan adalah persentase, bukan level mentah, agar sebanding
  // dengan pengukuran lain pada skala yang sama.
  const classId =
    attempt.activities.learning_stages.learning_units.modules.class_id;

  const dimensionRows = dimensions.map((entry) => ({
    student_id: attempt.student_id,
    class_id: classId,
    dimension: entry.dimension,
    score: entry.score,
    measurement_source: "rubric" as const,
  }));

  if (dimensionRows.length > 0) {
    await supabase.from("critical_thinking_scores").insert(dimensionRows);
  }

  await supabase.from("feedback_records").insert({
    attempt_id: data.attemptId,
    source: "lecturer",
    author_id: lecturerId,
    content: data.comment,
  });

  await recordLearningEvent({
    studentId: attempt.student_id,
    activityId: attempt.activity_id,
    eventType: "mastery_decided",
    payload: { outcome: data.outcome, evaluator: "lecturer" },
  });

  return { ok: true };
}

/** Perubahan hasil ketuntasan wajib meninggalkan jejak lengkap (§13 no. 11). */
export async function overrideMasteryAction(
  input: unknown,
): Promise<AssessmentActionResult> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = masteryOverrideSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Override tidak valid.",
      };
    }

    const supabase = await createClient();

    const { data: previous } = await supabase
      .from("mastery_results")
      .select("id, activity_id, student_id, outcome, score, rubric_id")
      .eq("id", parsed.data.masteryResultId)
      .maybeSingle();

    if (!previous) return { error: "Hasil ketuntasan tidak ditemukan." };

    const { error: overrideError } = await supabase
      .from("lecturer_overrides")
      .insert({
        lecturer_id: lecturer.id,
        subject_kind: "mastery_result",
        subject_id: previous.id,
        previous_value: { outcome: previous.outcome, score: previous.score },
        new_value: { outcome: parsed.data.outcome },
        reason: parsed.data.reason,
      });

    if (overrideError) return fail(overrideError);

    // mastery_results append-only: override menghasilkan baris baru.
    const { error: masteryError } = await supabase
      .from("mastery_results")
      .insert({
        activity_id: previous.activity_id,
        student_id: previous.student_id,
        evaluator_kind: "lecturer",
        evaluator_id: lecturer.id,
        outcome: parsed.data.outcome,
        rubric_id: previous.rubric_id,
        is_final: true,
      });

    if (masteryError) return fail(masteryError);

    revalidatePath("/app/lecturer/review", "layout");
    revalidatePath("/app/student/learn", "layout");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
