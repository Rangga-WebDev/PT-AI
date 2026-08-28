/** @format */

import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type LearningEventType =
  | "attempt_submitted"
  | "revision_submitted"
  | "reflection_submitted"
  | "source_verified"
  | "ai_feedback_requested"
  | "mastery_decided";

interface LearningEventInput {
  studentId: string;
  activityId: string;
  eventType: LearningEventType;
  payload?: Record<string, string | number | boolean>;
}

/**
 * `learning_events` sengaja tidak punya policy INSERT: peristiwa tidak boleh
 * dipalsukan dari sesi pengguna, sehingga penulisannya lewat service role.
 *
 * Kegagalan pencatatan tidak pernah membatalkan pekerjaan mahasiswa —
 * telemetri tidak boleh menghapus karya orang. Galatnya dicatat ke log server
 * agar tetap terlihat, bukan ditelan diam-diam.
 */
export async function recordLearningEvent(
  input: LearningEventInput,
): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: activity } = await supabase
      .from("activities")
      .select(
        "learning_stages!inner(learning_units!inner(modules!inner(class_id)))",
      )
      .eq("id", input.activityId)
      .maybeSingle();

    const classId =
      activity?.learning_stages.learning_units.modules.class_id ?? null;

    if (!classId) {
      console.error("[learning_events] kelas aktivitas tidak ditemukan", {
        activityId: input.activityId,
        eventType: input.eventType,
      });
      return;
    }

    const { error } = await supabase.from("learning_events").insert({
      student_id: input.studentId,
      class_id: classId,
      activity_id: input.activityId,
      event_type: input.eventType,
      payload: input.payload ?? {},
    });

    if (error) {
      console.error("[learning_events] gagal mencatat peristiwa", {
        eventType: input.eventType,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("[learning_events] gagal mencatat peristiwa", {
      eventType: input.eventType,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
