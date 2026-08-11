/** @format */

import { describe, expect, it } from "vitest";

import {
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
