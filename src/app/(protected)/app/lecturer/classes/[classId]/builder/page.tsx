/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { InlineAction } from "@/features/administration/components/action-form";
import {
  CreateModuleForm,
  CreateUnitForm,
} from "@/features/course-builder/components/builder-forms";
import {
  publishModuleAction,
  publishUnitAction,
} from "@/actions/courses/content";
import { PUBLICATION_LABEL } from "@/lib/constants/stages";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { listModulesWithUnits } from "@/server/repositories/content";

const UNIT_KIND_LABEL: Record<string, string> = {
  core: "Inti",
  remedial: "Remedial",
  enrichment: "Pengayaan",
};

export default async function CourseBuilderPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/builder">) {
  const { classId } = await params;

  await requireLecturerOfClass(classId);

  const [classItem, modules] = await Promise.all([
    getClassDetail(classId),
    listModulesWithUnits(classId),
  ]);

  if (!classItem) notFound();

  const moduleOptions = modules.map((module) => ({
    id: module.id,
    label: `${module.sequence}. ${module.title}`,
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${classItem.code} · ${classItem.academicPeriod}`}
        title="Perancang PT-AI"
        description="Susun pertemuan, unit berpikir kritis, kasus, dan aktivitasnya. Unit hanya dapat diterbitkan setelah kasus dan aktivitas tersedia."
        actions={
          <Link
            href={`/app/lecturer/classes/${classId}`}
            className="text-sm underline underline-offset-4"
          >
            Kembali ke kelas
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        <AnalyticsCard
          title="Tambah pertemuan"
          description="Pertemuan mengelompokkan unit berpikir kritis dalam satu kelas."
        >
          <CreateModuleForm classId={classId} />
        </AnalyticsCard>

        {moduleOptions.length > 0 ? (
          <AnalyticsCard
            title="Tambah unit pembelajaran"
            description="Setiap unit otomatis memperoleh enam tahap berpikir kritis."
          >
            <CreateUnitForm modules={moduleOptions} />
          </AnalyticsCard>
        ) : null}

        <AnalyticsCard
          title="Struktur pembelajaran"
          description="Daftar pertemuan dan unit beserta status penerbitannya."
        >
          {modules.length === 0 ? (
            <EmptyState
              title="Belum ada pertemuan"
              description="Tambahkan pertemuan terlebih dahulu, lalu susun unit berpikir kritis di dalamnya."
            />
          ) : (
            <ol className="flex flex-col gap-4">
              {modules.map((module) => (
                <li
                  key={module.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm text-foreground">
                        {module.sequence}. {module.title}
                      </span>
                      {module.description ? (
                        <span className="text-xs text-subtle">
                          {module.description}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge
                        status={
                          module.status === "published" ? "published" : "draft"
                        }
                      >
                        {PUBLICATION_LABEL[module.status]}
                      </StatusBadge>
                      <InlineAction
                        action={publishModuleAction}
                        label={
                          module.status === "published"
                            ? "Jadikan draf"
                            : "Terbitkan pertemuan"
                        }
                        fields={{
                          id: module.id,
                          status:
                            module.status === "published"
                              ? "draft"
                              : "published",
                        }}
                      />
                    </div>
                  </div>

                  {module.units.length === 0 ? (
                    <p className="text-xs text-subtle">
                      Belum ada unit pada pertemuan ini.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {module.units.map((unit) => (
                        <li
                          key={unit.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                        >
                          <div className="flex min-w-0 flex-col">
                            <Link
                              href={`/app/lecturer/classes/${classId}/builder/units/${unit.id}`}
                              className="text-sm text-foreground underline underline-offset-4"
                            >
                              {unit.sequence}. {unit.title}
                            </Link>
                            <span className="text-xs text-subtle">
                              {UNIT_KIND_LABEL[unit.unitKind] ?? unit.unitKind}{" "}
                              · {unit.hasCase ? "kasus siap" : "kasus kosong"} ·{" "}
                              {unit.activityCount} aktivitas
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={
                                unit.status === "published"
                                  ? "published"
                                  : "draft"
                              }
                            >
                              {PUBLICATION_LABEL[unit.status]}
                            </StatusBadge>
                            <InlineAction
                              action={publishUnitAction}
                              label={
                                unit.status === "published"
                                  ? "Jadikan draf"
                                  : "Terbitkan unit"
                              }
                              fields={{
                                id: unit.id,
                                status:
                                  unit.status === "published"
                                    ? "draft"
                                    : "published",
                              }}
                            />
                          </div>
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
