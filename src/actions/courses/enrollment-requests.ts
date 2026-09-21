/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/actions/administration/accounts";
import {
  decideEnrollmentSchema,
  ENROLLMENT_REQUEST_MESSAGE,
  joinClassSchema,
} from "@/lib/classes/enrollment-requests";
import { toActionError } from "@/lib/errors";
import {
  requireLecturerOfClass,
  requireRoleOrThrow,
} from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const resultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), requestId: z.uuid() }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);
const fallback = "Pengajuan tidak dapat diproses. Coba lagi beberapa saat.";

function failure(error: unknown): FormState {
  const mapped = toActionError(error);
  return { error: mapped.ok ? fallback : mapped.error };
}

export async function requestEnrollmentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireRoleOrThrow("student");
    const input = joinClassSchema.safeParse({
      joinCode: formData.get("joinCode"),
    });
    if (!input.success)
      return { fieldErrors: input.error.flatten().fieldErrors };
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("request_enrollment", {
      p_join_code: input.data.joinCode,
    });
    if (error) return failure(error);
    const result = resultSchema.safeParse(data);
    if (!result.success) return { error: fallback };
    if (!result.data.ok)
      return {
        error: ENROLLMENT_REQUEST_MESSAGE[result.data.reason] ?? fallback,
      };
    revalidatePath("/app/student/classes");
    revalidatePath("/app/lecturer/classes", "layout");
    return {
      ok: true,
      message: "Pengajuan terkirim. Menunggu persetujuan dosen.",
    };
  } catch (error) {
    return failure(error);
  }
}

export async function decideEnrollmentAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const input = decideEnrollmentSchema.safeParse({
      classId: formData.get("classId"),
      requestId: formData.get("requestId"),
      decision: formData.get("decision"),
      note: formData.get("note") ?? "",
    });
    if (!input.success)
      return { fieldErrors: input.error.flatten().fieldErrors };
    await requireLecturerOfClass(input.data.classId);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("decide_enrollment_request", {
      p_request_id: input.data.requestId,
      p_approve: input.data.decision === "approve",
      p_note: input.data.note || null,
    });
    if (error) {
      const message = ENROLLMENT_REQUEST_MESSAGE[error.message];
      return message ? { error: message } : failure(error);
    }
    if (!data) return { error: fallback };
    revalidatePath(`/app/lecturer/classes/${input.data.classId}/students`);
    revalidatePath("/app/student/classes", "layout");
    revalidatePath("/app/student/dashboard");
    return {
      ok: true,
      message:
        input.data.decision === "approve"
          ? "Mahasiswa disetujui dan terdaftar di kelas."
          : "Pengajuan ditolak. Alasan tersedia bagi mahasiswa.",
    };
  } catch (error) {
    return failure(error);
  }
}
