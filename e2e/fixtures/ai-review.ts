/** @format */

import { createClient } from "@supabase/supabase-js";

// Bantuan penilaian AI hanya berjalan bila aktivitasnya punya rubrik lengkap.
// Fixture ini menyediakan rubrik itu sekali pakai, lalu membaca jejak yang
// ditinggalkan usulan AI di audit_logs — satu-satunya tempat jejak itu boleh
// ditulis, karena ai_interactions adalah variabel penelitian mahasiswa.

const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

function admin() {
  if (!url || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY dibutuhkan untuk fixture E2E.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface AttachedRubric {
  rubricId: string;
  criterionIds: string[];
}

/** Memasang rubrik dua kriteria pada aktivitas uji yang sudah ada. */
export async function attachRubric(
  activityId: string,
): Promise<AttachedRubric> {
  const supabase = admin();

  const { data: activity, error: activityError } = await supabase
    .from("activities")
    .select("created_by")
    .eq("id", activityId)
    .single();
  if (activityError || !activity) {
    throw new Error(`Aktivitas uji tidak ditemukan: ${activityError?.message}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", activity.created_by)
    .single();
  if (!profile?.organization_id) throw new Error("Organisasi dosen tidak ada.");

  const { data: rubric, error: rubricError } = await supabase
    .from("rubrics")
    .insert({
      organization_id: profile.organization_id,
      title: `Rubrik uji jejak AI ${new Date().toISOString()}`,
      status: "published",
      created_by: activity.created_by,
    })
    .select("id")
    .single();
  if (rubricError || !rubric) {
    throw new Error(`Gagal membuat rubrik uji: ${rubricError?.message}`);
  }

  const { data: criteria, error: criteriaError } = await supabase
    .from("rubric_criteria")
    .insert([
      {
        rubric_id: rubric.id,
        code: "A1",
        description: "Mengidentifikasi klaim dan asumsi yang mendasarinya.",
        dimension: "analysis",
        weight: 1,
        sequence: 1,
      },
      {
        rubric_id: rubric.id,
        code: "E1",
        description: "Menimbang kekuatan dan keterbatasan bukti.",
        dimension: "evaluation",
        weight: 1,
        sequence: 2,
      },
    ])
    .select("id");
  if (criteriaError || !criteria) {
    throw new Error(`Gagal membuat kriteria uji: ${criteriaError?.message}`);
  }

  const levels = criteria.flatMap((criterion) => [
    {
      rubric_criterion_id: criterion.id,
      level_order: 1,
      label: "Belum tampak",
      descriptor: "Belum terlihat pada pekerjaan mahasiswa.",
      score: 0,
    },
    {
      rubric_criterion_id: criterion.id,
      level_order: 2,
      label: "Berkembang",
      descriptor: "Terlihat sebagian dan belum konsisten.",
      score: 2,
    },
    {
      rubric_criterion_id: criterion.id,
      level_order: 3,
      label: "Baik",
      descriptor: "Terlihat jelas dan didukung bukti dari sumber.",
      score: 4,
    },
  ]);

  const { error: levelError } = await supabase
    .from("rubric_levels")
    .insert(levels);
  if (levelError) {
    throw new Error(`Gagal membuat level uji: ${levelError.message}`);
  }

  const { error: attachError } = await supabase
    .from("activities")
    .update({ rubric_id: rubric.id })
    .eq("id", activityId);
  if (attachError) {
    throw new Error(`Gagal memasang rubrik: ${attachError.message}`);
  }

  return {
    rubricId: rubric.id,
    criterionIds: criteria.map((item) => item.id),
  };
}

export interface ProvenanceEntry {
  at: string;
  attemptId: string;
  classId: string;
  studentId: string;
  activityId: string;
  lecturerId: string;
  model: string;
  promptVersion: number;
  evidenceIds: string[];
  rubricCriteriaIds: string[];
  suggestedFeedback: string;
  suggestion: { criterionId: string; suggestedScore: number }[];
}

export async function readProvenance(
  attemptId: string,
): Promise<ProvenanceEntry[]> {
  const { data, error } = await admin()
    .from("audit_logs")
    .select("after")
    .eq("action", "ai_review_suggestion")
    .eq("subject_id", attemptId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Gagal membaca jejak: ${error.message}`);
  return (data ?? []).map((row) => row.after as unknown as ProvenanceEntry);
}

export async function countAiInteractions(studentId: string): Promise<number> {
  const { count, error } = await admin()
    .from("ai_interactions")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId);

  if (error)
    throw new Error(`Gagal menghitung ai_interactions: ${error.message}`);
  return count ?? 0;
}

export async function countFinalMastery(activityId: string): Promise<number> {
  const { count, error } = await admin()
    .from("mastery_results")
    .select("id", { count: "exact", head: true })
    .eq("activity_id", activityId)
    .eq("is_final", true);

  if (error) throw new Error(`Gagal menghitung ketuntasan: ${error.message}`);
  return count ?? 0;
}
