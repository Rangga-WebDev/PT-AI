/** @format */

import { describe, expect, it } from "vitest";

import {
  registerStudentSchema,
  requestPasswordResetSchema,
  signInSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";

describe("signInSchema", () => {
  it("menerima surel dan kata sandi yang valid", () => {
    const result = signInSchema.safeParse({
      email: "  mahasiswa@kampus.ac.id  ",
      password: "rahasia",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("mahasiswa@kampus.ac.id");
    }
  });

  it("menolak surel dengan format salah", () => {
    const result = signInSchema.safeParse({
      email: "bukan-surel",
      password: "x",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email?.[0]).toBe(
        "Format surel tidak valid.",
      );
    }
  });

  it("menolak kata sandi kosong", () => {
    const result = signInSchema.safeParse({
      email: "a@kampus.ac.id",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("requestPasswordResetSchema", () => {
  it("mewajibkan surel", () => {
    expect(requestPasswordResetSchema.safeParse({ email: "" }).success).toBe(
      false,
    );
  });
});

describe("registerStudentSchema", () => {
  const valid = {
    fullName: "Mahasiswa Kampus",
    identifier: "105611234567",
    email: "mahasiswa@student.unismuh.ac.id",
    password: "kata-sandi-baru-2026",
    confirmPassword: "kata-sandi-baru-2026",
  };

  it("menormalkan surel dan NIM tanpa membuang nol di depan", () => {
    const result = registerStudentSchema.parse({
      ...valid,
      email: "  Mahasiswa@STUDENT.UNISMUH.AC.ID  ",
      identifier: " 001234567890 ",
      role: "admin",
    });
    expect(result.email).toBe(valid.email);
    expect(result.identifier).toBe("001234567890");
    expect(result).not.toHaveProperty("role");
  });

  it.each([
    "mahasiswa@gmail.com",
    "mahasiswa@unismuh.ac.id",
    "mahasiswa@sub.student.unismuh.ac.id",
    "mahasiswa@student.unismuh.ac.id.example.com",
    "mahasiswa@fakestudent.unismuh.ac.id",
  ])("menolak domain di luar kampus: %s", (address) => {
    expect(
      registerStudentSchema.safeParse({ ...valid, email: address }).success,
    ).toBe(false);
  });

  it.each(["", "12345", "1056ABC123", "1".repeat(25)])(
    "menolak NIM tidak valid: %s",
    (identifier) => {
      expect(
        registerStudentSchema.safeParse({ ...valid, identifier }).success,
      ).toBe(false);
    },
  );

  it("menolak kata sandi lemah dan konfirmasi yang berbeda", () => {
    expect(
      registerStudentSchema.safeParse({ ...valid, password: "pendek" }).success,
    ).toBe(false);
    expect(
      registerStudentSchema.safeParse({ ...valid, confirmPassword: "berbeda" })
        .success,
    ).toBe(false);
  });
});

describe("updatePasswordSchema", () => {
  it("menolak kata sandi kurang dari 12 karakter", () => {
    const result = updatePasswordSchema.safeParse({
      password: "pendek",
      confirmPassword: "pendek",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password?.[0]).toBe(
        "Kata sandi minimal 12 karakter.",
      );
    }
  });

  it("menolak konfirmasi yang tidak sama", () => {
    const result = updatePasswordSchema.safeParse({
      password: "katasandipanjang",
      confirmPassword: "katasandiberbeda",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword?.[0]).toBe(
        "Konfirmasi kata sandi tidak sama.",
      );
    }
  });

  it("menerima kata sandi yang memenuhi syarat", () => {
    const result = updatePasswordSchema.safeParse({
      password: "katasandiyangpanjang",
      confirmPassword: "katasandiyangpanjang",
    });

    expect(result.success).toBe(true);
  });
});
