/** @format */

import "server-only";

import type { StageKey } from "@/lib/constants/stages";
import type {
  EvaluatorKind,
  MasteryOutcome,
  StageMastery,
} from "@/lib/mastery/access";
import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface AttemptReview {
  attemptId: string;
  content: string;
  submittedAt: string;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  activityId: string;
  activityTitle: string;
  activityPrompt: string;
  stageTitle: string;
  stageSequence: number;
  unitTitle: string;
  classId: string;
  className: string;
  rubric: {
    id: string;
    title: string;
    criteria: {
      id: string;
      code: string;
      description: string;
      dimension: string;
      weight: number;
    }[];
  } | null;
  existingMastery: {
    id: string;
    outcome: MasteryOutcome;
    evaluatorKind: EvaluatorKind;
    isFinal: boolean;
    decidedAt: string;
  } | null;
}

export async function getAttemptReview(
  attemptId: string,
): Promise<AttemptReview | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("attempts")
    .select(
      `id, content, submitted_at, student_id, activity_id,
       profiles!student_id(full_name, identifier),
       activities!inner(
         id, title, prompt,
         rubrics(id, title, rubric_criteria(id, code, description, dimension, weight)),
         learning_stages!inner(
           title, sequence,
           learning_units!inner(title, modules!inner(class_id, classes!inner(name)))
         )
       )`,
    )
    .eq("id", attemptId)
    .maybeSingle();

  if (!data) return null;

  const { data: mastery } = await supabase
    .from("mastery_results")
    .select("id, outcome, evaluator_kind, is_final, decided_at")
    .eq("activity_id", data.activity_id)
    .eq("student_id", data.student_id)
    .order("decided_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stage = data.activities.learning_stages;
  const unit = stage.learning_units;

  return {
    attemptId: data.id,
    content: data.content,
    submittedAt: data.submitted_at,
    studentId: data.student_id,
    studentName: data.profiles.full_name,
    studentIdentifier: data.profiles.identifier,
    activityId: data.activities.id,
    activityTitle: data.activities.title,
    activityPrompt: data.activities.prompt,
    stageTitle: stage.title,
    stageSequence: stage.sequence,
    unitTitle: unit.title,
    classId: unit.modules.class_id,
    className: unit.modules.classes.name,
    rubric: data.activities.rubrics
      ? {
          id: data.activities.rubrics.id,
          title: data.activities.rubrics.title,
          criteria: data.activities.rubrics.rubric_criteria.map(
            (criterion) => ({
              id: criterion.id,
              code: criterion.code,
              description: criterion.description,
              dimension: criterion.dimension,
              weight: criterion.weight,
            }),
          ),
        }
      : null,
    existingMastery: mastery
      ? {
          id: mastery.id,
          outcome: mastery.outcome,
          evaluatorKind: mastery.evaluator_kind,
          isFinal: mastery.is_final,
          decidedAt: mastery.decided_at,
        }
      : null,
  };
}

/** Ketuntasan per tahap untuk satu unit, dipakai menghitung tahap yang terbuka. */
export async function getUnitMastery(
  unitId: string,
  studentId: string,
): Promise<Map<number, StageMastery>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("mastery_results")
    .select(
      `outcome, evaluator_kind, is_final, decided_at,
       activities!inner(learning_stages!inner(sequence, learning_unit_id))`,
    )
    .eq("student_id", studentId)
    .eq("activities.learning_stages.learning_unit_id", unitId)
    .order("decided_at", { ascending: true });

  const result = new Map<number, StageMastery>();

  // Diurutkan menaik lalu ditimpa, sehingga keputusan terbaru yang menang.
  for (const row of data ?? []) {
    result.set(row.activities.learning_stages.sequence, {
      outcome: row.outcome,
      evaluatorKind: row.evaluator_kind,
      isFinal: row.is_final,
    });
  }

  return result;
}

export interface MasteryHistoryRow {
  id: string;
  outcome: MasteryOutcome;
  evaluatorKind: EvaluatorKind;
  isFinal: boolean;
  decidedAt: string;
  score: number | null;
  activityTitle: string;
  stageTitle: string;
  stageKey: StageKey;
}

export async function listStudentMastery(
  studentId: string,
): Promise<MasteryHistoryRow[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("mastery_results")
      .select(
        `id, outcome, evaluator_kind, is_final, decided_at, score,
         activities!inner(title, learning_stages!inner(title, stage_key))`,
      )
      .eq("student_id", studentId)
      .order("decided_at", { ascending: false }),
    "listStudentMastery",
  );

  return rows.map((row) => ({
    id: row.id,
    outcome: row.outcome,
    evaluatorKind: row.evaluator_kind,
    isFinal: row.is_final,
    decidedAt: row.decided_at,
    score: row.score,
    activityTitle: row.activities.title,
    stageTitle: row.activities.learning_stages.title,
    stageKey: row.activities.learning_stages.stage_key,
  }));
}

export interface BranchingDecisionRow {
  id: string;
  action: string;
  reason: string;
  decidedBy: EvaluatorKind;
  decidedAt: string;
  activityTitle: string;
  errorCategory: string | null;
}

/** Mahasiswa berhak membaca alasan keputusan yang menyangkut dirinya (LOCK-PED-009). */
export async function listStudentBranchingDecisions(
  studentId: string,
): Promise<BranchingDecisionRow[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("branching_decisions")
      .select(
        `id, action, reason, decided_by, decided_at,
         activities!inner(title),
         error_categories(name)`,
      )
      .eq("student_id", studentId)
      .order("decided_at", { ascending: false }),
    "listStudentBranchingDecisions",
  );

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    reason: row.reason,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    activityTitle: row.activities.title,
    errorCategory: row.error_categories?.name ?? null,
  }));
}

export interface BranchingRuleRow {
  id: string;
  action: string;
  explanation: string;
  priority: number;
  isActive: boolean;
  activityTitle: string;
  errorCategory: string | null;
}

export async function listBranchingRules(
  classId: string,
): Promise<BranchingRuleRow[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("branching_rules")
      .select(
        `id, action, explanation, priority, is_active,
         activities!inner(
           title,
           learning_stages!inner(learning_units!inner(modules!inner(class_id)))
         ),
         error_categories(name)`,
      )
      .eq("activities.learning_stages.learning_units.modules.class_id", classId)
      .order("priority"),
    "listBranchingRules",
  );

  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    explanation: row.explanation,
    priority: row.priority,
    isActive: row.is_active,
    activityTitle: row.activities.title,
    errorCategory: row.error_categories?.name ?? null,
  }));
}

export async function listErrorCategories() {
  const supabase = await createClient();

  return unwrap(
    await supabase
      .from("error_categories")
      .select("id, key, name, description, dimension")
      .order("name"),
    "listErrorCategories",
  );
}
