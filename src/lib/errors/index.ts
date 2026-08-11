/** @format */

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
  constructor(
    publicMessage = "Terjadi kesalahan saat mengakses data.",
    message?: string,
  ) {
    super("DATABASE", publicMessage, message);
    this.name = "DatabaseError";
  }
}

/** Hasil standar Server Action agar UI tidak pernah menerima detail internal. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof AppError) {
    return { ok: false, error: error.publicMessage };
  }

  console.error("[unexpected]", error);
  return {
    ok: false,
    error: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
  };
}
