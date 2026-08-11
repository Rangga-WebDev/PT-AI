/** @format */

import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { ClaimEvidenceLinker } from "@/features/verification/components/claim-evidence-linker";
import { SourceViewer } from "@/features/verification/components/source-viewer";
import { VerificationChecklist } from "@/features/verification/components/verification-checklist";
import { MOCK_CLAIMS } from "@/mocks/claims";
import {
  findMockSource,
  MOCK_SOURCES,
  VERIFICATION_CRITERIA,
} from "@/mocks/sources";

export default async function StudentSourcePage({
  params,
}: PageProps<"/app/student/sources/[sourceId]">) {
  const { sourceId } = await params;
  const source = findMockSource(sourceId);

  if (!source) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Verifikasi sumber"
        title="Periksa sumber sebelum dipakai sebagai bukti"
        description="Nilai sumber pada enam kriteria, catat alasannya, lalu tautkan ke klaim yang relevan."
      />
      <div className="flex flex-col gap-5">
        <MockBanner />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <SourceViewer source={source} />
          <div className="flex flex-col gap-6">
            <VerificationChecklist criteria={VERIFICATION_CRITERIA} />
            <ClaimEvidenceLinker claims={MOCK_CLAIMS} sources={MOCK_SOURCES} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
