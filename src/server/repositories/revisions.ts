/** @format */

import "server-only";

import type { RevisionReasonType } from "@/lib/validation/revision";
import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface RevisionReasonView {
  id: string;
  reasonType: RevisionReasonType;
  detail: string;
  aiFeedbackId: string | null;
}

export interface RevisionView {
  id: string;
  revisionNumber: number;
  content: string;
  submittedAt: string;
  reasons: RevisionReasonView[];
}

export interface ReflectionView {
  id: string;
  attemptId: string;
  revisionId: string | null;
  initialSummary: string;
  feedbackSummary: string;
  verifiedSourcesSummary: string;
  finalSummary: string;
  changeReason: string;
  aiAccepted: string;
  aiRejected: string;
  biasFound: string;
  nextStrategy: string;
  submittedAt: string;
}

export interface LecturerFeedbackView {
  id: string;
  revisionId: string | null;
  content: string;
  createdAt: string;
  authorName: string | null;
}

/** Riwayat revisi satu attempt, terurut supaya diff antarversi dapat dihitung. */
export async function listRevisions(
  attemptId: string,
): Promise<RevisionView[]> {
  const supabase = await createClient();

  const rows = unwrap(
    await supabase
      .from("revisions")
      .select(
        `id, revision_number, content, submitted_at,
         revision_reasons(id, reason_type, detail, ai_feedback_id)`,
      )
      .eq("attempt_id", attemptId)
      .order("revision_number"),
    "listRevisions",
  );

  return rows.map((row) => ({
    id: row.id,
    revisionNumber: row.revision_number,
    content: row.content,
    submittedAt: row.submitted_at,
    reasons: row.revision_reasons.map((reason) => ({
      id: reason.id,
      reasonType: reason.reason_type as RevisionReasonType,
      detail: reason.detail,
      aiFeedbackId: reason.ai_feedback_id,
    })),
  }));
}

export async function getReflection(
  activityId: string,
  studentId: string,
  attemptId: string,
): Promise<ReflectionView | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("reflections")
    .select(
      `id, attempt_id, revision_id, initial_summary, feedback_summary,
       verified_sources_summary, final_summary, change_reason,
       ai_accepted, ai_rejected, bias_found, next_strategy, submitted_at`,
    )
    .eq("activity_id", activityId)
    .eq("student_id", studentId)
    .eq("attempt_id", attemptId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    attemptId: data.attempt_id,
    revisionId: data.revision_id,
    initialSummary: data.initial_summary,
    feedbackSummary: data.feedback_summary,
    verifiedSourcesSummary: data.verified_sources_summary,
    finalSummary: data.final_summary,
    changeReason: data.change_reason,
    aiAccepted: data.ai_accepted,
    aiRejected: data.ai_rejected,
    biasFound: data.bias_found,
    nextStrategy: data.next_strategy,
    submittedAt: data.submitted_at,
  };
}

/** Dipakai halaman penilaian dosen: refleksi mahasiswa lain tetap tertutup RLS. */
export async function getReflectionByAttempt(
  attemptId: string,
): Promise<ReflectionView | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("reflections")
    .select(
      `id, attempt_id, revision_id, initial_summary, feedback_summary,
       verified_sources_summary, final_summary, change_reason,
       ai_accepted, ai_rejected, bias_found, next_strategy, submitted_at`,
    )
    .eq("attempt_id", attemptId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    attemptId: data.attempt_id,
    revisionId: data.revision_id,
    initialSummary: data.initial_summary,
    feedbackSummary: data.feedback_summary,
    verifiedSourcesSummary: data.verified_sources_summary,
    finalSummary: data.final_summary,
    changeReason: data.change_reason,
    aiAccepted: data.ai_accepted,
    aiRejected: data.ai_rejected,
    biasFound: data.bias_found,
    nextStrategy: data.next_strategy,
    submittedAt: data.submitted_at,
  };
}

export async function listLecturerFeedback(
  attemptId: string,
): Promise<LecturerFeedbackView[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("feedback_records")
    .select(
      `id, revision_id, content, created_at, source,
       profiles!author_id(full_name),
       revisions!inner(attempt_id)`,
    )
    .eq("revisions.attempt_id", attemptId)
    .eq("source", "lecturer")
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    revisionId: row.revision_id,
    content: row.content,
    createdAt: row.created_at,
    authorName: row.profiles?.full_name ?? null,
  }));
}
