/** @format */

import {
  DATABASE_PUBLIC_MESSAGE,
  classifySqlState,
  isPostgresError,
  isRetryable,
  type DatabaseErrorKind,
  type PostgresErrorShape,
} from "./database";
import { redactDatabaseDetail, redactUnexpected } from "./redact";

export * from "./database";
export * from "./redact";

// Domain error aplikasi. Pesan pada properti `publicMessage` boleh ditampilkan
// ke pengguna; detail teknis lain hanya untuk log server.

export type AppErrorCode =
  | "VALIDATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMIT"
  | "STORAGE"
  | "AI_PROVIDER"
  | "DATABASE"
  | "UNEXPECTED";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly publicMessage: string;

  constructor(code: AppErrorCode, publicMessage: string, message?: string) {
    super(message ?? publicMessage);
    this.name = "AppError";
    this.code = code;
    this.publicMessage = publicMessage;
  }
}

export class ValidationError extends AppError {
  constructor(
    publicMessage = "Data yang dikirim tidak valid.",
    message?: string,
  ) {
    super("VALIDATION", publicMessage, message);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(
    publicMessage = "Anda perlu masuk terlebih dahulu.",
    message?: string,
  ) {
    super("AUTHENTICATION", publicMessage, message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends AppError {
  constructor(
    publicMessage = "Anda tidak memiliki izin untuk tindakan ini.",
    message?: string,
  ) {
    super("AUTHORIZATION", publicMessage, message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends AppError {
  constructor(publicMessage = "Data tidak ditemukan.", message?: string) {
    super("NOT_FOUND", publicMessage, message);
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends AppError {
  readonly kind: DatabaseErrorKind;
  readonly sqlstate: string | null;
  readonly operation: string | null;
  readonly retryable: boolean;

  constructor(
    options: {
      kind?: DatabaseErrorKind;
      publicMessage?: string;
      message?: string;
      sqlstate?: string | null;
      operation?: string | null;
    } = {},
  ) {
    const kind = options.kind ?? "unknown_database_error";
    super(
      "DATABASE",
      options.publicMessage ?? DATABASE_PUBLIC_MESSAGE[kind],
      options.message,
    );
    this.name = "DatabaseError";
    this.kind = kind;
    this.sqlstate = options.sqlstate ?? null;
    this.operation = options.operation ?? null;
    this.retryable = isRetryable(kind);
  }
}

/**
 * Detail teknis hanya ke log server, dan hanya sebabnya. Nilai kolom yang
 * memicu galat disamarkan lebih dahulu supaya log tidak menjadi salinan kedua
 * data pribadi.
 */
export function logDatabaseError(
  error: DatabaseError,
  raw?: PostgresErrorShape,
): void {
  console.error("[db]", {
    at: new Date().toISOString(),
    kind: error.kind,
    sqlstate: error.sqlstate,
    operation: error.operation,
    message: redactDatabaseDetail(error.message),
    details: redactDatabaseDetail(raw?.details),
    hint: redactDatabaseDetail(raw?.hint),
  });
}

/** Mengubah galat PostgreSQL menjadi error domain, sekaligus mencatatnya. */
export function toDatabaseError(
  raw: PostgresErrorShape,
  operation?: string,
): DatabaseError {
  const kind = classifySqlState(raw.code);
  const error = new DatabaseError({
    kind,
    message: raw.message ?? "galat basis data tanpa pesan",
    sqlstate: raw.code ?? null,
    operation: operation ?? null,
  });

  logDatabaseError(error, raw);
  return error;
}

/** Hasil standar Server Action agar UI tidak pernah menerima detail internal. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      code?: AppErrorCode;
      fieldErrors?: Record<string, string[]>;
    };

/**
 * Urutan pemetaan: error domain lebih dahulu, lalu galat basis data mentah,
 * baru cabang terakhir. Galat teknis tidak pernah ditelan tanpa catatan.
 */
export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof AppError) {
    return { ok: false, error: error.publicMessage, code: error.code };
  }

  if (isPostgresError(error)) {
    const dbError = toDatabaseError(error);
    return { ok: false, error: dbError.publicMessage, code: dbError.code };
  }

  console.error("[unexpected]", {
    at: new Date().toISOString(),
    error: redactUnexpected(error),
  });
  return {
    ok: false,
    error: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
    code: "UNEXPECTED",
  };
}
