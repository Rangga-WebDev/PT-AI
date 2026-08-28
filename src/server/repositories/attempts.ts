/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface AttemptView {
  id: string;
  attemptNumber: number;
  isBaseline: boolean;
  content: string;
  submittedAt: string;
}

export interface ActivityWorkState {
  draft: string;
  draftUpdatedAt: string | null;
  baseline: AttemptView | null;
}

/** Draft dan baseline dibaca sekaligus karena UI selalu membutuhkan keduanya. */
export async function getActivityWorkState(
  activityId: string,
  studentId: string,
): Promise<ActivityWorkState> {
  const supabase = await createClient();

  const [draftResult, baselineResult] = await Promise.all([
    supabase
      .from("attempt_drafts")
      .select("content, updated_at")
      .eq("activity_id", activityId)
      .eq("student_id", studentId)
      .maybeSingle(),
    supabase
      .from("attempts")
      .select("id, attempt_number, is_baseline, content, submitted_at")
      .eq("activity_id", activityId)
      .eq("student_id", studentId)
      .eq("is_baseline", true)
      .maybeSingle(),
  ]);

  return {
    draft: draftResult.data?.content ?? "",
    draftUpdatedAt: draftResult.data?.updated_at ?? null,
    baseline: baselineResult.data
      ? {
          id: baselineResult.data.id,
          attemptNumber: baselineResult.data.attempt_number,
          isBaseline: baselineResult.data.is_baseline,
          content: baselineResult.data.content,
          submittedAt: baselineResult.data.submitted_at,
        }
      : null,
  };
}

export interface StudentProgressRow {
  activityId: string;
  activityTitle: string;
  stageTitle: string;
  stageSequence: number;
  unitTitle: string;
  hasBaseline: boolean;
  submittedAt: string | null;
}

export async function listStudentProgress(
  studentId: string,
): Promise<StudentProgressRow[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("attempts")
      .select(
        `id, submitted_at,
         activities!inner(
           id, title,
           learning_stages!inner(
             title, sequence,
             learning_units!inner(title)
           )
         )`,
      )
      .eq("student_id", studentId)
      .eq("is_baseline", true)
      .order("submitted_at", { ascending: false }),
    "listStudentProgress",
  );

  return rows.map((row) => ({
    activityId: row.activities.id,
    activityTitle: row.activities.title,
    stageTitle: row.activities.learning_stages.title,
    stageSequence: row.activities.learning_stages.sequence,
    unitTitle: row.activities.learning_stages.learning_units.title,
    hasBaseline: true,
    submittedAt: row.submitted_at,
  }));
}

export interface ReviewQueueRow {
  attemptId: string;
  studentName: string;
  studentIdentifier: string;
  activityTitle: string;
  stageTitle: string;
  unitTitle: string;
  className: string;
  submittedAt: string;
  content: string;
}

/**
 * Antrean tinjauan dosen. RLS `attempts_select` sudah membatasi hasil ke kelas
 * yang diampu, sehingga tidak ada penyaringan kelas tambahan di sini.
 */
export async function listReviewQueue(): Promise<ReviewQueueRow[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("attempts")
      .select(
        `id, content, submitted_at,
         profiles!student_id(full_name, identifier),
         activities!inner(
           title,
           learning_stages!inner(
             title,
             learning_units!inner(
               title,
               modules!inner(classes!inner(name))
             )
           )
         )`,
      )
      .eq("is_baseline", true)
      .order("submitted_at", { ascending: false })
      .limit(50),
    "listReviewQueue",
  );

  return rows.map((row) => ({
    attemptId: row.id,
    studentName: row.profiles.full_name,
    studentIdentifier: row.profiles.identifier,
    activityTitle: row.activities.title,
    stageTitle: row.activities.learning_stages.title,
    unitTitle: row.activities.learning_stages.learning_units.title,
    className:
      row.activities.learning_stages.learning_units.modules.classes.name,
    submittedAt: row.submitted_at,
    content: row.content,
  }));
}
