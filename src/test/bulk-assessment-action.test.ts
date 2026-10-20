/** @format */

// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  role: vi.fn(),
  revalidate: vi.fn(),
  auditInsert: vi.fn(),
  masteryInsert: vi.fn(),
  attempts: {} as Record<string, unknown>,
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("@/lib/supabase/auth", () => ({ requireRoleOrThrow: mocks.role }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ insert: mocks.auditInsert }),
  }),
}));
vi.mock("@/server/analytics/events", () => ({
  recordLearningEvent: vi.fn(async () => undefined),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      if (table === "attempts") {
        let id = "";
        const chain = {
          select: () => chain,
          eq: (_column: string, value: string) => {
            id = value;
            return chain;
          },
          maybeSingle: async () => ({ data: mocks.attempts[id] ?? null }),
        };
        return chain;
      }
      return {
        insert: async (row: unknown) => {
          if (table === "mastery_results") mocks.masteryInsert(row);
          return { error: null };
        },
      };
    },
  }),
}));

import { submitBulkAssessmentsAction } from "@/actions/assessment/scoring";

const K1 = "aaaaaaaa-0000-4000-8000-000000000001";
const A1 = "bbbbbbbb-0000-4000-8000-000000000001";
const A2 = "bbbbbbbb-0000-4000-8000-000000000002";

const assessment = (attemptId: string, score = 4) => ({
  attemptId,
  outcome: "met",
  comment: "Analisis sudah runtut dan berbasis bukti.",
  criteriaScores: [{ criterionId: K1, score }],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role.mockResolvedValue({ id: "lecturer-1" });
  mocks.auditInsert.mockResolvedValue({ error: null });
  mocks.attempts = {
    [A1]: {
      activity_id: "activity-1",
      student_id: "student-1",
      activities: {
        rubric_id: "rubric-1",
        rubrics: {
          rubric_criteria: [
            {
              id: K1,
              weight: 1,
              dimension: "analysis",
              rubric_levels: [0, 1, 2, 3, 4].map((score) => ({ score })),
            },
          ],
        },
        learning_stages: {
          learning_units: { modules: { class_id: "class-1" } },
        },
      },
    },
  };
});

describe("submitBulkAssessmentsAction", () => {
  it("menolak permintaan tanpa penilaian", async () => {
    const result = await submitBulkAssessmentsAction([]);

    expect(result.error).toBe("Tidak ada penilaian yang dipilih.");
    expect(mocks.masteryInsert).not.toHaveBeenCalled();
  });

  it("menyimpan tiap butir sebagai keputusan final dosen dan mencatat jejak massal", async () => {
    const result = await submitBulkAssessmentsAction([
      assessment(A1),
      assessment(A2),
    ]);

    expect(result.saved).toEqual([A1]);
    expect(result.failed).toEqual([
      { attemptId: A2, error: "Respons awal tidak ditemukan." },
    ]);
    expect(mocks.masteryInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        evaluator_kind: "lecturer",
        evaluator_id: "lecturer-1",
        outcome: "met",
        score: 100,
        is_final: true,
      }),
    );
    expect(mocks.auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "assessment_bulk_saved",
        actor_id: "lecturer-1",
        after: expect.objectContaining({ attemptIds: [A1], count: 1 }),
      }),
    );
  });

  it("menolak level di luar rubrik tanpa menyimpan apa pun", async () => {
    const result = await submitBulkAssessmentsAction([assessment(A1, 7)]);

    expect(result.saved).toEqual([]);
    expect(result.failed[0]?.attemptId).toBe(A1);
    expect(mocks.masteryInsert).not.toHaveBeenCalled();
    expect(mocks.auditInsert).not.toHaveBeenCalled();
  });
});
