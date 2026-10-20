/** @format */

"use server";

import { z } from "zod";

import type { PasswordResetResult } from "@/lib/auth/password-reset";
import { toActionError } from "@/lib/errors";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { resetStudentPasswordAsLecturer } from "@/server/services/password-reset";
import {
  consumeRateLimit,
  RATE_LIMIT_MESSAGE,
} from "@/server/services/rate-limit";

const inputSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
});

/** Dosen hanya dapat mengatur ulang kata sandi mahasiswa aktif di kelasnya. */
export async function resetStudentPasswordAction(
  classId: unknown,
  studentId: unknown,
): Promise<PasswordResetResult> {
  try {
    const parsed = inputSchema.safeParse({ classId, studentId });
    if (!parsed.success) return { error: "Data mahasiswa tidak valid." };

    const lecturer = await requireLecturerOfClass(parsed.data.classId);

    if (!(await consumeRateLimit("password_reset"))) {
      return { error: RATE_LIMIT_MESSAGE.password_reset };
    }

    const temporaryPassword = await resetStudentPasswordAsLecturer({
      actorId: lecturer.id,
      classId: parsed.data.classId,
      studentId: parsed.data.studentId,
    });
    return { temporaryPassword };
  } catch (error) {
    const result = toActionError(error);
    return {
      error: result.ok ? "Kata sandi gagal diatur ulang." : result.error,
    };
  }
}
