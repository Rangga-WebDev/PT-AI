/** @format */

// @vitest-environment node

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exchange: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { exchangeCodeForSession: mocks.exchange },
  }),
}));

const { GET } = await import("@/app/(public)/auth/callback/route");

const BASE = "https://ptai.example";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("auth callback", () => {
  it("meneruskan tautan tanpa kode ke halaman pemulihan", async () => {
    const response = await GET(
      new NextRequest(`${BASE}/auth/callback?next=/reset-password`),
    );

    expect(response.headers.get("location")).toBe(
      `${BASE}/auth/recovery?next=%2Freset-password`,
    );
    expect(mocks.exchange).not.toHaveBeenCalled();
  });

  it("menukar kode PKCE lalu menuju halaman tujuan", async () => {
    mocks.exchange.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest(`${BASE}/auth/callback?code=abc&next=/reset-password`),
    );

    expect(response.headers.get("location")).toBe(`${BASE}/reset-password`);
  });

  it("menolak tujuan di luar aplikasi", async () => {
    mocks.exchange.mockResolvedValue({ error: null });

    const response = await GET(
      new NextRequest(`${BASE}/auth/callback?code=abc&next=//evil.example`),
    );

    expect(response.headers.get("location")).toBe(`${BASE}/app`);
  });
});
