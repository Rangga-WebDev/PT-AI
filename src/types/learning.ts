/** @format */

// Tipe domain untuk prototipe visual PHASE 3. Belum terikat schema database
// (ERD baru disusun pada PHASE 4).

export type UserRole = "student" | "lecturer" | "admin";

/**
 * Enam tahap pembelajaran berurutan (LOCK-PED-002). Urutan tidak boleh diubah.
 * Nilai mengikuti enum `stage_key` di database (DB-02) sehingga tautan tahap
 * pada URL dapat dipetakan langsung ke basis data tanpa penerjemahan.
 */
export type LearningStageKey =
  | "interpretation"
  | "analysis"
  | "evaluation"
  | "inference"
  | "explanation"
  | "reflection";

export type StageStatus =
  | "locked"
  | "available"
  | "in-progress"
  | "attempted"
  | "mastered";

/** Siklus per tahap (LOCK-PED-003). */
export type StageCyclePhase =
  | "attempt"
  | "feedback"
  | "verify"
  | "revise"
  | "mastery";

export interface LearningStage {
  key: LearningStageKey;
  order: number;
  title: string;
  focus: string;
  status: StageStatus;
  cyclePhase: StageCyclePhase;
}

export interface ClassSummary {
  id: string;
  code: string;
  name: string;
  courseName: string;
  lecturerName: string;
  academicPeriod: string;
  studentCount: number;
  activeUnitTitle: string;
  progressPercent: number;
}

export interface LearningUnitSummary {
  id: string;
  classId: string;
  title: string;
  moduleTitle: string;
  caseTitle: string;
  dueLabel: string;
  currentStageKey: LearningStageKey;
  stages: LearningStage[];
}

export interface CaseDetail {
  id: string;
  title: string;
  context: string;
  paragraphs: string[];
  keyQuestion: string;
  sourceIds: string[];
}

// Tipe sumber, kriteria verifikasi, klaim, umpan balik AI, dimensi, distribusi
// ketuntasan, antrean review, dan insiden kini berasal dari database: lihat
// src/lib/analytics/aggregate.ts dan src/server/repositories/*.
