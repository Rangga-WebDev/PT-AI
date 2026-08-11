/** @format */

import { z } from "zod";

const email = z
  .string()
  .trim()
  .min(1, "Surel wajib diisi.")
  .email("Format surel tidak valid.");

const password = z.string().min(1, "Kata sandi wajib diisi.");

// Kebijakan panjang minimum hanya diterapkan saat menetapkan kata sandi baru,
// bukan saat masuk, agar pesan galat tidak membocorkan aturan akun lama.
const newPassword = z
  .string()
  .min(12, "Kata sandi minimal 12 karakter.")
  .max(128, "Kata sandi maksimal 128 karakter.");

export const signInSchema = z.object({
  email,
  password,
});

export const requestPasswordResetSchema = z.object({
  email,
});

export const updatePasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama.",
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
