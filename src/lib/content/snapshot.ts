/** @format */

import type { StageKey } from "@/lib/constants/stages";

// Bentuk `learning_unit_versions.snapshot_jsonb`. Dibaca defensif: snapshot
// lama (schema_version 1) tidak memuat `response_schema`.

export interface SnapshotInstruction {
  audience: string;
  content: string;
  sequence: number;
}

export interface SnapshotActivity {
  id: string;
  title: string;
  prompt: string;
  activity_type: string;
  response_schema?: string | null;
  sequence: number;
  status: string;
  allows_ai: boolean;
  allowed_ai_functions: string[] | null;
  requires_attempt_before_ai: boolean;
  due_at: string | null;
  mastery_threshold: number | null;
  instructions: SnapshotInstruction[];
}

export interface SnapshotStage {
  id: string;
  stage_key: StageKey;
  sequence: number;
  title: string;
  focus: string;
  is_enabled: boolean;
  activities: SnapshotActivity[];
}

export interface SnapshotSource {
  source_id: string;
  title: string;
  source_type: string;
  url: string | null;
  is_required: boolean;
  sequence: number;
}

export interface UnitSnapshot {
  unit: {
    id: string;
    title: string;
    objective: string;
    unit_kind: string;
    opens_at: string | null;
    closes_at: string | null;
  } | null;
  case: {
    id: string;
    title: string;
    context: string;
    body: string;
    key_question: string;
  } | null;
  stages: SnapshotStage[];
  source_pack: SnapshotSource[];
}

export interface CaseView {
  id: string;
  title: string;
  context: string;
  body: string;
  keyQuestion: string;
}

export interface StudentActivityView {
  id: string;
  title: string;
  prompt: string;
  activityType: string;
  responseSchema: string;
  allowsAi: boolean;
  allowedAiFunctions: string[];
  requiresAttemptBeforeAi: boolean;
  dueAt: string | null;
  instructions: string[];
}

export interface StudentStageView {
  id: string;
  stageKey: StageKey;
  sequence: number;
  title: string;
  focus: string;
  isEnabled: boolean;
  activities: StudentActivityView[];
}

export interface StudentUnitWorkspace {
  unit: {
    id: string;
    title: string;
    objective: string;
    moduleTitle: string;
    classId: string;
    closesAt: string | null;
  };
  caseDetail: CaseView | null;
  stages: StudentStageView[];
  /** Null berarti unit belum pernah diterbitkan sebagai versi. */
  unitVersionId: string | null;
  sourcePack: SnapshotSource[];
}

export interface UnitLocation {
  unitId: string;
  moduleTitle: string;
  classId: string;
}

function mapActivity(activity: SnapshotActivity): StudentActivityView {
  return {
    id: activity.id,
    title: activity.title,
    prompt: activity.prompt,
    activityType: activity.activity_type,
    responseSchema: activity.response_schema ?? "free_text",
    allowsAi: activity.allows_ai,
    allowedAiFunctions: activity.allowed_ai_functions ?? [],
    requiresAttemptBeforeAi: activity.requires_attempt_before_ai,
    dueAt: activity.due_at,
    instructions: activity.instructions
      .filter((item) => item.audience === "student")
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((item) => item.content),
  };
}

/**
 * Membentuk ruang kerja mahasiswa dari snapshot versi, bukan dari baris hidup.
 * Judul modul dan id kelas tetap dibaca hidup: keduanya penempatan struktural,
 * bukan stimulus pedagogis, dan tidak pernah menjadi bagian artefak penelitian.
 */
export function snapshotToWorkspace(
  snapshot: UnitSnapshot,
  location: UnitLocation,
  unitVersionId: string,
): StudentUnitWorkspace | null {
  if (!snapshot.unit) return null;

  return {
    unit: {
      id: location.unitId,
      title: snapshot.unit.title,
      objective: snapshot.unit.objective,
      moduleTitle: location.moduleTitle,
      classId: location.classId,
      closesAt: snapshot.unit.closes_at,
    },
    caseDetail: snapshot.case
      ? {
          id: snapshot.case.id,
          title: snapshot.case.title,
          context: snapshot.case.context,
          body: snapshot.case.body,
          keyQuestion: snapshot.case.key_question,
        }
      : null,
    stages: (snapshot.stages ?? [])
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((stage) => ({
        id: stage.id,
        stageKey: stage.stage_key,
        sequence: stage.sequence,
        title: stage.title,
        focus: stage.focus,
        isEnabled: stage.is_enabled,
        activities: (stage.activities ?? [])
          .filter((activity) => activity.status === "published")
          .slice()
          .sort((a, b) => a.sequence - b.sequence)
          .map(mapActivity),
      })),
    unitVersionId,
    sourcePack: (snapshot.source_pack ?? [])
      .slice()
      .sort((a, b) => a.sequence - b.sequence),
  };
}
