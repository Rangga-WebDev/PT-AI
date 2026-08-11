/** @format */

import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { AuthenticationError, AuthorizationError } from "@/lib/errors";
import {
  hasRole,
  landingPathForRoles,
  type CurrentUser,
  type RoleKey,
} from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/server";

export { hasRole, landingPathForRoles };
export type { CurrentUser, RoleKey };

/**
 * Sumber kebenaran identitas (SEC-004). Memakai getUser() yang memvalidasi
 * token ke server Supabase; getSession() tidak dipakai untuk keputusan
 * otorisasi karena isinya berasal dari cookie yang dapat dipalsukan.
 *
 * cache() menjaga agar satu render hanya melakukan satu kali pemeriksaan.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, identifier, organization_id, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;

  const { data: assignments } = await supabase
    .from("role_assignments")
    .select("roles(key)")
    .eq("profile_id", user.id)
    .is("revoked_at", null);

  const roles = (assignments ?? [])
    .map((row) => row.roles?.key)
    .filter((key): key is RoleKey => Boolean(key));

  return {
    id: profile.id,
    email: user.email ?? "",
    fullName: profile.full_name,
    identifier: profile.identifier,
    organizationId: profile.organization_id,
    roles,
  };
});

/** Untuk Server Component: mengalihkan ke halaman masuk bila belum terautentikasi. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Untuk Server Action dan Route Handler: melempar, tidak mengalihkan. */
export async function requireUserOrThrow(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthenticationError();
  return user;
}

/** Untuk Server Component: mengalihkan ke halaman akses ditolak. */
export async function requireRole(...roles: RoleKey[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!hasRole(user, ...roles)) redirect("/app/forbidden");
  return user;
}

/** Untuk Server Action dan Route Handler: melempar AuthorizationError. */
export async function requireRoleOrThrow(
  ...roles: RoleKey[]
): Promise<CurrentUser> {
  const user = await requireUserOrThrow();
  if (!hasRole(user, ...roles)) throw new AuthorizationError();
  return user;
}

export async function requireAdminAccess(): Promise<CurrentUser> {
  return requireRole("admin");
}

export async function requireLecturerAccess(): Promise<CurrentUser> {
  return requireRole("lecturer");
}

export async function requireStudentAccess(): Promise<CurrentUser> {
  return requireRole("student");
}

/**
 * Akses kelas diverifikasi ke database, bukan disimpulkan dari peran saja:
 * dosen hanya boleh kelas yang ditugaskan, mahasiswa hanya kelas yang diikuti.
 * RLS tetap menjadi pertahanan terakhir bila pemeriksaan ini terlewat.
 */
export async function requireClassAccess(
  classId: string,
): Promise<CurrentUser> {
  const user = await requireUserOrThrow();
  const supabase = await createClient();

  const [{ data: asLecturer }, { data: asStudent }] = await Promise.all([
    supabase
      .from("class_lecturers")
      .select("id")
      .eq("class_id", classId)
      .eq("lecturer_id", user.id)
      .maybeSingle(),
    supabase
      .from("enrollments")
      .select("id")
      .eq("class_id", classId)
      .eq("student_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  if (!asLecturer && !asStudent) throw new AuthorizationError();
  return user;
}

export async function requireLecturerOfClass(
  classId: string,
): Promise<CurrentUser> {
  const user = await requireRoleOrThrow("lecturer");
  const supabase = await createClient();

  const { data } = await supabase
    .from("class_lecturers")
    .select("id")
    .eq("class_id", classId)
    .eq("lecturer_id", user.id)
    .maybeSingle();

  if (!data) throw new AuthorizationError();
  return user;
}
