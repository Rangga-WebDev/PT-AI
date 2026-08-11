/** @format */

import type { Database } from "@/lib/supabase/types";

// Logika peran yang murni (tanpa akses database) sengaja dipisah dari
// lib/supabase/auth.ts yang bertanda server-only, agar dapat diuji langsung.

export type RoleKey = Database["public"]["Enums"]["role_key"];

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  identifier: string;
  organizationId: string;
  roles: RoleKey[];
}

export function hasRole(user: CurrentUser, ...roles: RoleKey[]): boolean {
  return roles.some((role) => user.roles.includes(role));
}

/** Jalur masuk setelah autentikasi, ditentukan peran dari server. */
export function landingPathForRoles(roles: RoleKey[]): string {
  if (roles.includes("student")) return "/app/student/dashboard";
  if (roles.includes("lecturer")) return "/app/lecturer/dashboard";
  if (roles.includes("admin")) return "/app/admin/dashboard";
  return "/app/forbidden";
}
