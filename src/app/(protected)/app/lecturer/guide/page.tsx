/** @format */

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { lecturerGuide } from "@/content/guides/lecturer-guide";
import { GuideView } from "@/features/guides/components/guide-view";
import { requireLecturerAccess } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Panduan dosen",
};

export default async function LecturerGuidePage() {
  await requireLecturerAccess();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Panduan"
        title={lecturerGuide.title}
        description={lecturerGuide.intro}
      />
      <GuideView guide={lecturerGuide} />
    </PageContainer>
  );
}
