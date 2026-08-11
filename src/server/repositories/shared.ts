/** @format */

import "server-only";

import { DatabaseError } from "@/lib/errors";

// Query Supabase mengembalikan { data, error }; helper ini menyatukan
// penanganannya agar pesan mentah database tidak pernah bocor ke pengguna.
export function unwrap<T>(
  result: { data: T | null; error: { message: string; code?: string } | null },
  context: string,
): T {
  if (result.error) {
    console.error(`[db:${context}]`, result.error);
    throw new DatabaseError(undefined, result.error.message);
  }
  if (result.data === null) {
    throw new DatabaseError(undefined, `${context}: data kosong`);
  }
  return result.data;
}

export function unwrapMaybe<T>(result: {
  data: T | null;
  error: { message: string; code?: string } | null;
}): T | null {
  if (result.error) return null;
  return result.data;
}

/** Kode unik PostgreSQL agar duplikasi bisa dijawab dengan pesan yang jelas. */
export const UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}
