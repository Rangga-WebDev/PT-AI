/** @format */

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/shared/states/empty-state";
import { PreliminaryStudyAdmin } from "@/features/preliminary-study/components/admin-dashboard";
import { PreliminaryStudyHeader } from "@/features/preliminary-study/components/study-header";
import { requireAdminAccess } from "@/lib/supabase/auth";
import {
  getPreliminaryOverview,
  listPreliminaryRespondents,
} from "@/server/repositories/preliminary-study";

export const metadata: Metadata = {
  title: "Studi pendahuluan",
};

export default async function AdminPreliminaryStudyPage() {
  await requireAdminAccess();
  const overview = await getPreliminaryOverview();
  const respondents = overview
    ? await listPreliminaryRespondents(overview.dataset.id)
    : [];

  return (
    <PageContainer>
      <PreliminaryStudyHeader overview={overview} audience="admin" />
      {overview ? (
        <PreliminaryStudyAdmin overview={overview} respondents={respondents} />
      ) : (
        <EmptyState
          title="Belum ada data studi pendahuluan"
          description="Impor berkas jawaban dengan perintah npm run research:import-preliminary. Pemeriksaan berjalan lebih dahulu; data baru tersimpan dengan --apply."
        />
      )}
    </PageContainer>
  );
}
