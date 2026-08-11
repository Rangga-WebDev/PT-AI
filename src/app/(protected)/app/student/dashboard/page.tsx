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
import { MockBanner } from "@/components/shared/mock-banner";
import { Button } from "@/components/ui/button";
import { MOCK_DIMENSION_PROGRESS } from "@/mocks/analytics";
import { MOCK_SOURCES } from "@/mocks/sources";
import { MOCK_ACTIVE_UNIT } from "@/mocks/units";
import { MOCK_STUDENT } from "@/mocks/users";

export const metadata: Metadata = {
  title: "Dashboard mahasiswa",
};

export default function StudentDashboardPage() {
  const currentStage = MOCK_ACTIVE_UNIT.stages.find(
    (stage) => stage.key === MOCK_ACTIVE_UNIT.currentStageKey,
  );
  const nextLockedStage = MOCK_ACTIVE_UNIT.stages.find(
    (stage) => stage.status === "locked",
  );
  const unverifiedSources = MOCK_SOURCES.filter((source) => !source.verified);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Beranda mahasiswa"
        title={`Selamat datang, ${MOCK_STUDENT.fullName.split(" ")[0]}`}
        description="Lanjutkan proses berpikir Anda: baca kasus, susun argumen, periksa bukti, lalu revisi berdasarkan alasan."
        actions={
          <Button
            variant="outline"
            render={<Link href="/app/student/classes" />}
          >
            Lihat kelas
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <MockBanner />

        <BentoGrid>
          <HeroLearningCard
            className="md:col-span-8 lg:col-span-7"
            moduleTitle={MOCK_ACTIVE_UNIT.moduleTitle}
            unitTitle={MOCK_ACTIVE_UNIT.title}
            stageTitle={currentStage?.title ?? "Interpretasi"}
            stageFocus={currentStage?.focus ?? "Memahami konteks"}
            dueLabel={MOCK_ACTIVE_UNIT.dueLabel}
            progressPercent={42}
            href={`/app/student/learn/${MOCK_ACTIVE_UNIT.id}`}
          />

          <AnalyticsCard
            className="md:col-span-4 lg:col-span-5"
            title="Enam dimensi berpikir kritis"
            description="Perkembangan sementara berdasarkan penilaian dosen dan rubrik."
          >
            <DimensionBars items={MOCK_DIMENSION_PROGRESS} />
          </AnalyticsCard>

          <InsightCard
            className="md:col-span-4 lg:col-span-3"
            label="Tahap tuntas"
            value="2 / 6"
            tone="success"
            description="Interpretasi dan analisis telah dinilai tuntas."
          />
          <InsightCard
            className="md:col-span-4 lg:col-span-3"
            label="Sumber perlu diperiksa"
            value={String(unverifiedSources.length)}
            tone="evidence"
            description="Verifikasi sumber sebelum dipakai sebagai bukti."
          />
          <LockedCard
            className="md:col-span-8 lg:col-span-6"
            title={`Tahap berikutnya: ${nextLockedStage?.title ?? "Inferensi"}`}
            reason="Terbuka setelah tahap evaluasi memenuhi kriteria kinerja dan ditinjau dosen."
          />

          {unverifiedSources.slice(0, 2).map((source) => (
            <EvidenceCard
              key={source.id}
              className="md:col-span-4 lg:col-span-6"
              item={source}
              href={`/app/student/sources/${source.id}`}
            />
          ))}
        </BentoGrid>
      </div>
    </PageContainer>
  );
}
