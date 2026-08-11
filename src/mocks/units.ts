/** @format */

// MOCK — data contoh untuk prototipe visual PHASE 3.

import type {
  LearningStage,
  LearningStageKey,
  LearningUnitSummary,
} from "@/types/learning";

/** Urutan enam tahap bersifat LOCKED (LOCK-PED-002) dan tidak boleh diubah. */
export const LEARNING_STAGE_BLUEPRINT: ReadonlyArray<
  Pick<LearningStage, "key" | "order" | "title" | "focus">
> = [
  {
    key: "interpretasi",
    order: 1,
    title: "Interpretasi",
    focus: "Memahami konteks dan merumuskan masalah",
  },
  {
    key: "analisis",
    order: 2,
    title: "Analisis",
    focus: "Memisahkan klaim, fakta, dan asumsi",
  },
  {
    key: "evaluasi",
    order: 3,
    title: "Evaluasi",
    focus: "Menilai kredibilitas dan kecukupan bukti",
  },
  {
    key: "inferensi",
    order: 4,
    title: "Inferensi",
    focus: "Menguji alternatif dan menarik simpulan",
  },
  {
    key: "eksplanasi",
    order: 5,
    title: "Eksplanasi",
    focus: "Menyusun justifikasi yang dapat dipertanggungjawabkan",
  },
  {
    key: "refleksi",
    order: 6,
    title: "Refleksi",
    focus: "Meninjau proses berpikir dan strategi perbaikan",
  },
];

const MOCK_STAGES: LearningStage[] = [
  {
    ...LEARNING_STAGE_BLUEPRINT[0]!,
    status: "mastered",
    cyclePhase: "mastery",
  },
  {
    ...LEARNING_STAGE_BLUEPRINT[1]!,
    status: "mastered",
    cyclePhase: "mastery",
  },
  {
    ...LEARNING_STAGE_BLUEPRINT[2]!,
    status: "in-progress",
    cyclePhase: "attempt",
  },
  { ...LEARNING_STAGE_BLUEPRINT[3]!, status: "locked", cyclePhase: "attempt" },
  { ...LEARNING_STAGE_BLUEPRINT[4]!, status: "locked", cyclePhase: "attempt" },
  { ...LEARNING_STAGE_BLUEPRINT[5]!, status: "locked", cyclePhase: "attempt" },
];

export const MOCK_ACTIVE_UNIT: LearningUnitSummary = {
  id: "unit-konsultasi-publik",
  classId: "kelas-pkn-a",
  title: "Partisipasi Warga dalam Konsultasi Publik",
  moduleTitle: "Modul 2 — Warga Negara dan Kebijakan Publik",
  caseTitle: "Konsultasi Publik Rancangan Peraturan Daerah Ruang Terbuka Hijau",
  dueLabel: "Batas tahap: 18 Agustus 2026",
  currentStageKey: "evaluasi",
  stages: MOCK_STAGES,
};

export const MOCK_UNITS: LearningUnitSummary[] = [MOCK_ACTIVE_UNIT];

export function findMockUnit(unitId: string): LearningUnitSummary | undefined {
  return MOCK_UNITS.find((unit) => unit.id === unitId);
}

export function findMockStage(
  unit: LearningUnitSummary,
  stageKey: string,
): LearningStage | undefined {
  return unit.stages.find(
    (stage) => stage.key === (stageKey as LearningStageKey),
  );
}
