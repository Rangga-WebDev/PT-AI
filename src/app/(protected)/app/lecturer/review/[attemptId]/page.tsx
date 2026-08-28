/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states/empty-state";
import { LecturerFeedbackForm } from "@/features/assessment/components/lecturer-feedback-form";
import { ScoringForm } from "@/features/assessment/components/scoring-form";
import { RevisionHistory } from "@/features/learning-workspace/components/revision-history";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import {
  getAttemptReview,
  listErrorCategories,
} from "@/server/repositories/mastery";
import {
  getReflectionByAttempt,
  listLecturerFeedback,
  listRevisions,
} from "@/server/repositories/revisions";

const REFLECTION_FIELDS = [
  ["initialSummary", "Jawaban awal"],
  ["feedbackSummary", "Umpan balik yang diterima"],
  ["verifiedSourcesSummary", "Sumber yang diverifikasi"],
  ["finalSummary", "Jawaban akhir"],
  ["changeReason", "Alasan perubahan"],
  ["aiAccepted", "Saran AI diterima"],
  ["aiRejected", "Saran AI ditolak"],
  ["biasFound", "Bias yang ditemukan"],
  ["nextStrategy", "Strategi berikutnya"],
] as const;

const OUTCOME_LABEL: Record<string, string> = {
  not_met: "Belum memenuhi",
  partially_met: "Sebagian memenuhi",
  met: "Memenuhi",
};

export default async function AttemptReviewPage({
  params,
}: PageProps<"/app/lecturer/review/[attemptId]">) {
  const { attemptId } = await params;

  const review = await getAttemptReview(attemptId);
  if (!review) notFound();

  await requireLecturerOfClass(review.classId);

  const [errorCategories, revisions, reflection, lecturerFeedback] =
    await Promise.all([
      listErrorCategories(),
      listRevisions(attemptId),
      getReflectionByAttempt(attemptId),
      listLecturerFeedback(attemptId),
    ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${review.className} · ${review.unitTitle}`}
        title={`Tinjau: ${review.studentName}`}
        description={`${review.stageSequence}. ${review.stageTitle} — ${review.activityTitle}`}
        actions={
          <Link
            href="/app/lecturer/review"
            className="text-sm underline underline-offset-4"
          >
            Kembali ke antrean
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex flex-col gap-5">
          <AnalyticsCard
            title="Respons awal mahasiswa"
            description={`${review.studentIdentifier} · dikirim ${new Date(
              review.submittedAt,
            ).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}`}
          >
            <div className="flex flex-col gap-3">
              <p className="font-mono text-xs text-subtle">
                {review.activityPrompt}
              </p>
              <blockquote className="rounded-lg border border-border bg-surface-active/50 p-4 text-sm whitespace-pre-wrap text-muted-foreground">
                {review.content}
              </blockquote>
              <p className="text-xs text-subtle">
                Respons awal bersifat permanen dan tidak dapat diubah siapa pun,
                termasuk Anda.
              </p>
            </div>
          </AnalyticsCard>

          {review.existingMastery ? (
            <AnalyticsCard
              title="Keputusan ketuntasan terakhir"
              description="Riwayat keputusan tidak pernah dihapus."
            >
              {" "}
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  status={
                    review.existingMastery.outcome === "met"
                      ? "verified"
                      : review.existingMastery.outcome === "partially_met"
                        ? "evidence"
                        : "danger"
                  }
                >
                  {OUTCOME_LABEL[review.existingMastery.outcome] ??
                    review.existingMastery.outcome}
                </StatusBadge>
                <span className="font-mono text-xs text-subtle">
                  {review.existingMastery.evaluatorKind === "lecturer"
                    ? "Diputuskan dosen"
                    : "Usulan sistem"}{" "}
                  ·{" "}
                  {new Date(review.existingMastery.decidedAt).toLocaleString(
                    "id-ID",
                    { dateStyle: "medium", timeStyle: "short" },
                  )}
                </span>
              </div>
            </AnalyticsCard>
          ) : null}

          <AnalyticsCard
            title="Revisi mahasiswa"
            description="Perubahan ditampilkan terhadap versi sebelumnya."
          >
            {revisions.length === 0 ? (
              <EmptyState description="Mahasiswa belum mengirim revisi." />
            ) : (
              <div className="flex flex-col gap-4">
                <RevisionHistory
                  baseline={{
                    content: review.content,
                    submittedAt: review.submittedAt,
                  }}
                  revisions={revisions}
                />

                {revisions.map((revision) => {
                  const notes = lecturerFeedback.filter(
                    (item) => item.revisionId === revision.id,
                  );

                  return (
                    <div
                      key={revision.id}
                      className="flex flex-col gap-2 rounded-xl border border-border p-4"
                    >
                      {notes.length > 0 ? (
                        <ul className="flex flex-col gap-1">
                          {notes.map((note) => (
                            <li
                              key={note.id}
                              data-slot="lecturer-feedback-item"
                              className="text-sm text-muted-foreground"
                            >
                              <span className="font-medium text-foreground">
                                {note.authorName ?? "Dosen"}
                              </span>{" "}
                              — {note.content}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      <LecturerFeedbackForm
                        revisionId={revision.id}
                        revisionNumber={revision.revisionNumber}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </AnalyticsCard>

          <AnalyticsCard
            title="Refleksi mahasiswa"
            description="Sembilan unsur wajib (LOCK-PED-011)."
          >
            {reflection === null ? (
              <EmptyState description="Mahasiswa belum mengisi refleksi." />
            ) : (
              <dl data-slot="reflection-review" className="flex flex-col gap-3">
                {REFLECTION_FIELDS.map(([key, label]) => (
                  <div key={key} className="flex flex-col gap-0.5">
                    <dt className="text-sm font-medium">{label}</dt>
                    <dd className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {reflection[key]}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </AnalyticsCard>
        </div>

        <ScoringForm
          attemptId={review.attemptId}
          studentId={review.studentId}
          activityId={review.activityId}
          criteria={review.rubric?.criteria ?? []}
          existingMastery={
            review.existingMastery
              ? {
                  id: review.existingMastery.id,
                  outcome: review.existingMastery.outcome,
                  isFinal: review.existingMastery.isFinal,
                }
              : null
          }
          errorCategories={errorCategories.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
        />
      </div>
    </PageContainer>
  );
}
