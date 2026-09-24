/** @format */

// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mocks = vi.hoisted(() => ({
  require: vi.fn(),
  generate: vi.fn(),
  limit: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  rpc: vi.fn(),
  query: vi.fn(),
  eq: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({
  requireLecturerOfClass: mocks.require,
}));
vi.mock("@/server/services/rate-limit", () => ({
  consumeRateLimit: mocks.limit,
  RATE_LIMIT_MESSAGE: { quick_setup: "Terlalu banyak draf." },
}));
vi.mock("@/server/ai/quick-setup", () => ({
  generateSixUnitDraft: mocks.generate,
  QUICK_SETUP_MESSAGE: { invalid_output: "Keluaran tidak valid." },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mocks.rpc,
    from: (table: string) => {
      let operation = "select";
      const chain = {
        select: () => chain,
        eq: (...args: unknown[]) => {
          mocks.eq(...args);
          return chain;
        },
        is: () => chain,
        insert: (value: unknown) => {
          operation = "insert";
          mocks.insert(table, value);
          return chain;
        },
        update: (value: unknown) => {
          operation = "update";
          mocks.update(table, value);
          return chain;
        },
        single: () => mocks.query(table, operation),
        maybeSingle: () => mocks.query(table, operation),
      };
      return chain;
    },
  }),
}));

import {
  generateUnitPlanAction,
  saveUnitPlanAction,
  applyUnitPlanAction,
} from "@/actions/courses/unit-plan";
import { fakeProvider } from "@/server/ai/fake-provider";
import { unitPlanSchema } from "@/lib/ai/unit-plan";
import { AuthorizationError } from "@/lib/errors";

const classId = "11111111-1111-4111-8111-111111111111";
const moduleId = "22222222-2222-4222-8222-222222222222";
const resourceId = "33333333-3333-4333-8333-333333333333";
const draftId = "44444444-4444-4444-8444-444444444444";
const expectedUpdatedAt = "2026-09-25T00:00:00+00:00";
const sourceText =
  "Partisipasi warga harus didukung bukti yang dapat diverifikasi.";
const plan = unitPlanSchema.parse(
  JSON.parse(
    (
      await fakeProvider.generateStructured({
        systemInstruction: "",
        prompt: `=== RENCANA ENAM UNIT ===\n=== ISI DOKUMEN ===\n${sourceText}\n=== AKHIR DOKUMEN ===`,
        schema: {},
      })
    ).text,
  ),
);
const provenance = {
  moduleId,
  moduleTitle: "Pertemuan 1",
  resourceId,
  resourceTitle: "Materi",
  checksum: null,
  extractedAt: expectedUpdatedAt,
  sourceTextHash: createHash("sha256").update(sourceText).digest("hex"),
  instruction: null,
  truncated: false,
  model: "fake",
  promptVersion: 1,
};
const meta = { ...provenance, kind: "six_unit_plan" };
const identity = { classId, draftId, expectedUpdatedAt };
function form() {
  const data = new FormData();
  Object.entries({ classId, moduleId, resourceId }).forEach(([key, value]) =>
    data.set(key, value),
  );
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.require.mockResolvedValue({ id: "lecturer" });
  mocks.limit.mockResolvedValue(true);
  mocks.generate.mockResolvedValue({ ok: true, draft: plan, provenance });
  mocks.query.mockImplementation(async (table: string, operation: string) => ({
    data:
      operation === "insert"
        ? { id: draftId }
        : operation === "update"
          ? { updated_at: "2026-09-25T00:01:00+00:00" }
          : table === "learning_resources"
            ? { extracted_text: sourceText }
            : {
                id: draftId,
                source_resource_id: resourceId,
                instruction: meta,
              },
    error: null,
  }));
  mocks.rpc.mockResolvedValue({
    data: { unitIds: Array(6).fill(resourceId), alreadyApplied: false },
    error: null,
  });
});
afterEach(() => vi.restoreAllMocks());

describe("aksi enam unit", () => {
  it("hanya menyimpan draf saat generate dan mengarahkan ke tinjauan", async () => {
    const result = await generateUnitPlanAction({}, form());
    expect(result.redirectTo).toBe(
      `/app/lecturer/classes/${classId}/builder/drafts/${draftId}`,
    );
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith(
      "ai_material_drafts",
      expect.objectContaining({
        grounding: "source_bound",
        instruction: expect.objectContaining({
          kind: "six_unit_plan",
          moduleId,
          sourceTextHash: provenance.sourceTextHash,
        }),
      }),
    );
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("menolak pertemuan kosong sebelum AI dipanggil", async () => {
    const data = form();
    data.delete("moduleId");
    expect(
      (await generateUnitPlanAction({}, data)).fieldErrors?.moduleId,
    ).toBeTruthy();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("menolak dosen asing sebelum penggunaan kuota dan penulisan", async () => {
    mocks.require.mockRejectedValue(new AuthorizationError());
    expect((await generateUnitPlanAction({}, form())).error).toBeTruthy();
    expect(mocks.limit).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("menahan panggilan AI saat kuota terlampaui", async () => {
    mocks.limit.mockResolvedValue(false);
    expect((await generateUnitPlanAction({}, form())).error).toContain(
      "Terlalu banyak",
    );
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("gagal menyimpan bukan sukses palsu", async () => {
    mocks.query.mockResolvedValue({
      data: null,
      error: { code: "42501", message: "denied" },
    });
    expect((await generateUnitPlanAction({}, form())).ok).not.toBe(true);
  });
  it("suntingan dibatasi kelas, status, dan versi terakhir", async () => {
    expect(await saveUnitPlanAction({ ...identity, plan })).toHaveProperty(
      "ok",
      true,
    );
    expect(mocks.eq).toHaveBeenCalledWith("class_id", classId);
    expect(mocks.eq).toHaveBeenCalledWith("updated_at", expectedUpdatedAt);
    expect(mocks.eq).toHaveBeenCalledWith("status", "draft");
  });
  it("suntingan yang kehilangan unit ditolak", async () => {
    expect(
      await saveUnitPlanAction({ ...identity, plan: { ...plan, units: [] } }),
    ).toHaveProperty("error");
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("perubahan sumber menahan penyimpanan", async () => {
    mocks.query.mockImplementation(async (table: string) => ({
      data:
        table === "learning_resources"
          ? { extracted_text: "Sumber telah diubah" }
          : { id: draftId, source_resource_id: resourceId, instruction: meta },
      error: null,
    }));
    const result = await saveUnitPlanAction({ ...identity, plan });
    expect(result).toHaveProperty(
      "error",
      expect.stringContaining("sumber berubah"),
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("penerapan hanya memanggil satu RPC dengan identitas versi tersimpan", async () => {
    expect(await applyUnitPlanAction(identity)).toHaveProperty("ok", true);
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("apply_ai_unit_plan", {
      p_draft_id: draftId,
      p_expected_updated_at: expectedUpdatedAt,
    });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("kelas tidak sesuai tidak mencapai RPC", async () => {
    mocks.query.mockResolvedValue({ data: null, error: null });
    expect(await applyUnitPlanAction(identity)).toHaveProperty("error");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("versi tinjauan lama memberi pesan yang dapat ditindaklanjuti", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { message: "stale_draft", code: "23001" },
    });
    expect(await applyUnitPlanAction(identity)).toHaveProperty(
      "error",
      expect.stringContaining("Muat ulang"),
    );
  });
});
