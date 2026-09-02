/** @format */

// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import {
  logDatabaseError,
  redactDatabaseDetail,
  redactUnexpected,
  toDatabaseError,
  DatabaseError,
} from "@/lib/errors";

describe("redactDatabaseDetail", () => {
  it("menyamarkan nilai kolom pada detail unique violation", () => {
    const detail = redactDatabaseDetail(
      "Key (organization_id, identifier)=(3f2504e0-4f89-41d3-9a0c-0305e82c3301, 2021001234) already exists.",
    );

    expect(detail).not.toContain("2021001234");
    expect(detail).not.toContain("3f2504e0");
    expect(detail).toContain("Key (organization_id, identifier)");
    expect(detail).toContain("already exists");
  });

  it("menyamarkan nilai berkutip pada pelanggaran check", () => {
    const detail = redactDatabaseDetail(
      `new row for relation "attempts" violates check constraint 'ck_len' value 'Menurut saya kebijakan itu keliru karena'`,
    );

    expect(detail).not.toContain("Menurut saya");
    expect(detail).toContain("violates check constraint");
  });

  it("menyamarkan surel yang lolos pola lain", () => {
    expect(
      redactDatabaseDetail("kontak mahasiswa.dev@ptai.test gagal"),
    ).not.toContain("mahasiswa.dev@ptai.test");
  });

  it("memotong pesan yang sangat panjang", () => {
    const long = redactDatabaseDetail("a".repeat(1200));
    expect((long ?? "").length).toBeLessThanOrEqual(301);
  });

  it("meneruskan nilai kosong apa adanya", () => {
    expect(redactDatabaseDetail(null)).toBeNull();
    expect(redactDatabaseDetail(undefined)).toBeNull();
    expect(redactDatabaseDetail("")).toBeNull();
  });
});

describe("redactUnexpected", () => {
  it("mencatat nama, pesan tersamar, dan beberapa bingkai saja", () => {
    const error = new Error("gagal untuk dosen.dev@ptai.test");
    const redacted = redactUnexpected(error);

    expect(redacted.name).toBe("Error");
    expect(redacted.message).not.toContain("dosen.dev@ptai.test");
    expect(redacted.frame?.split("|").length ?? 0).toBeLessThanOrEqual(3);
  });

  it("tidak mencetak objek galat secara utuh", () => {
    const redacted = redactUnexpected({
      requestBody: { password: "rahasia" },
    });

    expect(JSON.stringify(redacted)).not.toContain("rahasia");
  });
});

describe("pencatatan galat basis data", () => {
  it("tidak menuliskan nilai kolom ke log", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    toDatabaseError(
      {
        code: "23505",
        message: "duplicate key value violates unique constraint",
        details:
          "Key (organization_id, identifier)=(3f2504e0-4f89-41d3-9a0c-0305e82c3301, 2021001234) already exists.",
        hint: "coba identifier lain untuk mahasiswa.dev@ptai.test",
      },
      "createAccount",
    );

    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).not.toContain("2021001234");
    expect(logged).not.toContain("mahasiswa.dev@ptai.test");
    expect(logged).toContain("23505");
    expect(logged).toContain("createAccount");

    spy.mockRestore();
  });

  it("tetap mencatat sebab yang dapat didiagnosis", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    logDatabaseError(
      new DatabaseError({
        kind: "foreign_key_violation",
        sqlstate: "23503",
        operation: "enrollStudent",
      }),
    );

    const logged = JSON.stringify(spy.mock.calls[0]);
    expect(logged).toContain("foreign_key_violation");
    expect(logged).toContain("enrollStudent");

    spy.mockRestore();
  });
});
