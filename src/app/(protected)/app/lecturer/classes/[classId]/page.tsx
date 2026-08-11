/** @format */

import { notFound } from "next/navigation";

import { AnalyticsCard, InsightCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { MockBanner } from "@/components/shared/mock-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import {
  getClassDetail,
  listClassMembers,
} from "@/server/repositories/classes";
import { MOCK_ACTIVE_UNIT } from "@/mocks/units";

const STATUS_LABEL = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
} as const;

export default async function LecturerClassDetailPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]">) {
  const { classId } = await params;

  // Dosen hanya boleh membuka kelas yang ditugaskan kepadanya.
  await requireLecturerOfClass(classId);

  const [classItem, members] = await Promise.all([
    getClassDetail(classId),
    listClassMembers(classId),
  ]);

  if (!classItem) {
    notFound();
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${classItem.code} · ${classItem.academicPeriod}`}
        title={classItem.name}
        description={classItem.courseName}
        actions={
          <StatusBadge
            status={classItem.status === "published" ? "published" : "draft"}
          >
            {STATUS_LABEL[classItem.status]}
          </StatusBadge>
        }
      />

      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InsightCard
            label="Mahasiswa"
            value={String(members.students.length)}
            tone="info"
          />
          <InsightCard
            label="Dosen pengampu"
            value={String(members.lecturers.length)}
            tone="primary"
          />
          <InsightCard
            label="Status"
            value={STATUS_LABEL[classItem.status]}
            tone={classItem.status === "published" ? "success" : "evidence"}
          />
        </div>

        <AnalyticsCard
          title="Mahasiswa terdaftar"
          description="Daftar peserta kelas ini."
        >
          {members.students.length === 0 ? (
            <EmptyState description="Belum ada mahasiswa terdaftar pada kelas ini." />
          ) : (
            <ul className="flex flex-col gap-2">
              {members.students.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{item.fullName}</span>
                  <span className="font-mono text-xs text-subtle">
                    {item.identifier}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>

        <MockBanner />
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
