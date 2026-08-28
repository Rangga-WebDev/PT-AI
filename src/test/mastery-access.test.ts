/** @format */

import { describe, expect, it } from "vitest";

import {
  computeStageAccess,
  evaluateProcessCriteria,
  weightedRubricScore,
  type StageInput,
  type StageMastery,
} from "@/lib/mastery/access";

const STAGES: StageInput[] = [
  { stageKey: "interpretation", sequence: 1, isEnabled: true },
  { stageKey: "analysis", sequence: 2, isEnabled: true },
  { stageKey: "evaluation", sequence: 3, isEnabled: true },
];

function mastery(entries: [number, StageMastery][]) {
  return new Map<number, StageMastery>(entries);
}

describe("Penguncian tahap berbasis ketuntasan (LOCK-PED-002, LOCK-PED-008)", () => {
  it("selalu membuka tahap pertama", () => {
    const access = computeStageAccess(STAGES, mastery([]));
    expect(access[0]?.availability).toBe("available");
  });

  it("mengunci tahap berikutnya selama tahap sebelumnya belum dinilai", () => {
    const access = computeStageAccess(STAGES, mastery([]));
    expect(access[1]?.availability).toBe("locked");
    expect(access[2]?.availability).toBe("locked");
  });

  it("membuka tahap berikutnya setelah dosen menilai tuntas", () => {
    const access = computeStageAccess(
      STAGES,
      mastery([
        [1, { outcome: "met", evaluatorKind: "lecturer", isFinal: true }],
      ]),
    );

    expect(access[1]?.availability).toBe("available");
    expect(access[2]?.availability).toBe("locked");
  });

  it("membuka sementara ketika baru ada usulan sistem", () => {
    const access = computeStageAccess(
      STAGES,
      mastery([
        [
          1,
          { outcome: "partially_met", evaluatorKind: "system", isFinal: false },
        ],
      ]),
    );

    expect(access[1]?.availability).toBe("provisional");
    expect(access[1]?.reason).toContain("penilaian dosen");
  });

  it("mengunci kembali ketika dosen menilai belum memenuhi", () => {
    const access = computeStageAccess(
      STAGES,
      mastery([
        [1, { outcome: "not_met", evaluatorKind: "lecturer", isFinal: true }],
      ]),
    );

    expect(access[1]?.availability).toBe("locked");
    expect(access[1]?.reason).toContain("belum memenuhi");
  });

  it("menandai tahap yang dinonaktifkan dosen secara terpisah", () => {
    const access = computeStageAccess(
      [{ stageKey: "interpretation", sequence: 1, isEnabled: false }],
      mastery([]),
    );

    expect(access[0]?.availability).toBe("disabled");
  });

  it("tidak melompati tahap meskipun tahap jauh sudah tuntas", () => {
    const access = computeStageAccess(
      STAGES,
      mastery([
        [2, { outcome: "met", evaluatorKind: "lecturer", isFinal: true }],
      ]),
    );

    // Tahap 2 tuntas tetapi tahap 1 belum, sehingga tahap 2 tetap terkunci.
    expect(access[1]?.availability).toBe("locked");
    expect(access[2]?.availability).toBe("available");
  });
});

describe("Kriteria proses yang boleh dinilai sistem", () => {
  it("menyatakan lengkap ketika seluruh syarat proses terpenuhi", () => {
    const { complete, criteria } = evaluateProcessCriteria({
      hasBaseline: true,
      requiredSourceCount: 2,
      verifiedSourceCount: 2,
      pendingAiFeedbackCount: 0,
      hasReflection: true,
    });

    expect(complete).toBe(true);
    expect(criteria).toHaveLength(4);
  });

  it("menolak selama respons awal belum dikirim", () => {
    const { complete } = evaluateProcessCriteria({
      hasBaseline: false,
      requiredSourceCount: 0,
      verifiedSourceCount: 0,
      pendingAiFeedbackCount: 0,
    });

    expect(complete).toBe(false);
  });

  it("menolak selama masih ada saran AI tanpa sikap", () => {
    const { complete } = evaluateProcessCriteria({
      hasBaseline: true,
      requiredSourceCount: 0,
      verifiedSourceCount: 0,
      pendingAiFeedbackCount: 1,
    });

    expect(complete).toBe(false);
  });

  it("menganggap syarat sumber terpenuhi ketika tidak ada sumber wajib", () => {
    const { complete } = evaluateProcessCriteria({
      hasBaseline: true,
      requiredSourceCount: 0,
      verifiedSourceCount: 0,
      pendingAiFeedbackCount: 0,
      hasReflection: true,
    });

    expect(complete).toBe(true);
  });
});

describe("Skor rubrik berbobot", () => {
  it("menghitung rata-rata tertimbang", () => {
    const score = weightedRubricScore([
      { weight: 50, score: 80, maxScore: 100 },
      { weight: 50, score: 60, maxScore: 100 },
    ]);

    expect(score).toBe(70);
  });

  it("menghormati perbedaan bobot", () => {
    const score = weightedRubricScore([
      { weight: 75, score: 100, maxScore: 100 },
      { weight: 25, score: 0, maxScore: 100 },
    ]);

    expect(score).toBe(75);
  });

  it("mengembalikan nol ketika tidak ada bobot", () => {
    expect(weightedRubricScore([])).toBe(0);
  });
});
