/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { DraftReview } from "@/features/quick-setup/components/draft-review";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { getQuickSetupDraft } from "@/server/repositories/ai-drafts";

export default async function QuickSetupDraftPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/quick-setup/[draftId]">) {
  const { classId, draftId } = await params;

  await requireLecturerOfClass(classId);

  const view = await getQuickSetupDraft(draftId);
  if (!view) notFound();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Quick Setup"
        title="Tinjau draf"
        description="Bandingkan dengan dokumen aslinya sebelum memutuskan. Apa yang berasal dari dokumen dan apa yang merupakan saran AI ditandai terpisah."
        actions={
          <Link
            href={`/app/lecturer/classes/${classId}/quick-setup`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Kembali
          </Link>
        }
      />
      <DraftReview view={view} classId={classId} />
    </PageContainer>
  );
}
