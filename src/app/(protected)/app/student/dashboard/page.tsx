/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { EvidenceCard } from "@/components/cards/evidence-cards";
import {
  AnalyticsCard,
  DimensionBars,
  InsightCard,
} from "@/components/cards/insight-cards";
import { HeroLearningCard } from "@/components/cards/learning-cards";
import { LockedCard } from "@/components/cards/pathway-cards";
import { BentoGrid } from "@/components/layout/bento-grid";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { summarizeDimensions } from "@/lib/analytics/aggregate";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { listDimensionMeasurements } from "@/server/repositories/analytics";
import { listStudentUnits } from "@/server/repositories/content";
import { listPendingSourcesForStudent } from "@/server/repositories/sources";

export const metadata: Metadata = {
  title: "Dashboard mahasiswa",
};

export default async function StudentDashboardPage() {
  const user = await requireStudentAccess();
  const firstName = user.fullName.split(" ")[0] ?? user.fullName;

  const [units, pendingSources, measurements] = await Promise.all([
    listStudentUnits(),
    listPendingSourcesForStudent(user.id),
    listDimensionMeasurements(user.id),
  ]);
  const activeUnit = units[0] ?? null;
  const dimensions = summarizeDimensions(measurements);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Beranda mahasiswa"
        title={`Selamat datang, ${firstName}`}
        description="Lanjutkan proses berpikir Anda: baca kasus, susun argumen, periksa bukti, lalu revisi berdasarkan alasan."
        actions={
          <Link
            href="/app/student/classes"
            className={buttonVariants({ variant: "outline" })}
          >
            Lihat kelas
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        <BentoGrid>
          {activeUnit ? (
            <HeroLearningCard
              className="md:col-span-8 lg:col-span-7"
              moduleTitle={activeUnit.moduleTitle}
              unitTitle={activeUnit.title}
              stageTitle="Interpretasi"
              stageFocus={activeUnit.objective}
              dueLabel={
                activeUnit.caseTitle
                  ? `Kasus: ${activeUnit.caseTitle}`
                  : "Kasus belum tersedia"
              }
              progressPercent={0}
              href={`/app/student/learn/${activeUnit.id}`}
            />
          ) : (
            <LockedCard
              className="md:col-span-8 lg:col-span-7"
              title="Belum ada unit pembelajaran"
              reason="Unit akan muncul setelah dosen menerbitkannya pada kelas yang Anda ikuti."
            />
          )}

          <AnalyticsCard
            className="md:col-span-4 lg:col-span-5"
            title="Enam dimensi berpikir kritis"
            description="Berdasarkan penilaian rubrik oleh dosen."
          >
            {dimensions.length === 0 ? (
              <EmptyState description="Belum ada pengukuran. Skor muncul setelah dosen menilai respons Anda dengan rubrik." />
            ) : (
              <DimensionBars items={dimensions} />
            )}
          </AnalyticsCard>

          <InsightCard
            className="md:col-span-4 lg:col-span-3"
            label="Unit terbit"
            value={String(units.length)}
            tone="success"
            description="Unit yang sudah dapat Anda kerjakan."
          />
          <InsightCard
            className="md:col-span-4 lg:col-span-3"
            label="Sumber perlu diperiksa"
            value={String(pendingSources.length)}
            tone="evidence"
            description="Verifikasi sumber sebelum dipakai sebagai bukti."
          />

          {pendingSources.slice(0, 2).map((source) => (
            <EvidenceCard
              key={source.sourceId}
              className="md:col-span-4 lg:col-span-6"
              item={{
                id: source.sourceId,
                title: source.title,
                publisher: source.publisher,
                sourceType: source.sourceType,
                isRequired: source.isRequired,
                isVerified: false,
              }}
              href={`/app/student/sources/${source.sourceId}?activity=${source.activityId}`}
            />
          ))}
        </BentoGrid>
      </div>
    </PageContainer>
  );
}
