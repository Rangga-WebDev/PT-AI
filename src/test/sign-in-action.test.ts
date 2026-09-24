/** @format */

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
  }),
}));
vi.mock("@/lib/supabase/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  landingPathForRoles: () => "/app/admin/dashboard",
}));

import { signIn } from "@/actions/auth/sign-in";

function credentials() {
  const data = new FormData();
  data.set("email", "admin@example.invalid");
  data.set("password", "test-password-not-real");
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.getCurrentUser.mockResolvedValue({ roles: ["admin"] });
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

afterEach(() => vi.restoreAllMocks());

describe("diagnosis login yang aman", () => {
  it.each([
    ["invalid_credentials", 400],
    ["email_provider_disabled", 400],
    ["unexpected_failure", 500],
  ])("mencatat hanya kode dan status untuk %s", async (code, status) => {
    mocks.signInWithPassword.mockResolvedValue({
      error: {
        code,
        status,
        message: "admin@example.invalid test-password-not-real raw-token-value",
        details: { access_token: "raw-token-value" },
      },
    });

    const result = await signIn({}, credentials());

    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      `[auth] login gagal ${JSON.stringify({ code, status })}`,
    );
    expect(result).toEqual({ error: "Surel atau kata sandi salah." });
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("galat tanpa kode tidak membuat diagnosis melempar", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: "network" },
    });

    expect(await signIn({}, credentials())).toEqual({
      error: "Surel atau kata sandi salah.",
    });
    expect(console.error).toHaveBeenCalledWith(
      '[auth] login gagal {"code":null,"status":null}',
    );
  });

  it("pesan pembatas laju tetap tersedia", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { code: "over_request_rate_limit", status: 429 },
    });

    expect((await signIn({}, credentials())).error).toContain(
      "Terlalu banyak percobaan masuk",
    );
    expect(console.error).toHaveBeenCalledWith(
      '[auth] login gagal {"code":"over_request_rate_limit","status":429}',
    );
  });

  it("input tidak valid tidak memanggil Auth atau dicatat sebagai kegagalan Auth", async () => {
    expect((await signIn({}, new FormData())).fieldErrors).toBeDefined();
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  it("login admin berhasil tetap mengarah ke dashboard", async () => {
    await expect(signIn({}, credentials())).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.invalid",
      password: "test-password-not-real",
    });
    expect(mocks.redirect).toHaveBeenCalledWith("/app/admin/dashboard");
    expect(console.error).not.toHaveBeenCalled();
  });

  it("profil hilang dibedakan dari penolakan Auth", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    expect((await signIn({}, credentials())).error).toContain(
      "belum aktif atau belum memiliki profil",
    );
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(console.error).not.toHaveBeenCalled();
  });
});
