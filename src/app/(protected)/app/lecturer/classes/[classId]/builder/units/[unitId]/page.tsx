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
  CaseForm,
  CreateActivityForm,
  CreateInstructionForm,
  StageForm,
} from "@/features/course-builder/components/builder-forms";
import { publishActivityAction } from "@/actions/courses/content";
import {
  ACTIVITY_TYPE_LABEL,
  AI_FUNCTION_LABEL,
  PUBLICATION_LABEL,
  STAGE_LABEL,
} from "@/lib/constants/stages";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { getUnitDetail } from "@/server/repositories/content";
import { listRubrics } from "@/server/repositories/rubrics";

export default async function BuilderUnitPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/builder/units/[unitId]">) {
  const { classId, unitId } = await params;

  await requireLecturerOfClass(classId);

  const detail = await getUnitDetail(unitId);
  if (!detail || detail.unit.classId !== classId) notFound();

  const rubrics = await listRubrics();

  const stageOptions = detail.stages.map((stage) => ({
    id: stage.id,
    label: `${stage.sequence}. ${STAGE_LABEL[stage.stageKey]}`,
  }));

  const activityOptions = detail.stages.flatMap((stage) =>
    stage.activities.map((activity) => ({
      id: activity.id,
      label: `${STAGE_LABEL[stage.stageKey]} — ${activity.title}`,
    })),
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={detail.unit.moduleTitle}
        title={detail.unit.title}
        description={detail.unit.objective}
        actions={
          <Link
            href={`/app/lecturer/classes/${classId}/builder`}
            className="text-sm underline underline-offset-4"
          >
            Kembali ke perancang
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        <AnalyticsCard
          title="Kasus pemantik"
          description="Satu kasus per unit menjadi bahan penalaran di seluruh tahap."
        >
          <CaseForm
            learningUnitId={unitId}
            initial={
              detail.caseDetail
                ? {
                    title: detail.caseDetail.title,
                    context: detail.caseDetail.context,
                    body: detail.caseDetail.body,
                    keyQuestion: detail.caseDetail.keyQuestion,
                  }
                : null
            }
          />
        </AnalyticsCard>

        <AnalyticsCard
          title="Enam tahap berpikir kritis"
          description="Urutan dan jenis tahap terkunci. Anda hanya dapat menyunting judul, fokus, dan status aktif."
        >
          <div className="flex flex-col gap-4">
            {detail.stages.map((stage) => (
              <div
                key={stage.id}
                className="rounded-lg border border-border p-3"
              >
                <StageForm stage={stage} />

                {stage.activities.length > 0 ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {stage.activities.map((activity) => (
                      <li
                        key={activity.id}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="text-sm text-foreground">
                            {activity.title}
                          </span>
                          <span className="text-xs text-subtle">
                            {ACTIVITY_TYPE_LABEL[activity.activityType] ??
                              activity.activityType}{" "}
                            ·{" "}
                            {activity.allowsAi
                              ? `AI aktif (${activity.allowedAiFunctions
                                  .map((fn) => AI_FUNCTION_LABEL[fn] ?? fn)
                                  .join(", ")})`
                              : "AI nonaktif"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={
                              activity.status === "published"
                                ? "published"
                                : "draft"
                            }
                          >
                            {PUBLICATION_LABEL[activity.status]}
                          </StatusBadge>
                          <InlineAction
                            action={publishActivityAction}
                            label={
                              activity.status === "published"
                                ? "Jadikan draf"
                                : "Terbitkan"
                            }
                            fields={{
                              id: activity.id,
                              status:
                                activity.status === "published"
                                  ? "draft"
                                  : "published",
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-subtle">
                    Belum ada aktivitas pada tahap ini.
                  </p>
                )}
              </div>
            ))}
          </div>
        </AnalyticsCard>

        <AnalyticsCard
          title="Tambah aktivitas"
          description="Aktivitas menentukan tugas mahasiswa pada tahap tertentu."
        >
          {stageOptions.length === 0 ? (
            <EmptyState description="Tahap belum tersedia untuk unit ini." />
          ) : (
            <CreateActivityForm
              stages={stageOptions}
              rubrics={rubrics.map((rubric) => ({
                id: rubric.id,
                label: rubric.title,
              }))}
            />
          )}
        </AnalyticsCard>

        {activityOptions.length > 0 ? (
          <AnalyticsCard
            title="Instruksi tambahan"
            description="Instruksi beraudiens dosen tidak pernah ditampilkan kepada mahasiswa."
          >
            <CreateInstructionForm activities={activityOptions} />
          </AnalyticsCard>
        ) : null}
      </div>
    </PageContainer>
  );
}
