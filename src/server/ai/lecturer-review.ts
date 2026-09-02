/** @format */

import "server-only";

import {
  validateSuggestion,
  type EvidenceArtifact,
  type EvidencePacket,
} from "@/lib/ai/evidence-packet";
import {
  reviewProviderSchema,
  reviewSuggestionSchema,
  type ReviewSuggestion,
} from "@/lib/ai/review-schema";
import { isRubricComplete } from "@/lib/assessment/rubric-scoring";
import { redactUnexpected } from "@/lib/errors/redact";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getAttemptReview } from "@/server/repositories/mastery";
import {
  getReflectionByAttempt,
  listLecturerFeedback,
  listRevisions,
} from "@/server/repositories/revisions";

import { getProvider, CHAT_MODEL } from "./provider";
import {
  buildReviewPrompt,
  REVIEW_PROMPT_VERSION,
  REVIEW_SYSTEM_INSTRUCTION,
} from "./review-prompt";

export type ReviewFailure =
  | "attempt_not_found"
  | "forbidden"
  | "no_rubric"
  | "incomplete_rubric"
  | "provider_error"
  | "invalid_output"
  | "untraceable_citation"
  | "provenance_failed";

export const REVIEW_MESSAGE: Record<ReviewFailure, string> = {
  attempt_not_found: "Pekerjaan mahasiswa tidak ditemukan.",
  forbidden: "Anda tidak berwenang menilai pekerjaan ini.",
  no_rubric:
    "Aktivitas ini belum memiliki rubrik berkriteria, sehingga tidak ada dasar penilaian yang dapat dipakai.",
  incomplete_rubric:
    "Rubrik belum lengkap dan belum dapat digunakan untuk penilaian.",
  provider_error:
    "Layanan AI sedang tidak dapat dihubungi. Coba lagi beberapa saat.",
  invalid_output:
    "Keluaran AI tidak sesuai format yang diizinkan sehingga tidak ditampilkan.",
  untraceable_citation:
    "AI merujuk bukti yang tidak ada pada pekerjaan ini, sehingga hasilnya ditolak.",
  provenance_failed:
    "Jejak usulan AI gagal dicatat, sehingga usulannya tidak ditampilkan. Coba lagi beberapa saat.",
};

export interface ReviewOutcome {
  suggestion: ReviewSuggestion;
  packet: EvidencePacket;
  model: string;
  promptVersion: number;
}

export type ReviewResult =
  | { ok: true; data: ReviewOutcome }
  | { ok: false; reason: ReviewFailure };

const REFLECTION_LABELS: [keyof ReflectionShape, string][] = [
  ["initialSummary", "Ringkasan jawaban awal"],
  ["feedbackSummary", "Ringkasan umpan balik"],
  ["verifiedSourcesSummary", "Sumber yang diverifikasi"],
  ["finalSummary", "Ringkasan jawaban akhir"],
  ["changeReason", "Alasan perubahan"],
  ["aiAccepted", "Saran AI yang diterima"],
  ["aiRejected", "Saran AI yang ditolak"],
  ["biasFound", "Bias yang ditemukan"],
  ["nextStrategy", "Strategi berikutnya"],
];

interface ReflectionShape {
  initialSummary: string;
  feedbackSummary: string;
  verifiedSourcesSummary: string;
  finalSummary: string;
  changeReason: string;
  aiAccepted: string;
  aiRejected: string;
  biasFound: string;
  nextStrategy: string;
}

/**
 * Paket dibangun dari repositori yang sama dengan yang dipakai halaman review,
 * bukan dari pengumpulan artefak kedua dengan semantik yang sedikit berbeda.
 */
async function buildPacket(attemptId: string): Promise<
  | {
      ok: true;
      packet: EvidencePacket;
      classId: string;
      studentId: string;
      activityId: string;
    }
  | { ok: false; reason: ReviewFailure }
> {
  const review = await getAttemptReview(attemptId);
  if (!review) return { ok: false, reason: "attempt_not_found" };

  try {
    await requireLecturerOfClass(review.classId);
  } catch {
    return { ok: false, reason: "forbidden" };
  }

  if (!review.rubric || review.rubric.criteria.length === 0) {
    return { ok: false, reason: "no_rubric" };
  }

  if (!isRubricComplete(review.rubric.criteria)) {
    return { ok: false, reason: "incomplete_rubric" };
  }

  const supabase = await createClient();

  const [revisions, reflection, lecturerFeedback, sourceResult] =
    await Promise.all([
      listRevisions(attemptId),
      getReflectionByAttempt(attemptId),
      listLecturerFeedback(attemptId),
      supabase
        .from("source_verifications")
        .select("id, verdict, note, created_at, sources(title)")
        .eq("student_id", review.studentId)
        .eq("activity_id", review.activityId)
        .order("created_at"),
    ]);

  const { data: scaffolding } = await supabase
    .from("ai_feedback")
    .select("id, kind, title, body, ai_interactions!inner(attempt_id)")
    .eq("ai_interactions.attempt_id", attemptId)
    .order("created_at");

  const levelsByCriterion = new Map<
    string,
    { label: string; descriptor: string; score: number }[]
  >(review.rubric.criteria.map((item) => [item.id, item.levels]));

  const artifacts: EvidenceArtifact[] = [
    {
      id: review.attemptId,
      kind: "initial_response",
      label: "Respons awal",
      content: review.content,
      studentAuthored: true,
    },
  ];

  for (const revision of revisions) {
    artifacts.push({
      id: revision.id,
      kind: "revision",
      label: `Revisi ${revision.revisionNumber}`,
      content: revision.content,
      studentAuthored: true,
    });

    for (const reason of revision.reasons) {
      artifacts.push({
        id: reason.id,
        kind: "revision_reason",
        label: `Alasan revisi ${revision.revisionNumber}`,
        content: `${reason.reasonType}: ${reason.detail}`,
        studentAuthored: true,
      });
    }
  }

  for (const row of sourceResult.data ?? []) {
    artifacts.push({
      id: row.id,
      kind: "source_verification",
      label: `Verifikasi sumber: ${row.sources?.title ?? "tanpa judul"}`,
      content: `Penilaian: ${row.verdict}. Catatan: ${row.note}`,
      studentAuthored: true,
    });
  }

  if (reflection) {
    const shape = reflection as unknown as ReflectionShape & { id: string };
    artifacts.push({
      id: shape.id,
      kind: "reflection",
      label: "Refleksi",
      content: REFLECTION_LABELS.map(
        ([key, label]) => `${label}: ${shape[key]}`,
      ).join("\n"),
      studentAuthored: true,
    });
  }

  for (const feedback of lecturerFeedback) {
    artifacts.push({
      id: feedback.id,
      kind: "lecturer_feedback",
      label: "Umpan balik dosen sebelumnya",
      content: feedback.content,
      studentAuthored: false,
    });
  }

  // Bantuan AI ikut dikirim sebagai konteks proses, tetapi ditandai bukan
  // karya mahasiswa supaya tidak dihitung sebagai capaiannya.
  for (const row of scaffolding ?? []) {
    artifacts.push({
      id: row.id,
      kind: "ai_scaffolding",
      label: `Bantuan AI: ${row.title}`,
      content: row.body,
      studentAuthored: false,
    });
  }

  return {
    ok: true,
    classId: review.classId,
    studentId: review.studentId,
    activityId: review.activityId,
    packet: {
      attemptId: review.attemptId,
      activityTitle: review.activityTitle,
      activityPrompt: review.activityPrompt,
      stageTitle: review.stageTitle,
      unitTitle: review.unitTitle,
      rubricTitle: review.rubric.title,
      criteria: review.rubric.criteria.map((criterion) => ({
        id: criterion.id,
        code: criterion.code,
        description: criterion.description,
        dimension: criterion.dimension,
        weight: criterion.weight,
        levels: levelsByCriterion.get(criterion.id) ?? [],
      })),
      artifacts,
    },
  };
}

export async function requestReviewSuggestion(
  attemptId: string,
  lecturerId: string,
): Promise<ReviewResult> {
  const built = await buildPacket(attemptId);
  if (!built.ok) return { ok: false, reason: built.reason };

  const { packet } = built;
  let generation;

  try {
    generation = await getProvider().generateStructured({
      systemInstruction: REVIEW_SYSTEM_INSTRUCTION,
      prompt: buildReviewPrompt(packet),
      schema: reviewProviderSchema as never,
    });
  } catch (error) {
    console.error("[ai] review provider", {
      at: new Date().toISOString(),
      attemptId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, reason: "provider_error" };
  }

  const parsed = (() => {
    try {
      return reviewSuggestionSchema.safeParse(JSON.parse(generation.text));
    } catch {
      return null;
    }
  })();

  if (!parsed?.success) {
    console.error("[ai] review schema", {
      at: new Date().toISOString(),
      attemptId,
      issues: parsed?.error.issues.slice(0, 5) ?? "response_not_json",
    });
    return { ok: false, reason: "invalid_output" };
  }

  const validated = validateSuggestion(packet, parsed.data);
  if (!validated.ok) {
    console.error("[ai] review citation", {
      at: new Date().toISOString(),
      attemptId,
      rejections: validated.rejections,
    });
    return { ok: false, reason: "untraceable_citation" };
  }

  const recorded = await recordSuggestion({
    attemptId,
    classId: built.classId,
    studentId: built.studentId,
    activityId: built.activityId,
    lecturerId,
    packet,
    suggestion: validated.suggestion,
  });

  // Usulan yang tidak terekam berarti keputusan dosen kelak tidak dapat
  // ditelusuri ke saran yang melatarinya. Untuk penelitian, itu sama buruknya
  // dengan tidak punya usulan sama sekali.
  if (!recorded) return { ok: false, reason: "provenance_failed" };

  return {
    ok: true,
    data: {
      suggestion: validated.suggestion,
      packet,
      model: CHAT_MODEL,
      promptVersion: REVIEW_PROMPT_VERSION,
    },
  };
}

/**
 * `ai_interactions` tidak dapat dipakai: kolomnya menuntut attempt milik
 * mahasiswa yang sama dengan pemanggil, dan isinya menjadi sumber
 * `research.v_ai_usage` — variabel penggunaan AI oleh mahasiswa yang justru
 * sedang diteliti. Jejak usulan karena itu ditulis ke `audit_logs`.
 *
 * Mengembalikan false bila jejak gagal ditulis, sehingga usulan tidak jadi
 * ditampilkan.
 */
async function recordSuggestion(input: {
  attemptId: string;
  classId: string;
  studentId: string;
  activityId: string;
  lecturerId: string;
  packet: EvidencePacket;
  suggestion: ReviewSuggestion;
}): Promise<boolean> {
  const entry = {
    at: new Date().toISOString(),
    attemptId: input.attemptId,
    classId: input.classId,
    studentId: input.studentId,
    activityId: input.activityId,
    lecturerId: input.lecturerId,
    model: CHAT_MODEL,
    promptVersion: REVIEW_PROMPT_VERSION,
    evidenceIds: input.packet.artifacts.map((item) => item.id),
    rubricCriteriaIds: input.packet.criteria.map((item) => item.id),
    suggestedFeedback: input.suggestion.suggestedFeedback,
    suggestion: input.suggestion.criteria.map((item) => ({
      criterionId: item.criterionId,
      suggestedScore: item.suggestedScore,
      confidence: item.confidence,
      insufficientEvidence: item.insufficientEvidence,
    })),
  };

  try {
    const { error } = await createAdminClient().from("audit_logs").insert({
      actor_id: input.lecturerId,
      actor_role: "lecturer",
      action: "ai_review_suggestion",
      subject_table: "attempts",
      subject_id: input.attemptId,
      after: entry,
    });

    if (error) {
      console.error("[ai] review audit", {
        at: new Date().toISOString(),
        attemptId: input.attemptId,
        sqlstate: error.code ?? null,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("[ai] review audit", {
      at: new Date().toISOString(),
      attemptId: input.attemptId,
      error: redactUnexpected(error),
    });
    return false;
  }
}
