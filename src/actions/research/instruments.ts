/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toActionError } from "@/lib/errors";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export interface InstrumentActionResult {
  ok?: boolean;
  error?: string;
}

const instrumentSchema = z.object({
  classId: z.string().uuid("Kelas tidak valid."),
  title: z
    .string()
    .trim()
    .min(3, "Judul instrumen minimal 3 karakter.")
    .max(200, "Judul instrumen terlalu panjang."),
  assessmentType: z.enum(["pretest", "posttest"], {
    message: "Jenis instrumen harus pretest atau posttest.",
  }),
  maxScore: z.coerce.number().min(1).max(100),
});

const measurementSchema = z.object({
  assessmentId: z.string().uuid("Instrumen tidak valid."),
  studentId: z.string().uuid("Mahasiswa tidak valid."),
  dimension: z.enum(
    [
      "interpretation",
      "analysis",
      "evaluation",
      "inference",
      "explanation",
      "self_regulation",
    ],
    { message: "Dimensi tidak valid." },
  ),
  score: z.coerce.number().min(0).max(100),
});

function fail(error: unknown): InstrumentActionResult {
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

export async function createInstrumentAction(
  input: unknown,
): Promise<InstrumentActionResult> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = instrumentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Instrumen tidak valid.",
      };
    }

    const supabase = await createClient();

    const { error } = await supabase.from("assessments").insert({
      class_id: parsed.data.classId,
      title: parsed.data.title,
      assessment_type: parsed.data.assessmentType,
      max_score: parsed.data.maxScore,
      created_by: lecturer.id,
    });

    if (error) return fail(error);

    revalidatePath(`/app/lecturer/classes/${parsed.data.classId}/instruments`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

/**
 * Skor pretest dan posttest masuk ke `critical_thinking_scores` dengan
 * `measurement_source` yang sesuai, bukan bercampur dengan penilaian rubrik.
 * Tanpa pembedaan itu, perbandingan sebelum dan sesudah perlakuan menjadi
 * tidak sah untuk penelitian.
 */
export async function recordMeasurementAction(
  input: unknown,
): Promise<InstrumentActionResult> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = measurementSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Pengukuran tidak valid.",
      };
    }

    const supabase = await createClient();

    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, class_id, assessment_type, max_score")
      .eq("id", parsed.data.assessmentId)
      .maybeSingle();

    if (!assessment) return { error: "Instrumen tidak ditemukan." };

    if (
      assessment.assessment_type !== "pretest" &&
      assessment.assessment_type !== "posttest"
    ) {
      return { error: "Instrumen ini bukan pretest maupun posttest." };
    }

    const { error: scoreError } = await supabase
      .from("assessment_scores")
      .upsert(
        {
          assessment_id: assessment.id,
          student_id: parsed.data.studentId,
          scored_by: lecturer.id,
          score: parsed.data.score,
          is_final: true,
        },
        { onConflict: "assessment_id,student_id" },
      );

    if (scoreError) return fail(scoreError);

    const { error } = await supabase.from("critical_thinking_scores").insert({
      student_id: parsed.data.studentId,
      class_id: assessment.class_id,
      dimension: parsed.data.dimension,
      score: parsed.data.score,
      measurement_source: assessment.assessment_type,
      assessment_id: assessment.id,
    });

    if (error) return fail(error);

    revalidatePath(`/app/lecturer/classes/${assessment.class_id}/instruments`);
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
