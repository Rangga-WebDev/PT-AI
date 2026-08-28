/** @format */

import type { Metadata } from "next";

import { AnalyticsCard, DimensionBars } from "@/components/cards/insight-cards";
import { EnrichmentCard, RemedialCard } from "@/components/cards/pathway-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states/empty-state";
import { MOCK_DIMENSION_PROGRESS } from "@/mocks/analytics";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { listStudentProgress } from "@/server/repositories/attempts";
import {
  listStudentBranchingDecisions,
  listStudentMastery,
} from "@/server/repositories/mastery";

const OUTCOME_LABEL: Record<string, string> = {
  not_met: "Belum memenuhi",
  partially_met: "Sebagian memenuhi",
  met: "Memenuhi",
};

const ACTION_LABEL: Record<string, string> = {
  continue: "Lanjut ke tahap berikutnya",
  remedial: "Remedial",
  enrichment: "Pengayaan",
  hold: "Ditahan sementara",
};

export const metadata: Metadata = {
  title: "Progres saya",
};

export default async function StudentProgressPage() {
  const student = await requireStudentAccess();
  const [submissions, mastery, decisions] = await Promise.all([
    listStudentProgress(student.id),
    listStudentMastery(student.id),
    listStudentBranchingDecisions(student.id),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Mahasiswa"
        title="Progres berpikir kritis"
        description="Ringkasan enam dimensi beserta rekomendasi jalur belajar. Setiap rekomendasi disertai alasan dan dapat diubah dosen."
      />
      <div className="flex flex-col gap-5">
        <AnalyticsCard
          title="Hasil ketuntasan"
          description="Keputusan lama tidak pernah dihapus sehingga perkembangan Anda dapat ditelusuri."
        >
          {mastery.length === 0 ? (
            <EmptyState description="Belum ada penilaian ketuntasan." />
          ) : (
            <ul className="flex flex-col gap-2">
              {mastery.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="text-foreground">
                      {item.stageTitle} — {item.activityTitle}
                    </span>
                    <span className="font-mono text-xs text-subtle">
                      {item.evaluatorKind === "lecturer"
                        ? "Dinilai dosen"
                        : "Usulan sistem"}
                      {item.score !== null ? ` · skor ${item.score}` : ""} ·{" "}
                      {new Date(item.decidedAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <StatusBadge
                    status={
                      item.outcome === "met"
                        ? "verified"
                        : item.outcome === "partially_met"
                          ? "evidence"
                          : "danger"
                    }
                  >
                    {OUTCOME_LABEL[item.outcome] ?? item.outcome}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Keputusan jalur belajar"
          description="Setiap keputusan wajib disertai alasan yang dapat Anda baca."
        >
          {decisions.length === 0 ? (
            <EmptyState description="Belum ada keputusan jalur belajar." />
          ) : (
            <ul className="flex flex-col gap-2">
              {decisions.map((item) => (
                <li
                  key={item.id}
                  data-slot="branching-decision-item"
                  className="flex flex-col gap-1 rounded-lg border border-border px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-foreground">
                      {item.activityTitle}
                    </span>
                    <StatusBadge
                      status={
                        item.action === "remedial"
                          ? "evidence"
                          : item.action === "hold"
                            ? "danger"
                            : "verified"
                      }
                    >
                      {ACTION_LABEL[item.action] ?? item.action}
                    </StatusBadge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.reason}</p>
                  <span className="font-mono text-xs text-subtle">
                    {item.decidedBy === "lecturer"
                      ? "Diputuskan dosen"
                      : "Diputuskan sistem"}
                    {item.errorCategory ? ` · ${item.errorCategory}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>

        <AnalyticsCard
          title="Respons yang sudah Anda kirim"
          description="Respons awal bersifat permanen dan menjadi dasar penelusuran perkembangan berpikir Anda."
        >
          {submissions.length === 0 ? (
            <EmptyState description="Belum ada respons awal yang dikirim." />
          ) : (
            <ul className="flex flex-col gap-2">
              {submissions.map((item) => (
                <li
                  key={item.activityId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="text-foreground">
                      {item.activityTitle}
                    </span>
                    <span className="font-mono text-xs text-subtle">
                      {item.unitTitle} · tahap {item.stageSequence}.{" "}
                      {item.stageTitle}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-subtle">
                    {item.submittedAt
                      ? new Date(item.submittedAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>

        <MockBanner />
        <AnalyticsCard
          title="Enam dimensi"
          description="Skor bersifat formatif dan bukan label permanen tentang diri Anda."
        >
          <DimensionBars items={MOCK_DIMENSION_PROGRESS} />
        </AnalyticsCard>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RemedialCard
            title="Latihan menautkan klaim dengan bukti"
            description="Tiga latihan singkat pada kasus yang lebih sederhana."
            reason="Pada tahap evaluasi, dua dari tiga klaim Anda belum ditautkan ke sumber yang diperiksa."
          />
          <EnrichmentCard
            title="Studi kasus lanjutan: konflik kepentingan sumber"
            description="Kasus dengan bukti yang saling bertentangan."
            reason="Dimensi interpretasi Anda melampaui target, sehingga tersedia tantangan tambahan."
          />
        </div>
      </div>
    </PageContainer>
  );
}
