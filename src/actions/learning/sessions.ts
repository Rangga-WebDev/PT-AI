/** @format */

"use server";

import { z } from "zod";

import { requireStudentAccess } from "@/lib/supabase/auth";
import { endSession, heartbeatSession } from "@/server/analytics/sessions";

const schema = z.object({
  activityId: z.string().uuid(),
});

/**
 * Klien hanya melapor "masih aktif". Durasi dihitung dari jam server, sehingga
 * angka yang tersimpan tidak dapat dikarang dari peramban.
 */
export async function heartbeatActivitySession(input: unknown): Promise<void> {
  const student = await requireStudentAccess();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return;

  await heartbeatSession({
    studentId: student.id,
    activityId: parsed.data.activityId,
  });
}

export async function endActivitySession(input: unknown): Promise<void> {
  const student = await requireStudentAccess();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return;

  await endSession({
    studentId: student.id,
    activityId: parsed.data.activityId,
  });
}
