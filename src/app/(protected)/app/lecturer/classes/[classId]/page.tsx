/** @format */

import { notFound } from "next/navigation";

import { AnalyticsCard, InsightCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { MOCK_REVIEW_QUEUE } from "@/mocks/analytics";
import { findMockClass } from "@/mocks/classes";
import { MOCK_ACTIVE_UNIT } from "@/mocks/units";

export default async function LecturerClassDetailPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]">) {
  const { classId } = await params;
  const classItem = findMockClass(classId);

  if (!classItem) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${classItem.code} · ${classItem.academicPeriod}`}
        title={classItem.name}
        description={`${classItem.studentCount} mahasiswa · unit berjalan: ${classItem.activeUnitTitle}`}
      />
      <div className="flex flex-col gap-5">
        <MockBanner />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InsightCard
            label="Mahasiswa"
            value={String(classItem.studentCount)}
            tone="info"
          />
          <InsightCard
            label="Kemajuan unit"
            value={`${classItem.progressPercent}%`}
            tone="primary"
          />
          <InsightCard
            label="Menunggu review"
            value={String(
              MOCK_REVIEW_QUEUE.filter(
                (item) => item.className === classItem.code,
              ).length,
            )}
            tone="evidence"
          />
        </div>

        <AnalyticsCard
          title="Tahap pembelajaran unit berjalan"
          description={MOCK_ACTIVE_UNIT.title}
        >
          <ol className="flex flex-col gap-2">
            {MOCK_ACTIVE_UNIT.stages.map((stage) => (
              <li
                key={stage.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm text-foreground">
                    {stage.order}. {stage.title}
                  </span>
                  <span className="font-mono text-xs text-subtle">
                    {stage.focus}
                  </span>
                </div>
                <StatusBadge
                  status={
                    stage.status === "mastered"
                      ? "verified"
                      : stage.status === "locked"
                        ? "locked"
                        : "in-progress"
                  }
                >
                  {stage.status}
                </StatusBadge>
              </li>
            ))}
          </ol>
        </AnalyticsCard>
      </div>
    </PageContainer>
  );
}
