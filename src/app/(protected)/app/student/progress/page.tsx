/** @format */

import type { Metadata } from "next";

import { AnalyticsCard, DimensionBars } from "@/components/cards/insight-cards";
import { EnrichmentCard, RemedialCard } from "@/components/cards/pathway-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { EmptyState } from "@/components/shared/states/empty-state";
import { MOCK_DIMENSION_PROGRESS } from "@/mocks/analytics";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { listStudentProgress } from "@/server/repositories/attempts";

export const metadata: Metadata = {
  title: "Progres saya",
};

export default async function StudentProgressPage() {
  const student = await requireStudentAccess();
  const submissions = await listStudentProgress(student.id);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Mahasiswa"
        title="Progres berpikir kritis"
        description="Ringkasan enam dimensi beserta rekomendasi jalur belajar. Setiap rekomendasi disertai alasan dan dapat diubah dosen."
      />
      <div className="flex flex-col gap-5">
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
