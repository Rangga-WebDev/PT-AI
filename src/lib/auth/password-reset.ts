/** @format */

/** Kata sandi sementara hanya dikembalikan sekali kepada pemberinya. */
export type PasswordResetResult =
  | { temporaryPassword: string; error?: undefined }
  | { temporaryPassword?: undefined; error: string };

export function describePasswordUpdateError(code: string | undefined): string {
  if (code === "same_password") {
    return "Kata sandi baru harus berbeda dari kata sandi lama.";
  }
  if (code === "weak_password") {
    return "Kata sandi terlalu lemah. Gunakan gabungan huruf, angka, dan simbol.";
  }
  return "Kata sandi gagal diperbarui. Silakan coba lagi.";
}
