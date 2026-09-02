/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { toActionError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  requireLecturerOfClass,
  requireRoleOrThrow,
} from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  classPublishSchema,
  enrollmentSchema,
  lecturerClassSchema,
} from "@/lib/validation/academics";
import {
  CLASS_LIFECYCLE_MESSAGE,
  createClassForLecturer,
  enrollStudent,
  searchEnrollableStudents,
  type EnrollableStudent,
} from "@/server/services/class-lifecycle";

import type { FormState } from "@/actions/administration/accounts";

function fail(error: unknown): FormState {
  const mapped = toActionError(error);
  return mapped.ok ? {} : { error: mapped.error };
}

/**
 * Pengampu dan organisasi ditetapkan fungsi basis data dari sesi, bukan dari
 * formulir: dosen hanya dapat membuat kelas untuk dirinya sendiri.
 */
export async function createLecturerClassAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireRoleOrThrow("lecturer");

    const capacityValue = formData.get("capacity");
    const parsed = lecturerClassSchema.safeParse({
      courseId: formData.get("courseId"),
      academicPeriodId: formData.get("academicPeriodId"),
      code: formData.get("code"),
      ...(capacityValue ? { capacity: capacityValue } : {}),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const result = await createClassForLecturer({
      courseId: parsed.data.courseId,
      academicPeriodId: parsed.data.academicPeriodId,
      code: parsed.data.code,
      capacity: parsed.data.capacity,
    });

    if (!result.ok) {
      return { error: CLASS_LIFECYCLE_MESSAGE[result.reason] };
    }

    revalidatePath("/app/lecturer/classes");
    return {
      ok: true,
      message: "Kelas dibuat sebagai draf. Anda tercatat sebagai pengampunya.",
      redirectTo: `/app/lecturer/classes/${result.data.classId}`,
    };
  } catch (error) {
    return fail(error);
  }
}

/** Hanya draf ⇄ terbit; pengarsipan belum punya semantik yang jelas. */
export async function publishLecturerClassAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = classPublishSchema.safeParse({
      classId: formData.get("classId"),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const lecturer = await requireLecturerOfClass(parsed.data.classId);
    const supabase = await createClient();

    const { data: current } = await supabase
      .from("classes")
      .select("status")
      .eq("id", parsed.data.classId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!current) return { error: "Kelas tidak ditemukan." };

    const allowed =
      (current.status === "draft" && parsed.data.status === "published") ||
      (current.status === "published" && parsed.data.status === "draft");

    if (!allowed) {
      return {
        error: "Perubahan status tersebut tidak diizinkan untuk kelas ini.",
      };
    }

    const { error } = await supabase
      .from("classes")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.classId);

    if (error) return fail(error);

    await createAdminClient()
      .from("audit_logs")
      .insert({
        actor_id: lecturer.id,
        actor_role: "lecturer",
        action: "class_published",
        subject_table: "classes",
        subject_id: parsed.data.classId,
        before: { status: current.status },
        after: { status: parsed.data.status },
      });

    revalidatePath("/app/lecturer/classes", "layout");
    return {
      ok: true,
      message:
        parsed.data.status === "published"
          ? "Kelas diterbitkan. Mahasiswa yang terdaftar sudah dapat mengaksesnya."
          : "Kelas dikembalikan ke draf dan tidak lagi terlihat mahasiswa.",
    };
  } catch (error) {
    return fail(error);
  }
}

export async function enrollStudentByLecturerAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const parsed = enrollmentSchema.safeParse({
      classId: formData.get("classId"),
      studentId: formData.get("studentId"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    await requireLecturerOfClass(parsed.data.classId);

    const result = await enrollStudent(
      parsed.data.classId,
      parsed.data.studentId,
    );

    if (!result.ok) {
      return { error: CLASS_LIFECYCLE_MESSAGE[result.reason] };
    }

    revalidatePath(`/app/lecturer/classes/${parsed.data.classId}/students`);
    return { ok: true, message: "Mahasiswa berhasil didaftarkan." };
  } catch (error) {
    return fail(error);
  }
}

export type StudentSearchState =
  | { ok: true; students: EnrollableStudent[] }
  | { ok: false; error: string };

/** Pencarian berjalan di server; peramban tidak pernah menerima daftar penuh. */
export async function searchStudentsAction(
  classId: string,
  query: string,
): Promise<StudentSearchState> {
  try {
    await requireLecturerOfClass(classId);
    return {
      ok: true,
      students: await searchEnrollableStudents(classId, query),
    };
  } catch (error) {
    const mapped = toActionError(error);
    return {
      ok: false,
      error: mapped.ok ? "Pencarian gagal dijalankan." : mapped.error,
    };
  }
}
