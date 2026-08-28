/** @format */

import "server-only";

import type { AiFunction } from "@/lib/constants/stages";
import { createClient } from "@/lib/supabase/server";

export interface StoredCitation {
  id: string;
  quotedText: string;
  sourceTitle: string | null;
  isTraceable: boolean;
  verifiedByStudent: boolean;
}

export interface StoredFeedback {
  id: string;
  kind: string;
  title: string;
  body: string;
  dimension: string | null;
  studentAction: string;
  function: AiFunction;
  createdAt: string;
  citations: StoredCitation[];
}

/** Riwayat umpan balik AI untuk satu attempt, dibaca lewat sesi mahasiswa. */
export async function listAttemptFeedback(
  attemptId: string,
): Promise<StoredFeedback[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_feedback")
    .select(
      `id, kind, title, body, dimension, student_action, created_at,
       ai_interactions!inner(function, attempt_id),
       ai_citations(id, quoted_text, is_traceable, verified_by_student, sources(title))`,
    )
    .eq("ai_interactions.attempt_id", attemptId)
    .order("created_at", { ascending: true });

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    dimension: row.dimension,
    studentAction: row.student_action,
    function: row.ai_interactions.function,
    createdAt: row.created_at,
    citations: row.ai_citations.map((citation) => ({
      id: citation.id,
      quotedText: citation.quoted_text,
      sourceTitle: citation.sources?.title ?? null,
      isTraceable: citation.is_traceable,
      verifiedByStudent: citation.verified_by_student,
    })),
  }));
}

export async function getDisclosure(
  attemptId: string,
  studentId: string,
): Promise<{ statement: string; functionsUsed: string[] } | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_disclosures")
    .select("statement, functions_used")
    .eq("attempt_id", attemptId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data
    ? { statement: data.statement, functionsUsed: data.functions_used ?? [] }
    : null;
}
