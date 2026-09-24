/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  matchesProject,
  resetAdminPassword,
} from "../../scripts/reset-admin-password.mjs";

const userId = "10000000-0000-4000-8000-000000000001";
const email = "admin@example.invalid";
const password = "only-a-test-password-2026";
const getUserById = vi.fn();
const updateUserById = vi.fn();
const auditInsert = vi.fn();
const signInWithPassword = vi.fn();
const signOut = vi.fn();
const promptPassword = vi.fn();
const from = vi.fn();
const admin = { auth: { admin: { getUserById, updateUserById } }, from };
const login = { auth: { signInWithPassword, signOut } };

function query(data: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    is: () => chain,
    limit: () => chain,
    maybeSingle: async () => ({ data, error: null }),
  };
  return chain;
}

function runReset() {
  return resetAdminPassword({ admin, login, userId, email, promptPassword });
}

beforeEach(() => {
  vi.resetAllMocks();
  getUserById.mockResolvedValue({
    data: { user: { id: userId, email, email_confirmed_at: "2026-09-22" } },
    error: null,
  });
  from.mockImplementation((table: string) => {
    if (table === "audit_logs") return { insert: auditInsert };
    return query(
      table === "profiles"
        ? { is_active: true, organization_id: "organization" }
        : { id: "admin-role" },
    );
  });
  auditInsert.mockResolvedValue({ error: null });
  updateUserById.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  signInWithPassword.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
  signOut.mockResolvedValue({ error: null });
  promptPassword.mockImplementation(async () => ({
    password,
    confirmation: password,
  }));
});

describe("target reset admin", () => {
  it("memerlukan ref yang sama persis dengan host Supabase", () => {
    expect(
      matchesProject("https://testproject.supabase.co", "testproject"),
    ).toBe(true);
    expect(
      matchesProject("https://testproject.supabase.co", "anotherproject"),
    ).toBe(false);
  });

  it.each([
    "https://testproject.supabase.co.evil.invalid",
    "http://testproject.supabase.co",
    "https://testproject.supabase.co/other",
    "https://name:secret@testproject.supabase.co",
    "https://testproject.supabase.co?key=secret",
    "invalid",
  ])("menolak URL di luar target aman: %s", (url) => {
    expect(matchesProject(url, "testproject")).toBe(false);
  });
});

describe("pemulihan password admin", () => {
  it("mengubah hanya password akun yang cocok lalu menutup sesi diagnosis lokal", async () => {
    expect(await runReset()).toMatchObject({
      ok: true,
      passwordUpdated: true,
      loginVerified: true,
      auditCompleted: true,
      sessionClosed: true,
    });
    expect(updateUserById).toHaveBeenCalledExactlyOnceWith(userId, {
      password,
    });
    expect(signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email,
      password,
    });
    expect(signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
    expect(auditInsert).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(auditInsert.mock.calls)).not.toContain(password);
    expect(JSON.stringify(auditInsert.mock.calls)).not.toContain(email);
  });

  it("tidak mengubah akun bila surel target tidak cocok", async () => {
    getUserById.mockResolvedValue({
      data: {
        user: {
          id: userId,
          email: "other@example.invalid",
          email_confirmed_at: "2026-09-22",
        },
      },
      error: null,
    });
    expect(await runReset()).toMatchObject({
      ok: false,
      code: "account_mismatch",
      passwordUpdated: false,
    });
    expect(promptPassword).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("tidak mereset akun yang tidak memiliki peran admin", async () => {
    from.mockImplementation((table: string) =>
      query(
        table === "profiles"
          ? { is_active: true, organization_id: "organization" }
          : null,
      ),
    );
    expect(await runReset()).toMatchObject({
      ok: false,
      code: "admin_role_missing",
    });
    expect(promptPassword).not.toHaveBeenCalled();
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it.each([
    {
      password: "pendek",
      confirmation: "pendek",
      code: "password_length_invalid",
    },
    {
      password,
      confirmation: "berbeda",
      code: "password_confirmation_mismatch",
    },
  ])(
    "menolak input password: $code",
    async ({ password: input, confirmation, code }) => {
      promptPassword.mockResolvedValue({ password: input, confirmation });
      expect(await runReset()).toMatchObject({
        ok: false,
        code,
        passwordUpdated: false,
      });
      expect(updateUserById).not.toHaveBeenCalled();
      expect(auditInsert).not.toHaveBeenCalled();
    },
  );

  it("tidak mereset bila jejak permintaan tidak bisa ditulis", async () => {
    auditInsert.mockResolvedValue({
      error: { code: "42501", message: "sensitive-message" },
    });
    expect(await runReset()).toMatchObject({
      ok: false,
      phase: "audit_requested",
      code: "42501",
      passwordUpdated: false,
    });
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("tidak mengembalikan pesan mentah Auth yang mungkin sensitif", async () => {
    updateUserById.mockResolvedValue({
      error: { code: "weak_password", status: 422, message: password },
    });
    const result = await runReset();
    expect(result).toMatchObject({
      ok: false,
      phase: "update_password",
      passwordUpdated: false,
      code: "weak_password",
    });
    expect(JSON.stringify(result)).not.toContain(password);
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("membedakan reset yang berhasil dari verifikasi login yang gagal", async () => {
    signInWithPassword.mockResolvedValue({
      data: null,
      error: { code: "invalid_credentials", status: 400 },
    });
    expect(await runReset()).toMatchObject({
      ok: false,
      phase: "verify_login",
      passwordUpdated: true,
      loginVerified: false,
    });
    expect(updateUserById).toHaveBeenCalledOnce();
  });

  it("kegagalan audit sesudah reset tidak disebut sukses penuh", async () => {
    auditInsert
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { code: "XX000" } });
    expect(await runReset()).toMatchObject({
      ok: false,
      phase: "audit_incomplete",
      passwordUpdated: true,
      loginVerified: true,
      auditCompleted: false,
    });
  });
});
