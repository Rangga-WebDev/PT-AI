/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  proposeOutcome,
  summarizeSuggestion,
} from "@/lib/assessment/bulk-review";

const levels = [0, 1, 2, 3, 4].map((score) => ({ score }));
const CRITERIA = [
  { id: "a", dimension: "analysis" as const, weight: 1, levels },
  { id: "b", dimension: "evaluation" as const, weight: 1, levels },
];

const entry = (
  criterionId: string,
  suggestedScore: number | null,
  insufficientEvidence = false,
) => ({
  criterionId,
  suggestedScore,
  confidence: "medium" as const,
  evidence: [],
  rationale: "Alasan usulan yang cukup panjang.",
  insufficientEvidence,
});

describe("summarizeSuggestion", () => {
  it("menghitung nilai rubrik dari level usulan", () => {
    const summary = summarizeSuggestion(CRITERIA, [
      entry("a", 4),
      entry("b", 2),
    ]);

    expect(summary).toEqual({
      selections: { a: 4, b: 2 },
      score: 75,
      missingCriterionIds: [],
    });
  });

  it("tidak memberi nilai bila ada kriteria tanpa bukti cukup", () => {
    const summary = summarizeSuggestion(CRITERIA, [
      entry("a", 3),
      entry("b", null, true),
    ]);

    expect(summary.score).toBeNull();
    expect(summary.missingCriterionIds).toEqual(["b"]);
  });

  it("tidak memberi nilai bila AI melewatkan kriteria", () => {
    expect(summarizeSuggestion(CRITERIA, [entry("a", 3)]).score).toBeNull();
  });

  it("tidak memberi nilai untuk level di luar rubrik", () => {
    expect(
      summarizeSuggestion(CRITERIA, [entry("a", 3), entry("b", 7)]).score,
    ).toBeNull();
  });
});

describe("proposeOutcome", () => {
  it("memakai ambang dan setengah ambang sebagai batas", () => {
    expect(proposeOutcome(75, 75)).toBe("met");
    expect(proposeOutcome(74.99, 75)).toBe("partially_met");
    expect(proposeOutcome(37.5, 75)).toBe("partially_met");
    expect(proposeOutcome(37.49, 75)).toBe("not_met");
  });
});
