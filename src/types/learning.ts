/** @format */

// Tipe domain untuk prototipe visual PHASE 3. Belum terikat schema database
// (ERD baru disusun pada PHASE 4).

export type UserRole = "student" | "lecturer" | "admin";

/** Enam dimensi outcome berpikir kritis (LOCK-PED-001). */
export type CriticalThinkingDimension =
  | "interpretation"
  | "analysis"
  | "evaluation"
  | "inference"
  | "explanation"
  | "self-regulation";

/** Enam tahap pembelajaran berurutan (LOCK-PED-002). Urutan tidak boleh diubah. */
export type LearningStageKey =
  | "interpretasi"
  | "analisis"
  | "evaluasi"
  | "inferensi"
  | "eksplanasi"
  | "refleksi";

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

export interface DimensionProgress {
  dimension: CriticalThinkingDimension;
  label: string;
  score: number;
  target: number;
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

export type SourceCredibility = "tinggi" | "sedang" | "perlu-telaah";

export interface SourceItem {
  id: string;
  title: string;
  publisher: string;
  authors: string;
  publishedAt: string;
  accessedAt: string;
  sourceType: string;
  url: string;
  version: string;
  credibility: SourceCredibility;
  verified: boolean;
  excerpt: string[];
}

/** Kriteria penilaian sumber oleh mahasiswa (LOCK-PED-007). */
export interface VerificationCriterion {
  id: string;
  label: string;
  question: string;
}

export interface ClaimItem {
  id: string;
  text: string;
  linkedSourceIds: string[];
}

export interface AIFeedbackItem {
  id: string;
  kind: "guiding-question" | "strength" | "gap" | "counter-argument" | "hint";
  title: string;
  body: string;
}

export interface ReviewQueueItem {
  id: string;
  studentName: string;
  className: string;
  stageTitle: string;
  submittedLabel: string;
  status: "menunggu" | "diproses" | "selesai";
}

export interface MasteryDistributionItem {
  label: string;
  count: number;
  tone: "success" | "info" | "evidence" | "danger";
}

export interface IncidentItem {
  id: string;
  className: string;
  reason: string;
  reportedLabel: string;
}
