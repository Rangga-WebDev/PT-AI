/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface ClassSummaryView {
  id: string;
  code: string;
  name: string;
  courseName: string;
  academicPeriod: string;
  status: "draft" | "published" | "archived";
  lecturerNames: string[];
  studentCount: number;
}

// class_lecturers dan enrollments masing-masing punya dua foreign key ke
// profiles, sehingga relasinya harus ditunjuk eksplisit dengan nama kolom.
const CLASS_SELECT = `
  id, code, name, capacity, status,
  courses(code, name),
  academic_periods(name),
  class_lecturers(profiles!lecturer_id(full_name)),
  enrollments(id)
`;

interface ClassRecord {
  id: string;
  code: string;
  name: string;
  capacity: number | null;
  status: "draft" | "published" | "archived";
  courses: { code: string; name: string };
  academic_periods: { name: string };
  class_lecturers: { profiles: { full_name: string } }[];
  enrollments: { id: string }[];
}

function toSummary(row: ClassRecord): ClassSummaryView {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    courseName: row.courses.name,
    academicPeriod: row.academic_periods.name,
    status: row.status,
    lecturerNames: row.class_lecturers.map((item) => item.profiles.full_name),
    studentCount: row.enrollments.length,
  };
}

export async function listClassesForAdmin(): Promise<ClassSummaryView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("classes")
      .select(CLASS_SELECT)
      .is("deleted_at", null)
      .order("code"),
    "listClassesForAdmin",
  );

  return rows.map(toSummary);
}

/** Kelas yang ditugaskan kepada dosen; pembatasan sesungguhnya ada di RLS. */
export async function listClassesForLecturer(
  lecturerId: string,
): Promise<ClassSummaryView[]> {
  const supabase = await createClient();

  const assignments = unwrap(
    await supabase
      .from("class_lecturers")
      .select(`classes(${CLASS_SELECT})`)
      .eq("lecturer_id", lecturerId),
    "listClassesForLecturer",
  );

  return assignments
    .map((row) => row.classes)
    .filter((item): item is ClassRecord => Boolean(item))
    .map(toSummary);
}

/** Kelas yang diikuti mahasiswa; hanya yang sudah dipublikasikan. */
export async function listClassesForStudent(
  studentId: string,
): Promise<ClassSummaryView[]> {
  const supabase = await createClient();

  const enrollments = unwrap(
    await supabase
      .from("enrollments")
      .select(`classes(${CLASS_SELECT})`)
      .eq("student_id", studentId)
      .eq("status", "active"),
    "listClassesForStudent",
  );

  return enrollments
    .map((row) => row.classes)
    .filter((item): item is ClassRecord => Boolean(item))
    .filter((item) => item.status === "published")
    .map(toSummary);
}

export async function getClassDetail(
  classId: string,
): Promise<ClassSummaryView | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("classes")
    .select(CLASS_SELECT)
    .eq("id", classId)
    .is("deleted_at", null)
    .maybeSingle();

  return data ? toSummary(data) : null;
}

export interface ClassMemberView {
  id: string;
  profileId: string;
  fullName: string;
  identifier: string;
  roleInClass?: string | undefined;
}

export async function listClassMembers(classId: string): Promise<{
  lecturers: ClassMemberView[];
  students: ClassMemberView[];
}> {
  const supabase = await createClient();

  const [lecturers, students] = await Promise.all([
    supabase
      .from("class_lecturers")
      .select(
        "id, role_in_class, profiles!lecturer_id(id, full_name, identifier)",
      )
      .eq("class_id", classId),
    supabase
      .from("enrollments")
      .select("id, status, profiles!student_id(id, full_name, identifier)")
      .eq("class_id", classId)
      .order("created_at"),
  ]);

  return {
    lecturers: (lecturers.data ?? []).map((row) => ({
      id: row.id,
      profileId: row.profiles.id,
      fullName: row.profiles.full_name,
      identifier: row.profiles.identifier,
      roleInClass: row.role_in_class,
    })),
    students: (students.data ?? []).map((row) => ({
      id: row.id,
      profileId: row.profiles.id,
      fullName: row.profiles.full_name,
      identifier: row.profiles.identifier,
    })),
  };
}
