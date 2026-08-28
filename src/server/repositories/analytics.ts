/** @format */

import "server-only";

import type {
  DimensionMeasurement,
  Observation,
} from "@/lib/analytics/aggregate";
import {
  deriveObservations,
  summarizeDimensions,
} from "@/lib/analytics/aggregate";
import type { CtDimension } from "@/lib/constants/stages";
import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

/** Pengukuran berpikir kritis mahasiswa; RLS membatasi ke dirinya sendiri. */
export async function listDimensionMeasurements(
  studentId: string,
  classId?: string,
): Promise<DimensionMeasurement[]> {
  const supabase = await createClient();

  let query = supabase
    .from("critical_thinking_scores")
    .select("dimension, score, measured_at, measurement_source")
    .eq("student_id", studentId)
    .order("measured_at");

  if (classId) query = query.eq("class_id", classId);

  const rows = unwrap(await query, "listDimensionMeasurements");

  return rows.map((row) => ({
    dimension: row.dimension as CtDimension,
    score: Number(row.score),
    measuredAt: row.measured_at,
    measurementSource: row.measurement_source as
      | "rubric"
      | "pretest"
      | "posttest",
  }));
}

export interface ClassMasterySnapshot {
  enrolledCount: number;
  outcomes: ("met" | "partially_met" | "not_met")[];
}

/**
 * Keputusan terakhir per mahasiswa. Riwayat `mastery_results` bersifat
 * append-only, sehingga baris lama harus disaring agar tidak dihitung ganda.
 */
export async function getClassMasterySnapshot(
  classId: string,
): Promise<ClassMasterySnapshot> {
  const supabase = await createClient();

  const [enrollments, results] = await Promise.all([
    supabase
      .from("enrollments")
      .select("student_id", { count: "exact" })
      .eq("class_id", classId)
      .eq("status", "active"),
    supabase
      .from("mastery_results")
      .select(
        `student_id, outcome, decided_at, is_final,
         activities!inner(learning_stages!inner(learning_units!inner(modules!inner(class_id))))`,
      )
      .eq("activities.learning_stages.learning_units.modules.class_id", classId)
      .eq("is_final", true)
      .order("decided_at", { ascending: false }),
  ]);

  const latestByStudent = new Map<
    string,
    "met" | "partially_met" | "not_met"
  >();
  for (const row of results.data ?? []) {
    if (!latestByStudent.has(row.student_id)) {
      latestByStudent.set(
        row.student_id,
        row.outcome as "met" | "partially_met" | "not_met",
      );
    }
  }

  return {
    enrolledCount: enrollments.count ?? 0,
    outcomes: [...latestByStudent.values()],
  };
}

export interface EventSummaryRow {
  eventType: string;
  count: number;
  lastOccurredAt: string;
}

export async function summarizeClassEvents(
  classId: string,
): Promise<EventSummaryRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("learning_events")
    .select("event_type, occurred_at")
    .eq("class_id", classId)
    .order("occurred_at", { ascending: false })
    .limit(500);

  const summary = new Map<string, { count: number; lastOccurredAt: string }>();

  for (const row of data ?? []) {
    const current = summary.get(row.event_type);
    if (current) {
      current.count += 1;
    } else {
      summary.set(row.event_type, {
        count: 1,
        lastOccurredAt: row.occurred_at,
      });
    }
  }

  return [...summary.entries()]
    .map(([eventType, value]) => ({ eventType, ...value }))
    .sort((a, b) => b.count - a.count);
}

export interface IncidentRow {
  id: string;
  className: string;
  classId: string;
  reason: string;
  status: string;
  reporterName: string | null;
  feedbackTitle: string | null;
  resolutionNote: string | null;
  handledAt: string | null;
  createdAt: string;
}

export async function listAiIncidents(): Promise<IncidentRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_incidents")
    .select(
      `id, class_id, reason, status, resolution_note, handled_at, created_at,
       classes!inner(name),
       profiles!reporter_id(full_name),
       ai_feedback!inner(title)`,
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((row) => ({
    id: row.id,
    classId: row.class_id,
    className: row.classes.name,
    reason: row.reason,
    status: row.status,
    reporterName: row.profiles?.full_name ?? null,
    feedbackTitle: row.ai_feedback?.title ?? null,
    resolutionNote: row.resolution_note,
    handledAt: row.handled_at,
    createdAt: row.created_at,
  }));
}

export interface FidelityRecordRow {
  checklistKey: string;
  isImplemented: boolean;
  observationDate: string;
  note: string | null;
}

export async function listFidelityRecords(
  classId: string,
): Promise<FidelityRecordRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("fidelity_records")
    .select("checklist_key, is_implemented, observation_date, note")
    .eq("class_id", classId)
    .order("observation_date", { ascending: true });

  return (data ?? []).map((row) => ({
    checklistKey: row.checklist_key,
    isImplemented: row.is_implemented,
    observationDate: row.observation_date,
    note: row.note,
  }));
}

/**
 * Pengamatan proses satu kelas. Dikumpulkan dengan beberapa kueri agregat,
 * bukan satu kueri per mahasiswa, agar biayanya tidak tumbuh seiring jumlah
 * peserta.
 */
export async function listClassObservations(
  classId: string,
): Promise<Observation[]> {
  const supabase = await createClient();

  const classFilter =
    "activities.learning_stages.learning_units.modules.class_id";

  const [students, baselines, revisions, reflections, pendingFeedback, scores] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("student_id, profiles!student_id(full_name)")
        .eq("class_id", classId)
        .eq("status", "active"),
      supabase
        .from("attempts")
        .select(
          `student_id, activities!inner(learning_stages!inner(learning_units!inner(modules!inner(class_id))))`,
        )
        .eq("is_baseline", true)
        .eq(classFilter, classId),
      supabase
        .from("revisions")
        .select(
          `student_id, attempts!inner(activities!inner(learning_stages!inner(learning_units!inner(modules!inner(class_id)))))`,
        )
        .eq(`attempts.${classFilter}`, classId),
      supabase
        .from("reflections")
        .select(
          `student_id, activities!inner(learning_stages!inner(learning_units!inner(modules!inner(class_id))))`,
        )
        .eq(classFilter, classId),
      supabase
        .from("ai_feedback")
        .select(
          `id, ai_interactions!inner(student_id, activities!inner(learning_stages!inner(learning_units!inner(modules!inner(class_id)))))`,
        )
        .eq("student_action", "pending")
        .eq(`ai_interactions.${classFilter}`, classId),
      supabase
        .from("critical_thinking_scores")
        .select("student_id, dimension, score, measured_at, measurement_source")
        .eq("class_id", classId)
        .order("measured_at"),
    ]);

  const countBy = (
    rows: { student_id: string }[] | null,
  ): Map<string, number> => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      counts.set(row.student_id, (counts.get(row.student_id) ?? 0) + 1);
    }
    return counts;
  };

  const baselineCounts = countBy(baselines.data);
  const revisionCounts = countBy(revisions.data);
  const reflectionCounts = countBy(reflections.data);

  const pendingCounts = new Map<string, number>();
  for (const row of pendingFeedback.data ?? []) {
    const studentId = row.ai_interactions.student_id;
    pendingCounts.set(studentId, (pendingCounts.get(studentId) ?? 0) + 1);
  }

  const measurementsByStudent = new Map<string, DimensionMeasurement[]>();
  for (const row of scores.data ?? []) {
    const bucket = measurementsByStudent.get(row.student_id) ?? [];
    bucket.push({
      dimension: row.dimension as CtDimension,
      score: Number(row.score),
      measuredAt: row.measured_at,
      measurementSource: row.measurement_source as
        | "rubric"
        | "pretest"
        | "posttest",
    });
    measurementsByStudent.set(row.student_id, bucket);
  }

  return deriveObservations(
    (students.data ?? []).map((row) => ({
      studentId: row.student_id,
      studentName: row.profiles.full_name,
      hasBaseline: (baselineCounts.get(row.student_id) ?? 0) > 0,
      pendingAiFeedbackCount: pendingCounts.get(row.student_id) ?? 0,
      reflectionCount: reflectionCounts.get(row.student_id) ?? 0,
      revisionCount: revisionCounts.get(row.student_id) ?? 0,
      dimensions: summarizeDimensions(
        measurementsByStudent.get(row.student_id) ?? [],
      ),
    })),
  );
}
