/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  isCoherent,
  scaffoldingArtifacts,
  studentArtifacts,
  validateSuggestion,
  type EvidencePacket,
} from "@/lib/ai/evidence-packet";
import { reviewSuggestionSchema } from "@/lib/ai/review-schema";

const PACKET: EvidencePacket = {
  attemptId: "att-1",
  activityTitle: "Analisis klaim",
  activityPrompt: "Uraikan klaim utama.",
  stageTitle: "Analisis",
  unitTitle: "Unit 1",
  rubricTitle: "Rubrik berpikir kritis",
  criteria: [
    {
      id: "crit-1",
      code: "A1",
      description: "Mengidentifikasi klaim dan asumsi.",
      dimension: "analysis",
      weight: 2,
      levels: [
        { label: "Belum", descriptor: "Tidak menunjukkan.", score: 0 },
        { label: "Berkembang", descriptor: "Sebagian tampak.", score: 50 },
        { label: "Baik", descriptor: "Konsisten tampak.", score: 100 },
      ],
    },
    {
      id: "crit-2",
      code: "E1",
      description: "Menimbang kecukupan bukti.",
      dimension: "evaluation",
      weight: 1,
      levels: [],
    },
  ],
  artifacts: [
    {
      id: "att-1",
      kind: "initial_response",
      label: "Respons awal",
      content: "Klaim utamanya adalah ...",
      studentAuthored: true,
    },
    {
      id: "rev-1",
      kind: "revision",
      label: "Revisi 1",
      content: "Saya menambahkan asumsi yang belum diperiksa.",
      studentAuthored: true,
    },
    {
      id: "ai-1",
      kind: "ai_scaffolding",
      label: "Bantuan AI: Petunjuk",
      content: "Coba periksa asumsi di balik klaim itu.",
      studentAuthored: false,
    },
  ],
};

function suggestion(overrides: Record<string, unknown> = {}) {
  return reviewSuggestionSchema.parse({
    criteria: [
      {
        criterionId: "crit-1",
        suggestedScore: 50,
        confidence: "medium",
        evidence: [{ artifactId: "rev-1", excerpt: "menambahkan asumsi" }],
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

describe("validasi kutipan bukti", () => {
  it("menerima usulan yang seluruh kutipannya ada", () => {
    const result = validateSuggestion(PACKET, suggestion());

    expect(result.ok).toBe(true);
  });

  // Kutipan karangan membatalkan seluruh hasil, bukan hanya butirnya:
  // menyaring diam-diam menyisakan penilaian yang alasannya sudah dibuang.
  it("menolak kutipan artefak yang tidak ada", () => {
    const result = validateSuggestion(
      PACKET,
      suggestion({
        criteria: [
          {
            criterionId: "crit-1",
            suggestedScore: 50,
            confidence: "high",
            evidence: [{ artifactId: "rev-99", excerpt: "karangan" }],
            rationale: "Mengutip revisi yang tidak pernah ada.",
            insufficientEvidence: false,
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejections).toContainEqual({
      kind: "unknown_artifact",
      id: "rev-99",
    });
  });

  it("menolak kriteria di luar rubrik", () => {
    const result = validateSuggestion(
      PACKET,
      suggestion({
        criteria: [
          {
            criterionId: "crit-asing",
            suggestedScore: 50,
            confidence: "low",
            evidence: [],
            rationale: "Kriteria yang tidak ada di rubrik.",
            insufficientEvidence: false,
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejections[0]).toEqual({
      kind: "unknown_criterion",
      id: "crit-asing",
    });
  });

  // Skor hanya sah bila memang ada di deskriptor rubrik.
  it("menolak skor di luar level rubrik", () => {
    const result = validateSuggestion(
      PACKET,
      suggestion({
        criteria: [
          {
            criterionId: "crit-1",
            suggestedScore: 73,
            confidence: "high",
            evidence: [],
            rationale: "Skor yang tidak ada pada level mana pun.",
            insufficientEvidence: false,
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejections[0]).toMatchObject({
      kind: "score_outside_rubric",
      score: 73,
    });
  });

  it("menolak skor pada kriteria yang belum punya deskriptor", () => {
    const result = validateSuggestion(
      PACKET,
      suggestion({
        criteria: [
          {
            criterionId: "crit-2",
            suggestedScore: 100,
            confidence: "high",
            evidence: [],
            rationale: "Kriteria ini belum punya level rubrik.",
            insufficientEvidence: false,
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejections[0]).toEqual({
      kind: "score_without_levels",
      id: "crit-2",
    });
  });

  it("menerima kriteria tanpa deskriptor bila skornya null", () => {
    const result = validateSuggestion(
      PACKET,
      suggestion({
        criteria: [
          {
            criterionId: "crit-2",
            suggestedScore: null,
            confidence: "low",
            evidence: [],
            rationale: "Rubrik belum memuat deskriptor untuk kriteria ini.",
            insufficientEvidence: true,
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
  });

  it("menolak kriteria yang dinilai dua kali", () => {
    const entry = {
      criterionId: "crit-1",
      suggestedScore: 0,
      confidence: "low" as const,
      evidence: [],
      rationale: "Dinilai berulang pada keluaran yang sama.",
      insufficientEvidence: false,
    };

    const result = validateSuggestion(
      PACKET,
      suggestion({ criteria: [entry, entry] }),
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.rejections).toContainEqual({
      kind: "duplicate_criterion",
      id: "crit-1",
    });
  });
});

describe("keluaran yang tidak sesuai skema", () => {
  it("menolak dimensi atau bentuk yang tidak dikenal", () => {
    expect(reviewSuggestionSchema.safeParse({ criteria: [] }).success).toBe(
      false,
    );

    expect(
      reviewSuggestionSchema.safeParse({
        criteria: [
          {
            criterionId: "crit-1",
            suggestedScore: 50,
            confidence: "sangat yakin",
            evidence: [],
            rationale: "Tingkat keyakinan di luar yang dikenal.",
            insufficientEvidence: false,
          },
        ],
        suggestedFeedback: "Catatan.",
      }).success,
    ).toBe(false);
  });

  it("menolak alasan yang kosong", () => {
    expect(
      reviewSuggestionSchema.safeParse({
        criteria: [
          {
            criterionId: "crit-1",
            suggestedScore: null,
            confidence: "low",
            evidence: [],
            rationale: "",
            insufficientEvidence: true,
          },
        ],
        suggestedFeedback: "Catatan yang cukup panjang.",
      }).success,
    ).toBe(false);
  });
});

describe("pemisahan karya mahasiswa dari bantuan AI", () => {
  it("menandai bantuan AI sebagai bukan karya mahasiswa", () => {
    expect(studentArtifacts(PACKET).map((item) => item.id)).toEqual([
      "att-1",
      "rev-1",
    ]);
    expect(scaffoldingArtifacts(PACKET).map((item) => item.id)).toEqual([
      "ai-1",
    ]);
  });

  // Butir yang mengaku kurang bukti tidak boleh sekaligus membawa skor.
  it("menolak butir yang tidak konsisten dengan dirinya sendiri", () => {
    expect(
      isCoherent({
        criterionId: "crit-1",
        suggestedScore: 100,
        confidence: "high",
        evidence: [],
        rationale: "Mengaku kurang bukti tetapi tetap memberi skor.",
        insufficientEvidence: true,
      }),
    ).toBe(false);

    expect(
      isCoherent({
        criterionId: "crit-1",
        suggestedScore: null,
        confidence: "low",
        evidence: [],
        rationale: "Bukti belum cukup.",
        insufficientEvidence: true,
      }),
    ).toBe(true);
  });
});
