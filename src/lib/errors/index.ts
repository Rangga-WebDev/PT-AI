/** @format */

import {
  DATABASE_PUBLIC_MESSAGE,
  classifySqlState,
  isPostgresError,
  isRetryable,
  type DatabaseErrorKind,
  type PostgresErrorShape,
} from "./database";

export * from "./database";

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
 * Detail teknis hanya ke log server. `details` dan `hint` sengaja ikut karena
 * justru itu yang membuat pelanggaran foreign key dapat didiagnosis; keduanya
 * tidak pernah dikirim ke peramban.
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
    message: error.message,
    details: raw?.details ?? null,
    hint: raw?.hint ?? null,
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

  console.error("[unexpected]", { at: new Date().toISOString(), error });
  return {
    ok: false,
    error: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
    code: "UNEXPECTED",
  };
}
