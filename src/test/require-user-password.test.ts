/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appMetadata: {} as Record<string, unknown>,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT ${path}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: "user-1",
            email: "mahasiswa@gmail.com",
            app_metadata: mocks.appMetadata,
          },
        },
        error: null,
      }),
    },
    from(table: string) {
      if (table === "profiles") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({
            data: {
              id: "user-1",
              full_name: "Mahasiswa",
              identifier: "123456",
              organization_id: "org-1",
              is_active: true,
            },
          }),
        };
        return chain;
      }
      return {
        select: () => ({
          eq: () => ({
            is: async () => ({ data: [{ roles: { key: "student" } }] }),
          }),
        }),
      };
    },
  }),
}));

const { getCurrentUser, requireUser } = await import("@/lib/supabase/auth");

beforeEach(() => {
  mocks.appMetadata = {};
});

describe("kata sandi sementara", () => {
  it("membaca penanda wajib ganti dari app_metadata", async () => {
    mocks.appMetadata = { must_change_password: true };
    expect((await getCurrentUser())?.mustChangePassword).toBe(true);
  });

  it("mengalihkan pengguna berkata sandi sementara ke halaman ganti", async () => {
    mocks.appMetadata = { must_change_password: true };
    await expect(requireUser()).rejects.toThrow(
      "REDIRECT /app/account/password",
    );
  });

  it("membiarkan pengguna biasa melanjutkan", async () => {
    await expect(requireUser()).resolves.toMatchObject({
      id: "user-1",
      mustChangePassword: false,
    });
  });
});
