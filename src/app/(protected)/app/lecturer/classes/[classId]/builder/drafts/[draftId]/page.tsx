/** @format */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { UnitPlanReview } from "@/features/course-builder/components/unit-plan-review";
import { getUnitPlanDraft } from "@/server/repositories/ai-drafts";

export const metadata: Metadata = { title: "Tinjau 6 unit AI" };

export default async function UnitPlanPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/builder/drafts/[draftId]">) {
  const { classId, draftId } = await params;
  const draft = await getUnitPlanDraft(draftId, classId);
  if (!draft) notFound();
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Perancang PT-AI"
        title="Tinjau 6 unit AI"
        actions={
          <Link
            href={`/app/lecturer/classes/${classId}/builder`}
            className="text-sm underline underline-offset-4"
          >
            Kembali ke perancang
          </Link>
        }
      />
      <UnitPlanReview classId={classId} draft={draft} />
    </PageContainer>
  );
}
