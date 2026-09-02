/** @format */

import "server-only";

import { aggregatePortfolio } from "@/lib/portfolio/aggregate";
import type {
  MeetingPortfolio,
  PortfolioActivity,
  PortfolioAiAssistance,
  PortfolioClaimVerification,
  PortfolioLecturerFeedback,
  PortfolioReflection,
  PortfolioRevision,
  PortfolioSourceVerification,
} from "@/lib/portfolio/types";
import { createClient } from "@/lib/supabase/server";

/**
 * Jumlah kueri tetap, tidak tumbuh mengikuti banyaknya artefak. Setelah daftar
 * attempt dan aktivitas diketahui, sisanya diambil sekaligus dengan `in(...)`
 * lalu dikelompokkan di memori.
 */

const REFLECTION_LABELS: [string, string][] = [
  ["initial_summary", "Ringkasan respons awal"],
  ["feedback_summary", "Ringkasan umpan balik"],
  ["verified_sources_summary", "Sumber yang diverifikasi"],
  ["final_summary", "Ringkasan akhir"],
  ["change_reason", "Alasan perubahan"],
  ["ai_accepted", "Saran AI yang diterima"],
  ["ai_rejected", "Saran AI yang ditolak"],
  ["bias_found", "Bias yang ditemukan"],
  ["next_strategy", "Strategi berikutnya"],
];

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const id = key(row);
    const list = map.get(id) ?? [];
    list.push(row);
    map.set(id, list);
  }
  return map;
}

export async function getClassPortfolio(
  classId: string,
  studentId: string,
): Promise<MeetingPortfolio[]> {
  const supabase = await createClient();

  // Pertemuan diambil lebih dahulu supaya yang belum punya artefak pun tetap
  // muncul, bukan hilang dari daftar.
  const { data: moduleRows } = await supabase
    .from("modules")
    .select("id, sequence, title")
    .eq("class_id", classId)
    .is("deleted_at", null)
    .order("sequence");

  const meetings = (moduleRows ?? []).map((row) => ({
    id: row.id,
    sequence: row.sequence,
    title: row.title,
  }));

  // Penyaring kelas dipasang pada rantai relasi, bukan pada id yang dikirim
  // pemanggil. Artefak dari kelas lain karena itu tidak dapat ikut terbawa.
  const { data: attemptRows } = await supabase
    .from("attempts")
    .select(
      `id, content, submitted_at, activity_id, is_baseline,
       activities!inner(
         id, title,
         learning_stages!inner(
           title,
           learning_units!inner(
             title,
             modules!inner(id, class_id)
           )
         )
       )`,
    )
    .eq("student_id", studentId)
    .eq("is_baseline", true)
    .eq("activities.learning_stages.learning_units.modules.class_id", classId);

  const attempts = attemptRows ?? [];

  if (attempts.length === 0) {
    return aggregatePortfolio({
      meetings,
      activities: [],
      evidence: new Map(),
    });
  }

  const attemptIds = attempts.map((row) => row.id);
  const activityIds = attempts.map((row) => row.activity_id);

  const [
    revisionResult,
    reflectionResult,
    sourceVerificationResult,
    claimVerificationResult,
    aiResult,
    masteryResult,
    sessionResult,
  ] = await Promise.all([
    supabase
      .from("revisions")
      .select(
        `id, attempt_id, revision_number, content, submitted_at,
         revision_reasons(id, reason_type, detail)`,
      )
      .in("attempt_id", attemptIds)
      .order("revision_number"),
    supabase.from("reflections").select("*").in("attempt_id", attemptIds),
    supabase
      .from("source_verifications")
      .select("id, activity_id, verdict, note, created_at, sources(title)")
      .eq("student_id", studentId)
      .in("activity_id", activityIds)
      .order("created_at"),
    supabase
      .from("verifications")
      .select("id, activity_id, subject_kind, outcome, note, created_at")
      .eq("student_id", studentId)
      .in("activity_id", activityIds)
      .order("created_at"),
    supabase
      .from("ai_feedback")
      .select(
        `id, kind, title, body, dimension, student_action, created_at,
         ai_interactions!inner(attempt_id)`,
      )
      .in("ai_interactions.attempt_id", attemptIds)
      .order("created_at"),
    supabase
      .from("mastery_results")
      .select(
        "activity_id, outcome, score, evaluator_kind, is_final, decided_at",
      )
      .eq("student_id", studentId)
      .in("activity_id", activityIds)
      .order("decided_at", { ascending: false }),
    supabase
      .from("learning_sessions")
      .select("activity_id, estimated_active_seconds")
      .eq("student_id", studentId)
      .in("activity_id", activityIds),
  ]);

  const revisionRows = revisionResult.data ?? [];
  const revisionsByAttempt = groupBy(revisionRows, (row) => row.attempt_id);

  // Umpan balik dosen menempel pada attempt ATAU pada revisi. Keduanya disaring
  // di server; menyaringnya di JavaScript membuat kueri ini tunduk pada batas
  // baris bawaan dan diam-diam kehilangan umpan balik.
  const revisionIds = revisionRows.map((row) => row.id);
  const feedbackFilter = [
    `attempt_id.in.(${attemptIds.join(",")})`,
    revisionIds.length > 0 ? `revision_id.in.(${revisionIds.join(",")})` : null,
  ]
    .filter((clause) => clause !== null)
    .join(",");

  const feedbackResult = await supabase
    .from("feedback_records")
    .select(
      `id, content, created_at, source, attempt_id, revision_id,
       profiles!author_id(full_name),
       revisions(attempt_id, revision_number)`,
    )
    .eq("source", "lecturer")
    .or(feedbackFilter)
    .order("created_at");

  const reflectionByAttempt = new Map(
    (reflectionResult.data ?? []).map((row) => [row.attempt_id, row]),
  );
  const sourceByActivity = groupBy(
    sourceVerificationResult.data ?? [],
    (row) => row.activity_id,
  );
  const claimByActivity = groupBy(
    claimVerificationResult.data ?? [],
    (row) => row.activity_id,
  );
  const aiByAttempt = groupBy(
    aiResult.data ?? [],
    (row) => row.ai_interactions.attempt_id,
  );

  // Umpan balik yang menempel pada revisi dikembalikan ke attempt induknya
  // supaya seluruhnya tampil dalam satu alur.
  const feedbackByAttempt = groupBy(
    feedbackResult.data ?? [],
    (row) => row.attempt_id ?? row.revisions?.attempt_id ?? "",
  );

  const masteryRows = masteryResult.data ?? [];
  const masteryByActivity = new Map<string, (typeof masteryRows)[number]>();
  for (const row of masteryRows) {
    // Terurut menurun; yang pertama ditemui adalah keputusan terbaru.
    if (!masteryByActivity.has(row.activity_id)) {
      masteryByActivity.set(row.activity_id, row);
    }
  }

  const secondsByActivity = new Map<string, number>();
  for (const row of sessionResult.data ?? []) {
    secondsByActivity.set(
      row.activity_id,
      (secondsByActivity.get(row.activity_id) ?? 0) +
        row.estimated_active_seconds,
    );
  }

  const evidence = new Map<
    string,
    Omit<
      PortfolioActivity,
      "activityId" | "activityTitle" | "stageTitle" | "unitTitle"
    >
  >();

  for (const attempt of attempts) {
    const activityId = attempt.activity_id;
    const reflectionRow = reflectionByAttempt.get(attempt.id);
    const mastery = masteryByActivity.get(activityId);

    const revisions: PortfolioRevision[] = (
      revisionsByAttempt.get(attempt.id) ?? []
    ).map((row) => ({
      id: row.id,
      revisionNumber: row.revision_number,
      content: row.content,
      submittedAt: row.submitted_at,
      reasons: (row.revision_reasons ?? []).map((reason) => ({
        id: reason.id,
        reasonType: reason.reason_type,
        detail: reason.detail,
      })),
    }));

    const sourceVerifications: PortfolioSourceVerification[] = (
      sourceByActivity.get(activityId) ?? []
    ).map((row) => ({
      id: row.id,
      sourceTitle: row.sources?.title ?? null,
      verdict: row.verdict,
      note: row.note,
      createdAt: row.created_at,
    }));

    const claimVerifications: PortfolioClaimVerification[] = (
      claimByActivity.get(activityId) ?? []
    ).map((row) => ({
      id: row.id,
      subjectKind: row.subject_kind,
      outcome: row.outcome,
      note: row.note,
      createdAt: row.created_at,
    }));

    const aiAssistance: PortfolioAiAssistance[] = (
      aiByAttempt.get(attempt.id) ?? []
    ).map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      dimension: row.dimension,
      studentAction: row.student_action,
      createdAt: row.created_at,
    }));

    const lecturerFeedback: PortfolioLecturerFeedback[] = (
      feedbackByAttempt.get(attempt.id) ?? []
    ).map((row) => ({
      id: row.id,
      content: row.content,
      authorName: row.profiles?.full_name ?? null,
      createdAt: row.created_at,
      onRevisionNumber: row.revisions?.revision_number ?? null,
    }));

    const reflection: PortfolioReflection | null = reflectionRow
      ? {
          id: reflectionRow.id,
          submittedAt: reflectionRow.submitted_at,
          entries: REFLECTION_LABELS.map(([key, label]) => ({
            label,
            value: String(
              (reflectionRow as unknown as Record<string, unknown>)[key] ?? "",
            ),
          })).filter((entry) => entry.value.length > 0),
        }
      : null;

    evidence.set(activityId, {
      initialResponse: {
        id: attempt.id,
        content: attempt.content,
        submittedAt: attempt.submitted_at,
      },
      revisions,
      sourceVerifications,
      claimVerifications,
      aiAssistance,
      reflection,
      lecturerFeedback,
      mastery: mastery
        ? {
            outcome: mastery.outcome,
            score: mastery.score,
            evaluatorKind: mastery.evaluator_kind,
            isFinal: mastery.is_final,
            decidedAt: mastery.decided_at,
          }
        : null,
      observedSeconds: secondsByActivity.get(activityId) ?? null,
    });
  }

  return aggregatePortfolio({
    meetings,
    activities: attempts.map((row) => ({
      activityId: row.activity_id,
      activityTitle: row.activities.title,
      stageTitle: row.activities.learning_stages.title,
      unitTitle: row.activities.learning_stages.learning_units.title,
      moduleId: row.activities.learning_stages.learning_units.modules.id,
    })),
    evidence,
  });
}
