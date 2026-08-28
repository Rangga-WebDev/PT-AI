/** @format */

import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { ClaimEvidenceLinker } from "@/features/verification/components/claim-evidence-linker";
import { SourceViewer } from "@/features/verification/components/source-viewer";
import { VerificationChecklist } from "@/features/verification/components/verification-checklist";
import {
  VERDICT_LABEL,
  VERIFICATION_CRITERIA,
} from "@/lib/constants/verification";
import { requireStudentAccess } from "@/lib/supabase/auth";
import {
  getCaseIdForActivity,
  getSource,
  listCaseClaims,
  listStudentVerifications,
} from "@/server/repositories/sources";

export default async function StudentSourcePage({
  params,
  searchParams,
}: PageProps<"/app/student/sources/[sourceId]">) {
  const { sourceId } = await params;
  const { activity } = await searchParams;

  const student = await requireStudentAccess();

  const source = await getSource(sourceId);
  if (!source) notFound();

  const activityId = typeof activity === "string" ? activity : null;

  const [verifications, caseId] = await Promise.all([
    listStudentVerifications(sourceId, student.id),
    activityId ? getCaseIdForActivity(activityId) : Promise.resolve(null),
  ]);

  const claims = caseId ? await listCaseClaims(caseId) : [];
  const latestVerification = verifications[0] ?? null;

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Verifikasi sumber"
        title="Periksa sumber sebelum dipakai sebagai bukti"
        description="Nilai sumber pada enam kriteria, catat alasannya, lalu tautkan ke klaim yang relevan."
      />
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <SourceViewer
            source={source}
            isVerifiedByStudent={latestVerification !== null}
          />

          <div className="flex flex-col gap-6">
            {latestVerification ? (
              <section
                aria-labelledby="riwayat-heading"
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    id="riwayat-heading"
                    className="font-heading text-h4 font-semibold"
                  >
                    Penilaian terakhir Anda
                  </h3>
                  <StatusBadge
                    status={
                      latestVerification.verdict === "credible"
                        ? "verified"
                        : latestVerification.verdict === "questionable"
                          ? "evidence"
                          : "danger"
                    }
                  >
                    {VERDICT_LABEL[latestVerification.verdict]}
                  </StatusBadge>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {VERIFICATION_CRITERIA.map((criterion) => (
                    <li
                      key={criterion.key}
                      className="rounded-md border border-border px-2 py-1 font-mono text-xs text-subtle"
                    >
                      {criterion.label}:{" "}
                      {latestVerification.checklist[criterion.key]
                        ? "terpenuhi"
                        : "tidak"}
                    </li>
                  ))}
                </ul>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {latestVerification.note}
                </p>
                <p className="font-mono text-xs text-subtle">
                  {verifications.length} penilaian tersimpan · penilaian lama
                  tidak dihapus agar perubahan pertimbangan dapat ditelusuri
                </p>
              </section>
            ) : null}

            {activityId ? (
              <VerificationChecklist
                sourceId={sourceId}
                sourceVersionId={source.versions[0]?.id ?? null}
                activityId={activityId}
              />
            ) : (
              <section className="rounded-xl border border-dashed border-border p-5">
                <p className="text-sm text-muted-foreground">
                  Buka sumber ini dari aktivitas pada ruang belajar untuk
                  memverifikasinya. Verifikasi selalu tercatat dalam konteks
                  tugas tertentu.
                </p>
              </section>
            )}

            {activityId && caseId ? (
              <ClaimEvidenceLinker
                claims={claims}
                sourceId={sourceId}
                sourceTitle={source.title}
              />
            ) : null}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
