/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ClassLifecycleFailure =
  | "forbidden"
  | "invalid_code"
  | "course_not_found"
  | "period_not_found"
  | "student_not_found"
  | "already_enrolled"
  | "duplicate"
  | "failed";

export const CLASS_LIFECYCLE_MESSAGE: Record<ClassLifecycleFailure, string> = {
  forbidden: "Anda tidak berwenang melakukan tindakan ini.",
  invalid_code: "Kode kelas tidak boleh kosong.",
  course_not_found: "Mata kuliah tersebut tidak tersedia untuk Anda.",
  period_not_found: "Periode akademik tersebut tidak tersedia untuk Anda.",
  student_not_found: "Mahasiswa tersebut tidak ditemukan di organisasi Anda.",
  already_enrolled: "Mahasiswa sudah terdaftar di kelas ini.",
  duplicate: "Kelas dengan mata kuliah dan identitas tersebut sudah tersedia.",
  failed: "Tindakan gagal diproses. Coba lagi beberapa saat.",
};

/**
 * Fungsi basis data mengangkat sebabnya sebagai pesan pengecualian; di sini
 * pesan itu dipetakan ke sebab yang dikenal, bukan diteruskan mentah-mentah
 * ke dosen.
 */
function toFailure(error: {
  message?: string;
  code?: string;
}): ClassLifecycleFailure {
  const message = error.message ?? "";

  if (message.includes("forbidden")) return "forbidden";
  if (message.includes("invalid_code")) return "invalid_code";
  if (message.includes("course_not_found")) return "course_not_found";
  if (message.includes("period_not_found")) return "period_not_found";
  if (message.includes("student_not_found")) return "student_not_found";
  if (message.includes("already_enrolled")) return "already_enrolled";
  if (error.code === "23505") return "duplicate";

  return "failed";
}

export type LifecycleResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ClassLifecycleFailure };

export async function createClassForLecturer(input: {
  courseId: string;
  academicPeriodId: string;
  code: string;
  capacity?: number | undefined;
}): Promise<LifecycleResult<{ classId: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_lecturer_class", {
    p_course_id: input.courseId,
    p_academic_period_id: input.academicPeriodId,
    p_code: input.code,
    p_capacity: input.capacity ?? null,
  });

  if (error || !data) return { ok: false, reason: toFailure(error ?? {}) };
  return { ok: true, data: { classId: data } };
}

export interface EnrollableStudent {
  id: string;
  fullName: string;
  identifier: string;
}

export async function searchEnrollableStudents(
  classId: string,
  query: string,
): Promise<EnrollableStudent[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("search_enrollable_students", {
    p_class_id: classId,
    p_query: query,
    p_limit: 10,
  });

  if (error) return [];

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    identifier: row.identifier,
  }));
}

export async function enrollStudent(
  classId: string,
  studentId: string,
): Promise<LifecycleResult<{ enrollmentId: string }>> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("enroll_student_in_class", {
    p_class_id: classId,
    p_student_id: studentId,
  });

  if (error || !data) return { ok: false, reason: toFailure(error ?? {}) };
  return { ok: true, data: { enrollmentId: data } };
}
