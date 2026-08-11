/** @format */

import type { Metadata } from "next";

import { AnalyticsCard, DimensionBars } from "@/components/cards/insight-cards";
import { EnrichmentCard, RemedialCard } from "@/components/cards/pathway-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { MOCK_DIMENSION_PROGRESS } from "@/mocks/analytics";

export const metadata: Metadata = {
  title: "Progres saya",
};

export default function StudentProgressPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Mahasiswa"
        title="Progres berpikir kritis"
        description="Ringkasan enam dimensi beserta rekomendasi jalur belajar. Setiap rekomendasi disertai alasan dan dapat diubah dosen."
      />
      <div className="flex flex-col gap-5">
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
