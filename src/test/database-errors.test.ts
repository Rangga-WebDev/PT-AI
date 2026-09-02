/** @format */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  AppError,
  DatabaseError,
  ValidationError,
  classifySqlState,
  isPostgresError,
  isRetryable,
  toActionError,
  toDatabaseError,
} from "@/lib/errors";

function pgError(code: string, extra: Record<string, string> = {}) {
  return {
    code,
    message: 'duplicate key value violates unique constraint "uq_secret_table"',
    details: "Key (email)=(mahasiswa@kampus.ac.id) already exists.",
    hint: null,
    ...extra,
  };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("classifySqlState", () => {
  const cases: [string, string][] = [
    ["23505", "unique_violation"],
    ["23503", "foreign_key_violation"],
    ["23502", "not_null_violation"],
    ["23514", "check_violation"],
    ["23001", "restrict_violation"],
    ["22P02", "invalid_text_representation"],
    ["42501", "insufficient_privilege"],
    ["40001", "serialization_failure"],
    ["40P01", "deadlock_detected"],
    ["08006", "database_unavailable"],
    ["53300", "database_unavailable"],
    ["57P01", "database_unavailable"],
    ["XX000", "unknown_database_error"],
  ];

  for (const [sqlstate, kind] of cases) {
    it(`memetakan ${sqlstate} menjadi ${kind}`, () => {
      expect(classifySqlState(sqlstate)).toBe(kind);
    });
  }

  it("menganggap galat tanpa kode sebagai tidak dikenal", () => {
    expect(classifySqlState(null)).toBe("unknown_database_error");
  });
});

describe("isPostgresError", () => {
  it("mengenali bentuk galat PostgREST", () => {
    expect(isPostgresError(pgError("23505"))).toBe(true);
  });

  it("tidak menganggap Error biasa sebagai galat basis data", () => {
    expect(isPostgresError(new Error("boom"))).toBe(false);
  });

  it("menolak nilai yang bukan objek", () => {
    expect(isPostgresError("23505")).toBe(false);
    expect(isPostgresError(null)).toBe(false);
  });
});

describe("toActionError", () => {
  it("meneruskan pesan publik error domain tanpa mengubahnya", () => {
    const result = toActionError(new ValidationError("Judul wajib diisi."));

    expect(result).toEqual({
      ok: false,
      error: "Judul wajib diisi.",
      code: "VALIDATION",
    });
  });

  it("tidak lagi menjadikan galat basis data sebagai kesalahan tak terduga", () => {
    const result = toActionError(pgError("23503"));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("DATABASE");
    expect(result.error).not.toMatch(/tidak terduga/i);
  });

  const publicMessages: [string, RegExp][] = [
    ["23505", /sudah terdaftar/i],
    ["23503", /tidak ditemukan atau sudah tidak tersedia/i],
    ["23502", /belum lengkap/i],
    ["23514", /tidak memenuhi aturan/i],
    ["22P02", /format data tidak valid/i],
    ["42501", /tidak memiliki izin/i],
    ["40001", /coba lagi/i],
    ["40P01", /coba lagi/i],
    ["XX000", /kesalahan saat memproses data/i],
  ];

  for (const [sqlstate, pattern] of publicMessages) {
    it(`memberi pesan publik yang masuk akal untuk ${sqlstate}`, () => {
      const result = toActionError(pgError(sqlstate));

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toMatch(pattern);
    });
  }

  it("tetap memakai cabang terakhir untuk galat yang bukan basis data", () => {
    const result = toActionError(new Error("boom"));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("UNEXPECTED");
  });
});

describe("kerahasiaan pesan publik", () => {
  const forbidden = [
    /uq_secret_table/,
    /mahasiswa@kampus\.ac\.id/,
    /\b23505\b/,
    /duplicate key/i,
    /constraint/i,
    /select |insert |update /i,
  ];

  it("tidak membocorkan nama constraint, nilai kolom, SQLSTATE, maupun SQL", () => {
    const result = toActionError(pgError("23505"));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    for (const pattern of forbidden) {
      expect(result.error).not.toMatch(pattern);
    }
  });

  it("menyimpan detail teknis pada error domain, bukan pada pesan publik", () => {
    const error = toDatabaseError(pgError("23503"), "recordMeasurement");

    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toBeInstanceOf(AppError);
    expect(error.sqlstate).toBe("23503");
    expect(error.operation).toBe("recordMeasurement");
    expect(error.message).toMatch(/duplicate key/i);
    expect(error.publicMessage).not.toMatch(/duplicate key/i);
  });
});

describe("pencatatan sisi server", () => {
  it("mencatat sebabnya tanpa nilai kolom yang memicunya", () => {
    const spy = vi.spyOn(console, "error");
    toDatabaseError(pgError("23503"), "recordMeasurement");

    expect(spy).toHaveBeenCalledWith(
      "[db]",
      expect.objectContaining({
        kind: "foreign_key_violation",
        sqlstate: "23503",
        operation: "recordMeasurement",
      }),
    );

    expect(JSON.stringify(spy.mock.calls)).not.toContain(
      "mahasiswa@kampus.ac.id",
    );
  });

  it("tidak menelan galat basis data tanpa catatan", () => {
    const spy = vi.spyOn(console, "error");
    toActionError(pgError("XX000"));

    expect(spy).toHaveBeenCalled();
  });
});

describe("isRetryable", () => {
  it("menandai konflik sementara sebagai dapat dicoba ulang", () => {
    expect(isRetryable("serialization_failure")).toBe(true);
    expect(isRetryable("deadlock_detected")).toBe(true);
    expect(isRetryable("database_unavailable")).toBe(true);
  });

  it("tidak menandai pelanggaran aturan sebagai dapat dicoba ulang", () => {
    expect(isRetryable("unique_violation")).toBe(false);
    expect(isRetryable("restrict_violation")).toBe(false);
  });
});
