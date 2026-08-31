/** @format */

// Pemetaan galat PostgreSQL ke kategori domain. Modul murni agar dapat diuji
// tanpa koneksi basis data.
//
// Klasifikasi selalu memakai SQLSTATE, tidak pernah mencocokkan teks pesan:
// teks dapat berubah antarversi PostgreSQL dan antarbahasa.

export type DatabaseErrorKind =
  | "unique_violation"
  | "foreign_key_violation"
  | "not_null_violation"
  | "check_violation"
  | "restrict_violation"
  | "invalid_text_representation"
  | "insufficient_privilege"
  | "serialization_failure"
  | "deadlock_detected"
  | "database_unavailable"
  | "unknown_database_error";

export interface PostgresErrorShape {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
}

/**
 * PostgrestError dan galat driver `pg` sama-sama membawa `message` dan
 * biasanya `code`. Objek `Error` biasa sengaja tidak dianggap galat basis data.
 */
export function isPostgresError(error: unknown): error is PostgresErrorShape {
  if (typeof error !== "object" || error === null) return false;
  if (error instanceof Error) return false;

  const candidate = error as PostgresErrorShape;
  return (
    typeof candidate.message === "string" &&
    ("code" in candidate || "details" in candidate || "hint" in candidate)
  );
}

export function classifySqlState(
  sqlstate: string | null | undefined,
): DatabaseErrorKind {
  if (!sqlstate) return "unknown_database_error";

  switch (sqlstate) {
    case "23505":
      return "unique_violation";
    case "23503":
      return "foreign_key_violation";
    case "23502":
      return "not_null_violation";
    case "23514":
      return "check_violation";
    // Dipakai luas oleh trigger proyek ini: append-only, imutabilitas versi,
    // dan penilai wajib dosen.
    case "23001":
      return "restrict_violation";
    case "22P02":
      return "invalid_text_representation";
    case "42501":
      return "insufficient_privilege";
    case "40001":
      return "serialization_failure";
    case "40P01":
      return "deadlock_detected";
    default:
      break;
  }

  // Kelas 08 koneksi, 53 sumber daya habis, 57P0x server dimatikan.
  if (
    sqlstate.startsWith("08") ||
    sqlstate.startsWith("53") ||
    sqlstate === "57P01" ||
    sqlstate === "57P02" ||
    sqlstate === "57P03"
  ) {
    return "database_unavailable";
  }

  return "unknown_database_error";
}

/**
 * Pesan untuk pengguna. Tidak boleh memuat nama tabel, nama constraint,
 * SQLSTATE, potongan SQL, maupun nilai kolom.
 */
export const DATABASE_PUBLIC_MESSAGE: Record<DatabaseErrorKind, string> = {
  unique_violation: "Data yang sama sudah terdaftar.",
  foreign_key_violation:
    "Data terkait yang diperlukan tidak ditemukan atau sudah tidak tersedia.",
  not_null_violation: "Data wajib belum lengkap.",
  check_violation: "Data tidak memenuhi aturan yang ditetapkan.",
  restrict_violation: "Tindakan ini ditolak oleh aturan yang berlaku.",
  invalid_text_representation: "Format data tidak valid.",
  insufficient_privilege: "Anda tidak memiliki izin untuk tindakan ini.",
  serialization_failure:
    "Terjadi konflik sementara saat menyimpan data. Silakan coba lagi.",
  deadlock_detected:
    "Terjadi konflik sementara saat menyimpan data. Silakan coba lagi.",
  database_unavailable:
    "Layanan data sedang tidak dapat dihubungi. Silakan coba beberapa saat lagi.",
  unknown_database_error: "Terjadi kesalahan saat memproses data.",
};

/** Konflik sementara pantas dicoba ulang; pelanggaran aturan tidak. */
export function isRetryable(kind: DatabaseErrorKind): boolean {
  return (
    kind === "serialization_failure" ||
    kind === "deadlock_detected" ||
    kind === "database_unavailable"
  );
}
