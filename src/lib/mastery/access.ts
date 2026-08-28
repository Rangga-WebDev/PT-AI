/** @format */

import type { StageKey } from "@/lib/constants/stages";

export type MasteryOutcome = "not_met" | "partially_met" | "met";
export type EvaluatorKind = "system" | "lecturer";

export interface StageMastery {
  outcome: MasteryOutcome;
  evaluatorKind: EvaluatorKind;
  isFinal: boolean;
}

export type StageAvailability =
  | "available"
  | "provisional"
  | "locked"
  | "disabled";

export interface StageAccess {
  stageKey: StageKey;
  sequence: number;
  availability: StageAvailability;
  reason: string;
}

export interface StageInput {
  stageKey: StageKey;
  sequence: number;
  isEnabled: boolean;
}

/**
 * Pembagian wewenang (LOCK-PED-008 dan LOCK-PED-010):
 *
 * - Sistem hanya menilai **kelengkapan proses** dan mengusulkan `partially_met`
 *   dengan `is_final = false`. Sistem tidak pernah menilai mutu penalaran.
 * - Dosen menilai **mutu** lewat rubrik dan menetapkan hasil final.
 *
 * Tahap berikutnya terbuka pada usulan sistem, tetapi ditandai `provisional`
 * sampai dosen mengonfirmasi, sehingga mahasiswa tidak tertahan menunggu
 * penilaian tanpa kehilangan kejelasan status.
 */
export function computeStageAccess(
  stages: StageInput[],
  masteryBySequence: Map<number, StageMastery>,
): StageAccess[] {
  const ordered = [...stages].sort((a, b) => a.sequence - b.sequence);

  return ordered.map((stage, index) => {
    if (!stage.isEnabled) {
      return {
        stageKey: stage.stageKey,
        sequence: stage.sequence,
        availability: "disabled",
        reason: "Tahap ini dinonaktifkan dosen untuk unit tersebut.",
      };
    }

    const previous = ordered[index - 1];
    if (!previous) {
      return {
        stageKey: stage.stageKey,
        sequence: stage.sequence,
        availability: "available",
        reason: "Tahap pertama selalu terbuka.",
      };
    }

    const previousMastery = masteryBySequence.get(previous.sequence);

    if (!previousMastery) {
      return {
        stageKey: stage.stageKey,
        sequence: stage.sequence,
        availability: "locked",
        reason:
          "Selesaikan tahap sebelumnya terlebih dahulu: kirim respons awal dan verifikasi sumber wajib.",
      };
    }

    if (previousMastery.outcome === "not_met") {
      return {
        stageKey: stage.stageKey,
        sequence: stage.sequence,
        availability: "locked",
        reason:
          "Dosen menilai tahap sebelumnya belum memenuhi kriteria. Perbaiki jawaban Anda lebih dahulu.",
      };
    }

    if (previousMastery.isFinal) {
      return {
        stageKey: stage.stageKey,
        sequence: stage.sequence,
        availability: "available",
        reason: "Tahap sebelumnya dinilai tuntas oleh dosen.",
      };
    }

    return {
      stageKey: stage.stageKey,
      sequence: stage.sequence,
      availability: "provisional",
      reason:
        "Terbuka sementara berdasarkan kelengkapan proses; penilaian dosen atas tahap sebelumnya masih ditunggu.",
    };
  });
}

export interface ProcessCriterion {
  key: string;
  label: string;
  met: boolean;
}

/**
 * Kriteria proses yang boleh dinilai sistem. Sengaja tidak menyentuh mutu
 * penalaran — itu wewenang dosen.
 */
export function evaluateProcessCriteria(input: {
  hasBaseline: boolean;
  requiredSourceCount: number;
  verifiedSourceCount: number;
  pendingAiFeedbackCount: number;
}): { criteria: ProcessCriterion[]; complete: boolean } {
  const criteria: ProcessCriterion[] = [
    {
      key: "baseline",
      label: "Respons awal sudah dikirim",
      met: input.hasBaseline,
    },
    {
      key: "sources",
      label: "Seluruh sumber wajib sudah diverifikasi",
      met:
        input.requiredSourceCount === 0 ||
        input.verifiedSourceCount >= input.requiredSourceCount,
    },
    {
      key: "ai_reviewed",
      label: "Tidak ada saran AI yang dibiarkan tanpa sikap",
      met: input.pendingAiFeedbackCount === 0,
    },
  ];

  return { criteria, complete: criteria.every((item) => item.met) };
}

/** Skor rubrik berbobot; dipakai dosen sebagai dasar, bukan penentu otomatis. */
export function weightedRubricScore(
  entries: { weight: number; score: number; maxScore: number }[],
): number {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight === 0) return 0;

  const weighted = entries.reduce(
    (sum, entry) =>
      sum +
      entry.weight * (entry.maxScore === 0 ? 0 : entry.score / entry.maxScore),
    0,
  );

  return Math.round((weighted / totalWeight) * 10000) / 100;
}
