/** @format */

import { describe, expect, it } from "vitest";

import { diffWords, summarizeDiff } from "@/lib/revision/diff";
import { evaluateProcessCriteria } from "@/lib/mastery/access";
import {
  reflectionSchema,
  submitRevisionSchema,
} from "@/lib/validation/revision";

const VALID_ATTEMPT_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const VALID_ACTIVITY_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const VALID_SUBMISSION_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const VALID_FEEDBACK_ID = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

function rebuild(before: string, after: string) {
  const segments = diffWords(before, after);
  return {
    before: segments
      .filter((segment) => segment.op !== "insert")
      .map((segment) => segment.text)
      .join(""),
    after: segments
      .filter((segment) => segment.op !== "delete")
      .map((segment) => segment.text)
      .join(""),
  };
}

describe("diffWords", () => {
  it("menyusun ulang kedua teks tanpa kehilangan karakter", () => {
    const before = "Partisipasi warga belum bermakna karena kehadiran rendah.";
    const after =
      "Partisipasi warga belum bermakna karena hanya 24 dari 12.000 warga hadir.";

    expect(rebuild(before, after)).toEqual({ before, after });
  });

  it("menandai kata yang ditambahkan dan dihapus", () => {
    const segments = diffWords("konsultasi formal", "konsultasi substantif");

    expect(segments.some((s) => s.op === "delete" && s.text === "formal")).toBe(
      true,
    );
    expect(
      segments.some((s) => s.op === "insert" && s.text === "substantif"),
    ).toBe(true);
  });

  it("tidak melaporkan perubahan bila teks identik", () => {
    const summary = summarizeDiff(diffWords("teks sama", "teks sama"));

    expect(summary.addedWords).toBe(0);
    expect(summary.removedWords).toBe(0);
    expect(summary.changeRatio).toBe(0);
  });

  it("menghitung rasio perubahan pada penulisan ulang total", () => {
    const summary = summarizeDiff(diffWords("satu dua", "tiga empat"));

    expect(summary.keptWords).toBe(0);
    expect(summary.changeRatio).toBe(1);
  });

  it("menangani teks awal kosong", () => {
    const summary = summarizeDiff(diffWords("", "kalimat baru"));

    expect(summary.addedWords).toBe(2);
    expect(summary.removedWords).toBe(0);
  });
});

describe("submitRevisionSchema", () => {
  const base = {
    attemptId: VALID_ATTEMPT_ID,
    content:
      "Kehadiran 24 dari 12.000 warga tidak cukup untuk menyebut konsultasi ini bermakna.",
    clientSubmissionId: VALID_SUBMISSION_ID,
  };

  it("menolak alasan yang terlalu pendek", () => {
    const result = submitRevisionSchema.safeParse({
      ...base,
      reason: { reasonType: "self_review", detail: "singkat" },
    });

    expect(result.success).toBe(false);
  });

  it("menolak sikap terhadap saran AI tanpa menunjuk sarannya", () => {
    const result = submitRevisionSchema.safeParse({
      ...base,
      reason: {
        reasonType: "ai_suggestion_accepted",
        detail: "Saya menambahkan angka kehadiran sesuai pertanyaan pemandu.",
      },
    });

    expect(result.success).toBe(false);
  });

  it("menerima sikap terhadap saran AI yang menunjuk sarannya", () => {
    const result = submitRevisionSchema.safeParse({
      ...base,
      reason: {
        reasonType: "ai_suggestion_rejected",
        detail: "Saran itu meminta kesimpulan tanpa bukti, jadi saya tolak.",
        aiFeedbackId: VALID_FEEDBACK_ID,
      },
    });

    expect(result.success).toBe(true);
  });

  it("menolak revisi yang terlalu pendek", () => {
    const result = submitRevisionSchema.safeParse({
      ...base,
      content: "pendek",
      reason: {
        reasonType: "self_review",
        detail: "Memperjelas kalimat kesimpulan.",
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("reflectionSchema", () => {
  const filled = Object.fromEntries(
    [
      "initialSummary",
      "feedbackSummary",
      "verifiedSourcesSummary",
      "finalSummary",
      "changeReason",
      "aiAccepted",
      "aiRejected",
      "biasFound",
      "nextStrategy",
    ].map((key) => [key, "Isian refleksi yang cukup panjang."]),
  );

  it("menerima sembilan unsur yang terisi", () => {
    const result = reflectionSchema.safeParse({
      activityId: VALID_ACTIVITY_ID,
      attemptId: VALID_ATTEMPT_ID,
      ...filled,
    });

    expect(result.success).toBe(true);
  });

  it("menolak bila satu unsur dikosongkan", () => {
    const result = reflectionSchema.safeParse({
      activityId: VALID_ACTIVITY_ID,
      attemptId: VALID_ATTEMPT_ID,
      ...filled,
      biasFound: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("evaluateProcessCriteria — refleksi", () => {
  const base = {
    hasBaseline: true,
    requiredSourceCount: 0,
    verifiedSourceCount: 0,
    pendingAiFeedbackCount: 0,
  };

  it("menandai refleksi belum lengkap tanpa memblokir tahap", () => {
    const { criteria, complete } = evaluateProcessCriteria(base);

    expect(criteria.find((item) => item.key === "reflection")?.met).toBe(false);
    expect(complete).toBe(false);
  });

  it("menganggap proses lengkap setelah refleksi tersimpan", () => {
    const { complete } = evaluateProcessCriteria({
      ...base,
      hasReflection: true,
    });

    expect(complete).toBe(true);
  });
});
