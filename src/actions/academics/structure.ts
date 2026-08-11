/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { toActionError } from "@/lib/errors";
import { requireAdminAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  academicPeriodSchema,
  classSchema,
  classStatusSchema,
  courseSchema,
  enrollmentSchema,
  facultySchema,
  lecturerAssignmentSchema,
  studyProgramSchema,
} from "@/lib/validation/academics";
import { isUniqueViolation } from "@/server/repositories/shared";

import type { FormState } from "@/actions/administration/accounts";

const DUPLICATE_MESSAGE =
  "Kode tersebut sudah dipakai. Gunakan kode lain yang unik.";

function fail(error: unknown): FormState {
  if (isUniqueViolation(error)) return { error: DUPLICATE_MESSAGE };
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

export async function createFacultyAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireAdminAccess();
    const parsed = facultySchema.safeParse({
      organizationId: formData.get("organizationId") ?? admin.organizationId,
      name: formData.get("name"),
      code: formData.get("code"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("faculties").insert({
      organization_id: parsed.data.organizationId,
      name: parsed.data.name,
      code: parsed.data.code,
    });

    if (error) return fail(error);

    revalidatePath("/app/admin/organizations");
    return { ok: true, message: "Fakultas berhasil ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

export async function createStudyProgramAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdminAccess();
    const parsed = studyProgramSchema.safeParse({
      facultyId: formData.get("facultyId"),
      name: formData.get("name"),
      code: formData.get("code"),
      degreeLevel: formData.get("degreeLevel"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("study_programs").insert({
      faculty_id: parsed.data.facultyId,
      name: parsed.data.name,
      code: parsed.data.code,
      degree_level: parsed.data.degreeLevel,
    });

    if (error) return fail(error);

    revalidatePath("/app/admin/organizations");
    return { ok: true, message: "Program studi berhasil ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

export async function createAcademicPeriodAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireAdminAccess();
    const parsed = academicPeriodSchema.safeParse({
      name: formData.get("name"),
      code: formData.get("code"),
      startDate: formData.get("startDate"),
      endDate: formData.get("endDate"),
      isActive: formData.get("isActive") === "on",
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("academic_periods").insert({
      organization_id: admin.organizationId,
      name: parsed.data.name,
      code: parsed.data.code,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      is_active: parsed.data.isActive,
    });

    if (error) return fail(error);

    revalidatePath("/app/admin/academic-periods");
    return { ok: true, message: "Periode akademik berhasil ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

export async function createCourseAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireAdminAccess();
    const parsed = courseSchema.safeParse({
      studyProgramId: formData.get("studyProgramId"),
      code: formData.get("code"),
      name: formData.get("name"),
      description: formData.get("description") ?? undefined,
      credits: formData.get("credits"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("courses").insert({
      organization_id: admin.organizationId,
      study_program_id: parsed.data.studyProgramId,
      code: parsed.data.code,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      credits: parsed.data.credits,
      created_by: admin.id,
    });

    if (error) return fail(error);

    revalidatePath("/app/admin/courses");
    return { ok: true, message: "Mata kuliah berhasil ditambahkan." };
  } catch (error) {
    return fail(error);
  }
}

export async function createClassAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireAdminAccess();
    const capacityValue = formData.get("capacity");
    const parsed = classSchema.safeParse({
      courseId: formData.get("courseId"),
      academicPeriodId: formData.get("academicPeriodId"),
      code: formData.get("code"),
      name: formData.get("name"),
      ...(capacityValue ? { capacity: capacityValue } : {}),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("classes").insert({
      course_id: parsed.data.courseId,
      academic_period_id: parsed.data.academicPeriodId,
      code: parsed.data.code,
      name: parsed.data.name,
      capacity: parsed.data.capacity ?? null,
      created_by: admin.id,
    });

    if (error) return fail(error);

    revalidatePath("/app/admin/classes");
    return { ok: true, message: "Kelas berhasil dibuat sebagai draf." };
  } catch (error) {
    return fail(error);
  }
}

export async function updateClassStatusAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireAdminAccess();
    const parsed = classStatusSchema.safeParse({
      classId: formData.get("classId"),
      status: formData.get("status"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("classes")
      .update({ status: parsed.data.status })
      .eq("id", parsed.data.classId);

    if (error) return fail(error);

    revalidatePath("/app/admin/classes");
    revalidatePath(`/app/admin/classes/${parsed.data.classId}`);
    return { ok: true, message: "Status kelas diperbarui." };
  } catch (error) {
    return fail(error);
  }
}

export async function assignLecturerAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireAdminAccess();
    const parsed = lecturerAssignmentSchema.safeParse({
      classId: formData.get("classId"),
      lecturerId: formData.get("lecturerId"),
      roleInClass: formData.get("roleInClass") ?? "member",
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("class_lecturers").insert({
      class_id: parsed.data.classId,
      lecturer_id: parsed.data.lecturerId,
      role_in_class: parsed.data.roleInClass,
      assigned_by: admin.id,
    });

    if (error) {
      return isUniqueViolation(error)
        ? { error: "Dosen tersebut sudah ditugaskan pada kelas ini." }
        : fail(error);
    }

    revalidatePath(`/app/admin/classes/${parsed.data.classId}`);
    return { ok: true, message: "Dosen berhasil ditugaskan." };
  } catch (error) {
    return fail(error);
  }
}

export async function enrollStudentAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const admin = await requireAdminAccess();
    const parsed = enrollmentSchema.safeParse({
      classId: formData.get("classId"),
      studentId: formData.get("studentId"),
    });

    if (!parsed.success) {
      return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("enrollments").insert({
      class_id: parsed.data.classId,
      student_id: parsed.data.studentId,
      enrolled_by: admin.id,
    });

    if (error) {
      return isUniqueViolation(error)
        ? { error: "Mahasiswa tersebut sudah terdaftar pada kelas ini." }
        : fail(error);
    }

    revalidatePath(`/app/admin/classes/${parsed.data.classId}`);
    return { ok: true, message: "Mahasiswa berhasil didaftarkan." };
  } catch (error) {
    return fail(error);
  }
}
