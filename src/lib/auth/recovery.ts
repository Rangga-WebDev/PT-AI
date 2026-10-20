/** @format */

export type RecoveryFragment =
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; error: string };

const EXPIRED =
  "Tautan pengaturan ulang sudah kedaluwarsa atau sudah dipakai. Silakan minta tautan baru.";
const INVALID =
  "Tautan pengaturan ulang tidak valid. Silakan minta tautan baru.";

/**
 * Tautan surel membawa token di fragmen URL (#), yang tidak pernah dikirim ke
 * server. Karena tidak bergantung pada cookie peramban peminta, tautan tetap
 * berlaku walau dibuka di perangkat lain.
 */
export function parseRecoveryFragment(hash: string): RecoveryFragment {
  const params = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);

  if (params.get("error")) {
    return {
      ok: false,
      error: params.get("error_code") === "otp_expired" ? EXPIRED : INVALID,
    };
  }

  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken || params.get("type") !== "recovery") {
    return { ok: false, error: INVALID };
  }

  return { ok: true, accessToken, refreshToken };
}

/** Hanya jalur internal; mencegah pengalihan terbuka ke situs lain. */
export function safeNextPath(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/reset-password";
}
