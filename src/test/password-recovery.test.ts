/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import { parseRecoveryFragment, safeNextPath } from "@/lib/auth/recovery";

describe("parseRecoveryFragment", () => {
  it("mengambil token dari tautan pengaturan ulang", () => {
    expect(
      parseRecoveryFragment(
        "#access_token=akses&expires_in=3600&refresh_token=segar&token_type=bearer&type=recovery",
      ),
    ).toEqual({ ok: true, accessToken: "akses", refreshToken: "segar" });
  });

  it("menjelaskan tautan yang kedaluwarsa", () => {
    const result = parseRecoveryFragment(
      "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid",
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("kedaluwarsa");
  });

  it("menolak tautan tanpa token atau bukan pengaturan ulang", () => {
    expect(parseRecoveryFragment("").ok).toBe(false);
    expect(
      parseRecoveryFragment("#access_token=a&refresh_token=b&type=signup").ok,
    ).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("hanya menerima jalur internal", () => {
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
    expect(safeNextPath("//evil.example")).toBe("/reset-password");
    expect(safeNextPath("https://evil.example")).toBe("/reset-password");
    expect(safeNextPath(null)).toBe("/reset-password");
  });
});
