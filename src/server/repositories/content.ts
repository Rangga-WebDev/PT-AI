/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { StageKey } from "@/lib/constants/stages";
import {
  snapshotToWorkspace,
  type SnapshotSource,
  type UnitSnapshot,
} from "@/lib/content/snapshot";

import { unwrap } from "./shared";

export interface ModuleView {
  id: string;
  title: string;
  description: string | null;
  sequence: number;
  status: "draft" | "published" | "archived";
  units: LearningUnitView[];
}

export interface LearningUnitView {
  id: string;
  title: string;
  objective: string;
  sequence: number;
  status: "draft" | "published" | "archived";
  unitKind: string;
  opensAt: string | null;
  closesAt: string | null;
  hasCase: boolean;
  activityCount: number;
}

export interface StageView {
  id: string;
  stageKey: StageKey;
  sequence: number;
  title: string;
  focus: string;
  isEnabled: boolean;
  activities: ActivityView[];
}

export interface ActivityView {
  id: string;
  title: string;
  prompt: string;
  activityType: string;
  sequence: number;
  status: "draft" | "published" | "archived";
  allowsAi: boolean;
  allowedAiFunctions: string[];
  requiresAttemptBeforeAi: boolean;
  masteryThreshold: number | null;
  dueAt: string | null;
  rubricId: string | null;
}

export interface CaseView {
  id: string;
  title: string;
  context: string;
  body: string;
  keyQuestion: string;
}

export async function listModulesWithUnits(
  classId: string,
): Promise<ModuleView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("modules")
      .select(
        `id, title, description, sequence, status,
         learning_units(
           id, title, objective, sequence, status, unit_kind, opens_at, closes_at,
           cases(id),
           learning_stages(activities(id))
         )`,
      )
      .eq("class_id", classId)
      .is("deleted_at", null)
      .order("sequence"),
    "listModulesWithUnits",
  );

  return rows.map((module) => ({
    id: module.id,
    title: module.title,
    description: module.description,
    sequence: module.sequence,
    status: module.status,
    units: module.learning_units
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((unit) => ({
        id: unit.id,
        title: unit.title,
        objective: unit.objective,
        sequence: unit.sequence,
        status: unit.status,
        unitKind: unit.unit_kind,
        opensAt: unit.opens_at,
        closesAt: unit.closes_at,
        hasCase: unit.cases !== null,
        activityCount: unit.learning_stages.reduce(
          (total, stage) => total + stage.activities.length,
          0,
        ),
      })),
  }));
}

export async function getUnitDetail(unitId: string): Promise<{
  unit: LearningUnitView & { moduleTitle: string; classId: string };
  caseDetail: CaseView | null;
  stages: StageView[];
} | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("learning_units")
    .select(
      `id, title, objective, sequence, status, unit_kind, opens_at, closes_at,
       modules(title, class_id),
       cases(id, title, context, body, key_question),
       learning_stages(
         id, stage_key, sequence, title, focus, is_enabled,
         activities(
           id, title, prompt, activity_type, sequence, status, allows_ai,
           allowed_ai_functions, requires_attempt_before_ai, mastery_threshold,
           due_at, rubric_id
         )
       )`,
    )
    .eq("id", unitId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;

  const stages: StageView[] = data.learning_stages
    .slice()
    .sort((a, b) => a.sequence - b.sequence)
    .map((stage) => ({
      id: stage.id,
      stageKey: stage.stage_key,
      sequence: stage.sequence,
      title: stage.title,
      focus: stage.focus,
      isEnabled: stage.is_enabled,
      activities: stage.activities
        .slice()
        .sort((a, b) => a.sequence - b.sequence)
        .map((activity) => ({
          id: activity.id,
          title: activity.title,
          prompt: activity.prompt,
          activityType: activity.activity_type,
          sequence: activity.sequence,
          status: activity.status,
          allowsAi: activity.allows_ai,
          allowedAiFunctions: activity.allowed_ai_functions ?? [],
          requiresAttemptBeforeAi: activity.requires_attempt_before_ai,
          masteryThreshold: activity.mastery_threshold,
          dueAt: activity.due_at,
          rubricId: activity.rubric_id,
        })),
    }));

  const activityCount = stages.reduce(
    (total, stage) => total + stage.activities.length,
    0,
  );

  return {
    unit: {
      id: data.id,
      title: data.title,
      objective: data.objective,
      sequence: data.sequence,
      status: data.status,
      unitKind: data.unit_kind,
      opensAt: data.opens_at,
      closesAt: data.closes_at,
      hasCase: data.cases !== null,
      activityCount,
      moduleTitle: data.modules.title,
      classId: data.modules.class_id,
    },
    caseDetail: data.cases
      ? {
          id: data.cases.id,
          title: data.cases.title,
          context: data.cases.context,
          body: data.cases.body,
          keyQuestion: data.cases.key_question,
        }
      : null,
    stages,
  };
}

export interface StudentUnitSummary {
  id: string;
  title: string;
  objective: string;
  classId: string;
  moduleTitle: string;
  moduleSequence: number;
  sequence: number;
  caseTitle: string | null;
  closesAt: string | null;
}

/**
 * Unit yang terlihat mahasiswa. Penyaringan status dan keanggotaan kelas
 * dilakukan RLS; filter di sini hanya mempersempit, bukan menjadi pengaman.
 */
export async function listStudentUnits(
  classId?: string,
): Promise<StudentUnitSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("learning_units")
    .select(
      `id, title, objective, sequence, closes_at,
       modules!inner(id, title, class_id, sequence, status),
       cases(title)`,
    )
    .eq("status", "published")
    .eq("modules.status", "published")
    .is("deleted_at", null);

  if (classId) {
    query = query.eq("modules.class_id", classId);
  }

  const rows = unwrap(await query, "listStudentUnits");

  return rows
    .map((unit) => ({
      id: unit.id,
      title: unit.title,
      objective: unit.objective,
      classId: unit.modules.class_id,
      moduleTitle: unit.modules.title,
      moduleSequence: unit.modules.sequence,
      sequence: unit.sequence,
      caseTitle: unit.cases?.title ?? null,
      closesAt: unit.closes_at,
    }))
    .sort(
      (a, b) => a.moduleSequence - b.moduleSequence || a.sequence - b.sequence,
    );
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
  unitVersionId: string | null;
  sourcePack: SnapshotSource[];
}

/**
 * Versi yang berlaku bagi seorang mahasiswa: versi yang sudah terikat pada
 * attempt paling awalnya di unit ini, atau versi terbit terkini bila ia belum
 * pernah memulai. Aturannya sama dengan trigger `set_attempt_unit_version()`;
 * di sini hanya dibaca, keputusan pengikatan tetap milik basis data.
 */
async function resolveStudentUnitVersion(
  unitId: string,
  studentId: string,
): Promise<string | null> {
  const supabase = await createClient();

  const { data: pinned } = await supabase
    .from("attempts")
    .select(
      "unit_version_id, activities!inner(learning_stages!inner(learning_unit_id))",
    )
    .eq("student_id", studentId)
    .eq("activities.learning_stages.learning_unit_id", unitId)
    .not("unit_version_id", "is", null)
    .order("submitted_at")
    .limit(1)
    .maybeSingle();

  if (pinned?.unit_version_id) return pinned.unit_version_id;

  const { data: current } = await supabase
    .from("learning_unit_versions")
    .select("id")
    .eq("learning_unit_id", unitId)
    .eq("status", "published")
    .maybeSingle();

  return current?.id ?? null;
}

export async function getStudentUnitWorkspace(
  unitId: string,
  studentId: string,
): Promise<StudentUnitWorkspace | null> {
  const supabase = await createClient();

  const { data: location } = await supabase
    .from("learning_units")
    .select("id, modules(title, class_id)")
    .eq("id", unitId)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();

  if (!location) return null;

  const versionId = await resolveStudentUnitVersion(unitId, studentId);

  if (versionId) {
    const { data: version } = await supabase
      .from("learning_unit_versions")
      .select("id, snapshot_jsonb")
      .eq("id", versionId)
      .maybeSingle();

    if (version) {
      return snapshotToWorkspace(
        version.snapshot_jsonb as unknown as UnitSnapshot,
        {
          unitId,
          moduleTitle: location.modules.title,
          classId: location.modules.class_id,
        },
        version.id,
      );
    }
  }

  // Unit yang belum pernah diterbitkan sebagai versi tetap terbaca dari baris
  // hidup, sehingga konten lama tidak hilang sebelum penerbitan pertama.
  return getLiveStudentUnitWorkspace(unitId);
}

async function getLiveStudentUnitWorkspace(
  unitId: string,
): Promise<StudentUnitWorkspace | null> {
  const supabase = await createClient();

  // activity_instructions beraudiens dosen sudah ditutup RLS; filter di sini
  // menegaskan niat dan menghemat data yang dikirim ke klien.
  const { data } = await supabase
    .from("learning_units")
    .select(
      `id, title, objective, closes_at,
       modules(title, class_id),
       cases(id, title, context, body, key_question),
       learning_stages(
         id, stage_key, sequence, title, focus, is_enabled,
         activities(
           id, title, prompt, activity_type, response_schema, sequence, status,
           allows_ai, allowed_ai_functions, requires_attempt_before_ai, due_at,
           activity_instructions(content, audience, sequence)
         )
       )`,
    )
    .eq("id", unitId)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) return null;

  return {
    unit: {
      id: data.id,
      title: data.title,
      objective: data.objective,
      moduleTitle: data.modules.title,
      classId: data.modules.class_id,
      closesAt: data.closes_at,
    },
    caseDetail: data.cases
      ? {
          id: data.cases.id,
          title: data.cases.title,
          context: data.cases.context,
          body: data.cases.body,
          keyQuestion: data.cases.key_question,
        }
      : null,
    stages: data.learning_stages
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .map((stage) => ({
        id: stage.id,
        stageKey: stage.stage_key,
        sequence: stage.sequence,
        title: stage.title,
        focus: stage.focus,
        isEnabled: stage.is_enabled,
        activities: stage.activities
          .filter((activity) => activity.status === "published")
          .sort((a, b) => a.sequence - b.sequence)
          .map((activity) => ({
            id: activity.id,
            title: activity.title,
            prompt: activity.prompt,
            activityType: activity.activity_type,
            responseSchema: activity.response_schema ?? "free_text",
            allowsAi: activity.allows_ai,
            allowedAiFunctions: activity.allowed_ai_functions ?? [],
            requiresAttemptBeforeAi: activity.requires_attempt_before_ai,
            dueAt: activity.due_at,
            instructions: activity.activity_instructions
              .filter((item) => item.audience === "student")
              .sort((a, b) => a.sequence - b.sequence)
              .map((item) => item.content),
          })),
      })),
    unitVersionId: null,
    sourcePack: [],
  };
}
