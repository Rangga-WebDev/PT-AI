/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: (name: string, args: unknown) => rpc(name, args),
  }),
}));

const { consumeRateLimit, RATE_LIMITS, RATE_LIMIT_MESSAGE } =
  await import("@/server/services/rate-limit");

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: true, error: null });
});

describe("pembatas laju", () => {
  it("memakai batas dan jendela sesuai aksinya", async () => {
    await consumeRateLimit("material_upload");

    expect(rpc).toHaveBeenCalledWith("consume_rate_limit", {
      p_action: "material_upload",
      p_limit: RATE_LIMITS.material_upload.limit,
      p_window_seconds: RATE_LIMITS.material_upload.windowSeconds,
    });
  });

  it("mengizinkan ketika masih di bawah batas", async () => {
    expect(await consumeRateLimit("ai_review")).toBe(true);
  });

  it("menolak ketika batas terlampaui", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    expect(await consumeRateLimit("quick_setup")).toBe(false);
  });

  it("tidak menghalangi pekerjaan sah ketika penghitungnya gagal", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { code: "57014" } });

    expect(await consumeRateLimit("ai_review")).toBe(true);
    spy.mockRestore();
  });

  it("tidak membocorkan pesan galat basis data ke log", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied for mahasiswa@x.id" },
    });

    await consumeRateLimit("ai_review");

    expect(JSON.stringify(spy.mock.calls)).not.toContain("mahasiswa@x.id");
    spy.mockRestore();
  });

  it("menyediakan pesan manusiawi untuk setiap aksi", () => {
    for (const action of Object.keys(
      RATE_LIMITS,
    ) as (keyof typeof RATE_LIMITS)[]) {
      expect(RATE_LIMIT_MESSAGE[action].length).toBeGreaterThan(20);
      expect(RATE_LIMIT_MESSAGE[action]).not.toContain("rate");
    }
  });

  it("memakai batas per jam yang wajar, bukan tanpa batas", () => {
    for (const config of Object.values(RATE_LIMITS)) {
      expect(config.limit).toBeGreaterThan(0);
      expect(config.limit).toBeLessThanOrEqual(100);
      expect(config.windowSeconds).toBeGreaterThanOrEqual(60);
    }
  });
});
