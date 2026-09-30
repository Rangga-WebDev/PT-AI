/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ require: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/auth", () => ({ requireRoleOrThrow: mocks.require }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: mocks.rpc }),
}));

import { getPreliminaryRespondentAction } from "@/actions/research/preliminary-study";
import { AuthorizationError } from "@/lib/errors";

const respondentId = "a3000000-0000-4000-8000-000000000001";
const detail = {
  id: respondentId,
  datasetId: "9137dad8-a5f0-41ab-b7a3-c957011aedc7",
  code: "U01",
  category: "Rendah",
  total: 3,
  maxTotal: 8,
  maxItemScore: 4,
  score: 37.5,
  sourceFile: "uji.csv",
  sourceSheet: "Jawaban Uji",
  sourceRow: 2,
  answers: [
    { itemNumber: 1, dimension: "interpretation", score: 1, answer: "a" },
    { itemNumber: 2, dimension: "analysis", score: 2, answer: "" },
  ],
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.require.mockReset().mockResolvedValue({ id: "admin" });
  mocks.rpc.mockReset();
});

describe("getPreliminaryRespondentAction", () => {
  it("hanya admin yang boleh membuka jawaban", async () => {
    mocks.require.mockRejectedValue(new AuthorizationError());

    const result = await getPreliminaryRespondentAction(respondentId);

    expect(mocks.require).toHaveBeenCalledWith("admin");
    expect(result.ok).toBe(false);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("menolak id yang bukan UUID sebelum menyentuh basis data", async () => {
    expect(await getPreliminaryRespondentAction("M01")).toEqual({
      ok: false,
      error: "Responden tidak valid.",
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("mengembalikan jawaban dari RPC teraudit", async () => {
    mocks.rpc.mockResolvedValue({ data: detail, error: null });

    expect(await getPreliminaryRespondentAction(respondentId)).toEqual({
      ok: true,
      data: detail,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("preliminary_study_respondent", {
      p_respondent_id: respondentId,
    });
  });

  it("tidak meneruskan detail galat basis data", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "forbidden", details: "rahasia" },
    });

    const result = await getPreliminaryRespondentAction(respondentId);

    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("forbidden");
    expect(JSON.stringify(result)).not.toContain("rahasia");
  });

  it("menolak bentuk data yang tidak sesuai kontrak", async () => {
    mocks.rpc.mockResolvedValue({ data: { code: "U01" }, error: null });

    expect(await getPreliminaryRespondentAction(respondentId)).toEqual({
      ok: false,
      error: "Jawaban responden tidak dapat dimuat. Coba lagi.",
    });
  });
});
