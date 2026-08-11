/** @format */

import { describe, expect, it } from "vitest";

import {
  academicPeriodSchema,
  accountSchema,
  classSchema,
  courseSchema,
} from "@/lib/validation/academics";

describe("academicPeriodSchema", () => {
  it("menolak tanggal selesai yang lebih awal dari tanggal mulai", () => {
    const result = academicPeriodSchema.safeParse({
      name: "Ganjil",
      code: "2026-1",
      startDate: "2026-08-01",
      endDate: "2026-07-01",
      isActive: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endDate?.[0]).toBe(
        "Tanggal selesai harus setelah tanggal mulai.",
      );
    }
  });

  it("menerima rentang tanggal yang benar", () => {
    const result = academicPeriodSchema.safeParse({
      name: "Ganjil 2026/2027",
      code: "2026-1",
      startDate: "2026-08-01",
      endDate: "2027-01-31",
      isActive: true,
    });

    expect(result.success).toBe(true);
  });
});

describe("courseSchema", () => {
  it("menolak SKS di luar rentang wajar", () => {
    const base = {
      studyProgramId: "00000000-0000-4000-8000-000000000001",
      code: "PKN-101",
      name: "Pendidikan Kewarganegaraan",
    };

    expect(courseSchema.safeParse({ ...base, credits: 0 }).success).toBe(false);
    expect(courseSchema.safeParse({ ...base, credits: 9 }).success).toBe(false);
    expect(courseSchema.safeParse({ ...base, credits: 2 }).success).toBe(true);
  });

  it("menolak kode dengan spasi", () => {
    const result = courseSchema.safeParse({
      studyProgramId: "00000000-0000-4000-8000-000000000001",
      code: "PKN 101",
      name: "Nama",
      credits: 2,
    });

    expect(result.success).toBe(false);
  });
});

describe("classSchema", () => {
  it("menolak relasi yang bukan UUID", () => {
    const result = classSchema.safeParse({
      courseId: "bukan-uuid",
      academicPeriodId: "00000000-0000-4000-8000-000000000001",
      code: "A",
      name: "Kelas A",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.courseId?.[0]).toBe(
        "Mata kuliah tidak valid.",
      );
    }
  });

  it("menerima kelas tanpa kapasitas", () => {
    const result = classSchema.safeParse({
      courseId: "00000000-0000-4000-8000-000000000001",
      academicPeriodId: "00000000-0000-4000-8000-000000000002",
      code: "A",
      name: "Kelas A",
    });

    expect(result.success).toBe(true);
  });
});

describe("accountSchema", () => {
  it("menolak peran di luar tiga peran yang ditetapkan", () => {
    const result = accountSchema.safeParse({
      email: "a@kampus.ac.id",
      fullName: "Nama",
      identifier: "123",
      role: "superadmin",
    });

    expect(result.success).toBe(false);
  });

  it("menerima akun tanpa program studi", () => {
    const result = accountSchema.safeParse({
      email: "a@kampus.ac.id",
      fullName: "Nama Lengkap",
      identifier: "123",
      role: "lecturer",
      studyProgramId: "",
    });

    expect(result.success).toBe(true);
  });
});
