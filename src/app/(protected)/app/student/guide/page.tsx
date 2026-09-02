/** @format */

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { studentGuide } from "@/content/guides/student-guide";
import { GuideView } from "@/features/guides/components/guide-view";
import { requireStudentAccess } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Panduan mahasiswa",
};

export default async function StudentGuidePage() {
  await requireStudentAccess();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Panduan"
        title={studentGuide.title}
        description={studentGuide.intro}
      />
      <GuideView guide={studentGuide} />
    </PageContainer>
  );
}
