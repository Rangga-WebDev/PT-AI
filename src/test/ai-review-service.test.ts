/** @format */

// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";
import type { AiProvider } from "@/server/ai/types";

const requireLecturerOfClass = vi.fn();
const getAttemptReview = vi.fn();
const listRevisions = vi.fn();
const getReflectionByAttempt = vi.fn();
const listLecturerFeedback = vi.fn();
const auditInsert = vi.fn();
const touchedTables: string[] = [];
const results: Record<string, unknown[]> = {};

vi.mock("server-only", () => ({}));

vi.mock("@/lib/supabase/auth", () => ({
  requireLecturerOfClass: (id: string) => requireLecturerOfClass(id),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      touchedTables.push(`admin:${table}`);
      return { insert: (row: unknown) => auditInsert(row) };
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from(table: string) {
      touchedTables.push(table);
      const chain = {
        select: () => chain,
        eq: () => chain,
        in: () => chain,
        order: () => chain,
        then: (resolve: (value: { data: unknown[] }) => unknown) =>
          resolve({ data: results[table] ?? [] }),
      };
      return chain;
    },
  }),
}));

vi.mock("@/server/repositories/mastery", () => ({
  getAttemptReview: (id: string) => getAttemptReview(id),
}));

vi.mock("@/server/repositories/revisions", () => ({
  listRevisions: (id: string) => listRevisions(id),
  getReflectionByAttempt: (id: string) => getReflectionByAttempt(id),
  listLecturerFeedback: (id: string) => listLecturerFeedback(id),
}));

const { requestReviewSuggestion } = await import("@/server/ai/lecturer-review");
const { setProvider } = await import("@/server/ai/provider");

const ATTEMPT_ID = "11111111-1111-4111-8111-111111111111";
const CLASS_ID = "22222222-2222-4222-8222-222222222222";
const CRITERION_ID = "33333333-3333-4333-8333-333333333333";
const REVISION_ID = "44444444-4444-4444-8444-444444444444";
const SCAFFOLD_ID = "55555555-5555-4555-8555-555555555555";

let promptSeen = "";

function stub(text: string): AiProvider {
  return {
    async generateStructured({ prompt }) {
      promptSeen = prompt;
      return { text, inputTokens: 1, outputTokens: 1, latencyMs: 1 };
    },
    async embed(texts) {
      return texts.map(() => []);
    },
  };
}

function validOutput(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    criteria: [
      {
        criterionId: CRITERION_ID,
        suggestedScore: 50,
        confidence: "medium",
        evidence: [{ artifactId: REVISION_ID, excerpt: "menambahkan asumsi" }],
        rationale: "Mahasiswa menambahkan asumsi pada revisi pertama.",
        insufficientEvidence: false,
      },
    ],
    overallObservations: [],
    suggestedFeedback: "Perkuat penelusuran bukti pada revisi berikutnya.",
    limitations: [],
    ...overrides,
  });
}

function review(overrides: Record<string, unknown> = {}) {
  return {
    attemptId: ATTEMPT_ID,
    content: "Klaim utamanya adalah kebebasan berpendapat.",
    submittedAt: "2026-09-01T09:14:00.000Z",
    studentId: "student-1",
    studentName: "Mahasiswa Uji",
    studentIdentifier: "DEV-MHS-001",
    activityId: "activity-1",
    activityTitle: "Analisis klaim",
    activityPrompt: "Uraikan klaim utama.",
    stageTitle: "Analisis",
    stageSequence: 2,
    unitTitle: "Unit 1",
    classId: CLASS_ID,
    className: "PKN A",
    rubric: {
      id: "rubric-1",
      title: "Rubrik berpikir kritis",
      criteria: [
        {
          id: CRITERION_ID,
          code: "A1",
          description: "Mengidentifikasi klaim dan asumsi.",
          dimension: "analysis",
          weight: 2,
          levels: [
            {
              label: "Belum tampak",
              descriptor: "Tidak tampak sama sekali.",
              score: 0,
            },
            {
              label: "Berkembang",
              descriptor: "Sebagian tampak.",
              score: 50,
            },
          ],
        },
      ],
    },
    existingMastery: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  touchedTables.length = 0;
  promptSeen = "";
  for (const key of Object.keys(results)) delete results[key];

  requireLecturerOfClass.mockResolvedValue({ id: "lecturer" });
  getAttemptReview.mockResolvedValue(review());
  listRevisions.mockResolvedValue([
    {
      id: REVISION_ID,
      revisionNumber: 1,
      content: "Saya menambahkan asumsi yang belum diperiksa.",
      submittedAt: "2026-09-01T09:34:00.000Z",
      reasons: [],
    },
  ]);
  getReflectionByAttempt.mockResolvedValue(null);
  listLecturerFeedback.mockResolvedValue([]);
  auditInsert.mockResolvedValue({ error: null });

  results["ai_feedback"] = [
    {
      id: SCAFFOLD_ID,
      kind: "hint",
      title: "Petunjuk",
      body: "Coba periksa asumsi di balik klaim itu.",
      ai_interactions: { attempt_id: ATTEMPT_ID },
    },
  ];

  setProvider(stub(validOutput()));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  setProvider(null);
  vi.restoreAllMocks();
});

describe("otorisasi", () => {
  it("menolak dosen di luar kelas sebelum bukti dikumpulkan", async () => {
    requireLecturerOfClass.mockRejectedValue(new AuthorizationError());

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "forbidden" });
    expect(listRevisions).not.toHaveBeenCalled();
    expect(promptSeen).toBe("");
  });

  it("menolak pekerjaan yang tidak terlihat lewat sesi", async () => {
    getAttemptReview.mockResolvedValue(null);

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "attempt_not_found" });
    expect(requireLecturerOfClass).not.toHaveBeenCalled();
  });

  it("memeriksa kelas yang berasal dari pekerjaan itu sendiri", async () => {
    await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(requireLecturerOfClass).toHaveBeenCalledWith(CLASS_ID);
  });
});

describe("rubrik sebagai dasar", () => {
  it("menolak aktivitas tanpa rubrik", async () => {
    getAttemptReview.mockResolvedValue(review({ rubric: null }));

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "no_rubric" });
    expect(promptSeen).toBe("");
  });

  it("menolak rubrik tanpa kriteria", async () => {
    getAttemptReview.mockResolvedValue(
      review({ rubric: { id: "r", title: "Kosong", criteria: [] } }),
    );

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "no_rubric" });
  });

  it("mengirim deskriptor rubrik beserta skor yang sah", async () => {
    await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(promptSeen).toContain("Rubrik berpikir kritis");
    expect(promptSeen).toContain("skor 50 (Berkembang): Sebagian tampak.");
    expect(promptSeen).toContain(`criterionId: ${CRITERION_ID}`);
  });
});

describe("pemisahan karya mahasiswa dan bantuan AI", () => {
  it("menempatkan bantuan AI di bagiannya sendiri", async () => {
    await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    const student = promptSeen.split("=== KARYA MAHASISWA ===")[1] ?? "";
    const studentOnly = student.split("=== BANTUAN AI")[0] ?? "";
    const scaffolding = promptSeen.split("=== BANTUAN AI")[1] ?? "";

    expect(studentOnly).toContain(REVISION_ID);
    expect(studentOnly).not.toContain(SCAFFOLD_ID);
    expect(scaffolding).toContain(SCAFFOLD_ID);
  });

  // Larangan ini yang mencegah mahasiswa diberi kredit atas gagasan AI.
  it("menyatakan larangan memberi kredit atas bantuan AI", async () => {
    const { REVIEW_SYSTEM_INSTRUCTION } =
      await import("@/server/ai/review-prompt");
    const instruction = REVIEW_SYSTEM_INSTRUCTION.replace(/\s+/g, " ");

    expect(instruction).toContain("BUKAN karya mahasiswa");
    expect(instruction).toContain("Jangan menduga pekerjaan yang tidak ada");
    expect(instruction).toContain("Dosen yang memutuskan");
  });
});

describe("penolakan keluaran", () => {
  it("menolak keluaran yang bukan JSON", async () => {
    setProvider(stub("bukan json"));

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "invalid_output" });
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it("menolak keluaran yang tidak lolos skema", async () => {
    setProvider(stub(JSON.stringify({ criteria: [] })));

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "invalid_output" });
  });

  // Bukti karangan membatalkan seluruh usulan.
  it("menolak kutipan artefak yang tidak ada di paket", async () => {
    setProvider(
      stub(
        validOutput({
          criteria: [
            {
              criterionId: CRITERION_ID,
              suggestedScore: 50,
              confidence: "high",
              evidence: [
                { artifactId: "artefak-karangan", excerpt: "tidak ada" },
              ],
              rationale: "Mengutip bukti yang tidak pernah ada.",
              insufficientEvidence: false,
            },
          ],
        }),
      ),
    );

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "untraceable_citation" });
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it("menolak skor di luar level rubrik", async () => {
    setProvider(
      stub(
        validOutput({
          criteria: [
            {
              criterionId: CRITERION_ID,
              suggestedScore: 87,
              confidence: "high",
              evidence: [],
              rationale: "Skor yang tidak ada pada level mana pun.",
              insufficientEvidence: false,
            },
          ],
        }),
      ),
    );

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "untraceable_citation" });
  });

  it("melaporkan penyedia yang gagal tanpa membocorkan pesannya", async () => {
    setProvider({
      async generateStructured() {
        throw new Error("GEMINI_API_KEY bocor di sini");
      },
      async embed() {
        return [];
      },
    });

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "provider_error" });
  });
});

describe("wewenang nilai akhir", () => {
  it("tidak menulis nilai, ketuntasan, maupun percabangan", async () => {
    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result.ok).toBe(true);
    for (const table of [
      "mastery_results",
      "critical_thinking_scores",
      "branching_decisions",
      "assessment_scores",
      "feedback_records",
    ]) {
      expect(touchedTables).not.toContain(table);
    }
  });

  // `ai_interactions` menjadi sumber variabel penelitian penggunaan AI oleh
  // mahasiswa; panggilan dosen tidak boleh mencemarinya.
  it("tidak menulis ke ai_interactions", async () => {
    await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(touchedTables).not.toContain("ai_interactions");
    expect(touchedTables).not.toContain("admin:ai_interactions");
  });

  it("mencatat jejak usulan ke audit_logs", async () => {
    await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "ai_review_suggestion",
        subject_table: "attempts",
        subject_id: ATTEMPT_ID,
        actor_id: "lecturer",
      }),
    );

    const row = auditInsert.mock.calls[0]![0] as {
      after: Record<string, unknown>;
    };
    expect(row.after["evidenceIds"]).toContain(REVISION_ID);
    expect(row.after["rubricCriteriaIds"]).toContain(CRITERION_ID);
  });

  it("tetap mengembalikan usulan meski pencatatan gagal", async () => {
    auditInsert.mockRejectedValue(new Error("audit down"));

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result.ok).toBe(true);
  });
});

describe("bukti yang belum cukup", () => {
  // Artefak milik pekerjaan lain tidak pernah masuk paket, sehingga kutipan
  // kepadanya ditolak seperti kutipan karangan.
  it("menolak kutipan ke revisi yang bukan milik pekerjaan ini", async () => {
    listRevisions.mockResolvedValue([]);

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result).toEqual({ ok: false, reason: "untraceable_citation" });
  });

  it("menerima usulan yang menyatakan bukti belum cukup", async () => {
    setProvider(
      stub(
        validOutput({
          criteria: [
            {
              criterionId: CRITERION_ID,
              suggestedScore: null,
              confidence: "low",
              evidence: [],
              rationale: "Bukti belum cukup untuk menilai dimensi ini.",
              insufficientEvidence: true,
            },
          ],
        }),
      ),
    );

    const result = await requestReviewSuggestion(ATTEMPT_ID, "lecturer");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.suggestion.criteria[0]?.suggestedScore).toBeNull();
  });
});
