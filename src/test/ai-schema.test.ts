/** @format */

import { describe, expect, it } from "vitest";

import { normalizeVector, vectorNorm } from "@/lib/ai/vector";
import {
  AI_FEEDBACK_KINDS,
  aiResponseSchema,
  EXPECTED_KINDS,
} from "@/server/ai/schemas";

describe("Normalisasi vektor embedding", () => {
  it("menghasilkan norma L2 sama dengan satu", () => {
    const raw = Array.from({ length: 1536 }, (_, i) => Math.sin(i + 1));
    expect(vectorNorm(raw)).not.toBeCloseTo(1, 3);

    const normalized = normalizeVector(raw);
    expect(vectorNorm(normalized)).toBeCloseTo(1, 6);
    expect(normalized).toHaveLength(1536);
  });

  it("membiarkan vektor nol apa adanya alih-alih membaginya dengan nol", () => {
    const zero = [0, 0, 0];
    expect(normalizeVector(zero)).toEqual(zero);
  });
});

describe("Skema keluaran AI (dasar status schema_rejected)", () => {
  const valid = {
    items: [
      {
        kind: "guiding_question",
        title: "Bukti apa yang menopang klaim Anda?",
        body: "Tunjukkan bagian sumber yang Anda pakai beserta keterbatasannya.",
        citations: [],
      },
    ],
  };

  it("menerima keluaran yang sesuai bentuk", () => {
    expect(aiResponseSchema.safeParse(valid).success).toBe(true);
  });

  it("menolak jenis butir di luar daftar yang diizinkan", () => {
    const result = aiResponseSchema.safeParse({
      items: [{ ...valid.items[0], kind: "jawaban_final" }],
    });

    expect(result.success).toBe(false);
  });

  it("menolak keluaran tanpa satu pun butir", () => {
    expect(aiResponseSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("menolak butir dengan isi terlalu pendek untuk ditindaklanjuti", () => {
    const result = aiResponseSchema.safeParse({
      items: [{ ...valid.items[0], body: "ya" }],
    });

    expect(result.success).toBe(false);
  });

  it("membatasi jumlah butir agar panel tidak membanjiri mahasiswa", () => {
    const many = Array.from({ length: 7 }, () => valid.items[0]);
    expect(aiResponseSchema.safeParse({ items: many }).success).toBe(false);
  });

  it("mengisi citations kosong ketika tidak disertakan", () => {
    const result = aiResponseSchema.safeParse({
      items: [
        {
          kind: "hint",
          title: "Periksa asumsi Anda",
          body: "Pastikan asumsi yang Anda pakai dinyatakan terbuka.",
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.items[0]?.citations).toEqual([]);
    }
  });
});

describe("Pemetaan fungsi AI", () => {
  it("mencakup keenam fungsi yang dikunci enum database", () => {
    expect(Object.keys(EXPECTED_KINDS).sort()).toEqual(
      [
        "counter_argument",
        "error_classification",
        "guiding_questions",
        "hint",
        "learning_path",
        "rubric_feedback",
      ].sort(),
    );
  });

  it("hanya memakai jenis butir yang dikenal skema", () => {
    for (const kinds of Object.values(EXPECTED_KINDS)) {
      for (const kind of kinds) {
        expect(AI_FEEDBACK_KINDS).toContain(kind);
      }
    }
  });
});
