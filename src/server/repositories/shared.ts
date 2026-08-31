/** @format */

import "server-only";

import { DatabaseError, toDatabaseError } from "@/lib/errors";

// Query Supabase mengembalikan { data, error }; helper ini menyatukan
// penanganannya agar pesan mentah database tidak pernah bocor ke pengguna.
export function unwrap<T>(
  result: { data: T | null; error: { message: string; code?: string } | null },
  context: string,
): T {
  if (result.error) {
    throw toDatabaseError(result.error, context);
  }
  if (result.data === null) {
    throw new DatabaseError({
      message: `${context}: data kosong`,
      operation: context,
    });
  }
  return result.data;
}

/**
 * Dipakai saat baris kosong adalah keadaan yang sah. Galat basis data tetap
 * dicatat: sebelumnya kegagalan teknis tidak dapat dibedakan dari "tidak ada".
 */
export function unwrapMaybe<T>(
  result: {
    data: T | null;
    error: { message: string; code?: string } | null;
  },
  context?: string,
): T | null {
  if (result.error) {
    toDatabaseError(result.error, context);
    return null;
  }
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
