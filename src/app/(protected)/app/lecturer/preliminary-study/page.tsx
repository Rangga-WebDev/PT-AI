/** @format */

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/shared/states/empty-state";
import { PreliminaryOverviewSections } from "@/features/preliminary-study/components/overview-sections";
import { PreliminaryStudyHeader } from "@/features/preliminary-study/components/study-header";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import { getPreliminaryOverview } from "@/server/repositories/preliminary-study";

export const metadata: Metadata = {
  title: "Studi pendahuluan",
};

export default async function LecturerPreliminaryStudyPage() {
  await requireLecturerAccess();
  const overview = await getPreliminaryOverview();

  return (
    <PageContainer>
      <PreliminaryStudyHeader overview={overview} audience="lecturer" />
      {overview ? (
        <PreliminaryOverviewSections overview={overview} />
      ) : (
        <EmptyState
          title="Belum ada data studi pendahuluan"
          description="Hasil tes tampil di sini setelah administrator mengimpor data."
        />
      )}
    </PageContainer>
  );
}
