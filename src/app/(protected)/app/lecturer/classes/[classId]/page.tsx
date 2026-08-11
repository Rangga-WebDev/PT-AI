/** @format */

import { notFound } from "next/navigation";
import Link from "next/link";

import { AnalyticsCard, InsightCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import {
  getClassDetail,
  listClassMembers,
} from "@/server/repositories/classes";
import { listModulesWithUnits } from "@/server/repositories/content";

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

  const [classItem, members, modules] = await Promise.all([
    getClassDetail(classId),
    listClassMembers(classId),
    listModulesWithUnits(classId),
  ]);

  if (!classItem) {
    notFound();
  }

  const publishedUnits = modules.reduce(
    (total, module) =>
      total + module.units.filter((unit) => unit.status === "published").length,
    0,
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${classItem.code} · ${classItem.academicPeriod}`}
        title={classItem.name}
        description={classItem.courseName}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              status={classItem.status === "published" ? "published" : "draft"}
            >
              {STATUS_LABEL[classItem.status]}
            </StatusBadge>
            <Button
              variant="outline"
              render={
                <Link href={`/app/lecturer/classes/${classId}/builder`} />
              }
            >
              Perancang materi
            </Button>
          </div>
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
            label="Unit terbit"
            value={String(publishedUnits)}
            tone={publishedUnits > 0 ? "success" : "evidence"}
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

        <AnalyticsCard
          title="Struktur materi"
          description="Modul dan unit pada kelas ini beserta status penerbitannya."
        >
          {modules.length === 0 ? (
            <EmptyState description="Belum ada modul. Buka perancang materi untuk menyusunnya." />
          ) : (
            <ol className="flex flex-col gap-3">
              {modules.map((module) => (
                <li
                  key={module.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-foreground">
                      {module.sequence}. {module.title}
                    </span>
                    <StatusBadge
                      status={
                        module.status === "published" ? "published" : "draft"
                      }
                    >
                      {STATUS_LABEL[module.status]}
                    </StatusBadge>
                  </div>
                  {module.units.length === 0 ? (
                    <p className="text-xs text-subtle">Belum ada unit.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {module.units.map((unit) => (
                        <li
                          key={unit.id}
                          className="flex flex-wrap items-center justify-between gap-2 text-sm"
                        >
                          <span>
                            {unit.sequence}. {unit.title}
                          </span>
                          <span className="font-mono text-xs text-subtle">
                            {STATUS_LABEL[unit.status]} · {unit.activityCount}{" "}
                            aktivitas
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
          )}
        </AnalyticsCard>
      </div>
    </PageContainer>
  );
}
