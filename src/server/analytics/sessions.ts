/** @format */

import "server-only";

import {
  isSessionStale,
  nextActiveSeconds,
  shouldRollover,
} from "@/lib/analytics/session";
import { redactDatabaseDetail, redactUnexpected } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `learning_sessions` sengaja tanpa policy INSERT/UPDATE: durasi tidak boleh
 * berasal dari klien. Penambahan selalu dihitung dari jam server.
 *
 * Kegagalan pencatatan tidak pernah membatalkan pekerjaan mahasiswa.
 */
export async function heartbeatSession(input: {
  studentId: string;
  activityId: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    const { data: open } = await supabase
      .from("learning_sessions")
      .select(
        "id, started_at, last_heartbeat_at, estimated_active_seconds, heartbeat_count",
      )
      .eq("student_id", input.studentId)
      .eq("activity_id", input.activityId)
      .is("ended_at", null)
      .maybeSingle();

    if (!open) {
      await supabase.from("learning_sessions").insert({
        student_id: input.studentId,
        activity_id: input.activityId,
        started_at: now,
        last_heartbeat_at: now,
      });
      return;
    }

    // Sesi yang sudah lewat batas ditutup dahulu, lalu diganti sesi baru.
    if (
      isSessionStale(open.last_heartbeat_at, now) ||
      shouldRollover(open.started_at, now)
    ) {
      await closeSessionRow(
        open.id,
        shouldRollover(open.started_at, now) ? "rollover" : "idle_timeout",
        open.last_heartbeat_at,
      );

      await supabase.from("learning_sessions").insert({
        student_id: input.studentId,
        activity_id: input.activityId,
        started_at: now,
        last_heartbeat_at: now,
      });
      return;
    }

    const { error } = await supabase
      .from("learning_sessions")
      .update({
        last_heartbeat_at: now,
        estimated_active_seconds: nextActiveSeconds(
          open.estimated_active_seconds,
          open.last_heartbeat_at,
          now,
        ),
        heartbeat_count: open.heartbeat_count + 1,
      })
      .eq("id", open.id);

    if (error) {
      console.error(
        "[learning_sessions] heartbeat gagal",
        redactDatabaseDetail(error.message),
      );
    }
  } catch (error) {
    console.error(
      "[learning_sessions] heartbeat gagal",
      redactUnexpected(error),
    );
  }
}

export async function endSession(input: {
  studentId: string;
  activityId: string;
}): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { data: open } = await supabase
      .from("learning_sessions")
      .select("id, last_heartbeat_at")
      .eq("student_id", input.studentId)
      .eq("activity_id", input.activityId)
      .is("ended_at", null)
      .maybeSingle();

    if (!open) return;

    await closeSessionRow(open.id, "explicit", open.last_heartbeat_at);
  } catch (error) {
    console.error(
      "[learning_sessions] penutupan gagal",
      redactUnexpected(error),
    );
  }
}

async function closeSessionRow(
  sessionId: string,
  reason: "explicit" | "idle_timeout" | "rollover",
  endedAt: string,
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("learning_sessions")
    .update({ ended_at: endedAt, end_reason: reason })
    .eq("id", sessionId);

  if (error) {
    console.error(
      "[learning_sessions] penutupan gagal",
      redactDatabaseDetail(error.message),
    );
  }
}
