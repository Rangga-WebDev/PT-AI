/** @format */

import { notFound } from "next/navigation";

import { EvidenceCard } from "@/components/cards/evidence-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { LockedState } from "@/components/shared/states/locked-state";
import { AttemptGate } from "@/features/learning-workspace/components/attempt-gate";
import { CaseReader } from "@/features/learning-workspace/components/case-reader";
import { MasteryStatus } from "@/features/learning-workspace/components/mastery-status";
import {
  PhaseRail,
  PhaseStepper,
} from "@/features/learning-workspace/components/phase-navigation";
import {
  AI_FUNCTION_LABEL,
  resolveStageAccess,
  STAGE_LABEL,
} from "@/lib/constants/stages";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { getActivityWorkState } from "@/server/repositories/attempts";
import { getDisclosure, listAttemptFeedback } from "@/server/repositories/ai";
import { getStudentUnitWorkspace } from "@/server/repositories/content";
import {
  listCaseSources,
  listVerifiedSourceIds,
} from "@/server/repositories/sources";
import type { LearningStage } from "@/types/learning";

/** Teks kasus disimpan sebagai satu blok; paragraf dipisah baris kosong. */
function toParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

export default async function LearnStagePage({
  params,
}: PageProps<"/app/student/learn/[unitId]/stage/[stageKey]">) {
  const { unitId, stageKey } = await params;

  const student = await requireStudentAccess();

  const workspace = await getStudentUnitWorkspace(unitId);
  if (!workspace) notFound();

  const stage = workspace.stages.find((item) => item.stageKey === stageKey);
  if (!stage) notFound();

  const access = resolveStageAccess(stage.sequence, stage.isEnabled);

  // Aktivitas pertama tahap menjadi titik masuk penulisan respons awal.
  const primaryActivity = stage.activities[0] ?? null;
  const workState =
    access === "available" && primaryActivity
      ? await getActivityWorkState(primaryActivity.id, student.id)
      : null;

  const caseId = workspace.caseDetail?.id ?? null;
  const [casePack, verifiedIds] = await Promise.all([
    access === "available" && caseId
      ? listCaseSources(caseId)
      : Promise.resolve([]),
    access === "available" && primaryActivity
      ? listVerifiedSourceIds(primaryActivity.id, student.id)
      : Promise.resolve(new Set<string>()),
  ]);

  const baselineId = workState?.baseline?.id ?? null;
  const [feedbackItems, disclosure] = await Promise.all([
    baselineId ? listAttemptFeedback(baselineId) : Promise.resolve([]),
    baselineId ? getDisclosure(baselineId, student.id) : Promise.resolve(null),
  ]);

  // Status ketuntasan nyata baru tersedia setelah attempt dan penilaian ada
  // (PHASE 8 dan PHASE 11); sampai saat itu tahap ditampilkan apa adanya.
  const navStages: LearningStage[] = workspace.stages.map((item) => {
    const itemAccess = resolveStageAccess(item.sequence, item.isEnabled);
    return {
      key: item.stageKey,
      order: item.sequence,
      title: item.title,
      focus: item.focus,
      status: itemAccess === "available" ? "in-progress" : "locked",
      cyclePhase: "attempt",
    };
  });

  const currentNavStage = navStages.find((item) => item.key === stage.stageKey);
  const buildHref = (key: string) =>
    `/app/student/learn/${unitId}/stage/${key}`;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${workspace.unit.moduleTitle} · ${workspace.unit.title}`}
        title={`${stage.sequence}. ${stage.title}`}
        description={stage.focus}
      />

      <div className="flex flex-col gap-5">
        <PhaseStepper
          stages={navStages}
          currentStageKey={stage.stageKey}
          buildHref={buildHref}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PhaseRail
              stages={navStages}
              currentStageKey={stage.stageKey}
              buildHref={buildHref}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            {access === "disabled" ? (
              <LockedState description="Tahap ini dinonaktifkan dosen untuk unit tersebut." />
            ) : access === "locked" ? (
              <LockedState
                description={`Tahap ${STAGE_LABEL[stage.stageKey]} terbuka setelah tahap sebelumnya memenuhi kriteria kinerja. Penilaian ketuntasan otomatis belum aktif pada tahap pengembangan ini.`}
              />
            ) : (
              <>
                {workspace.caseDetail ? (
                  <CaseReader
                    caseDetail={{
                      id: workspace.caseDetail.id,
                      title: workspace.caseDetail.title,
                      context: workspace.caseDetail.context,
                      paragraphs: toParagraphs(workspace.caseDetail.body),
                      keyQuestion: workspace.caseDetail.keyQuestion,
                      sourceIds: [],
                    }}
                  />
                ) : (
                  <EmptyState description="Unit ini belum memiliki kasus." />
                )}

                <section
                  aria-labelledby="aktivitas-heading"
                  className="flex flex-col gap-3"
                >
                  <h3
                    id="aktivitas-heading"
                    className="font-heading text-h4 font-semibold"
                  >
                    Aktivitas tahap ini
                  </h3>
                  {stage.activities.length === 0 ? (
                    <EmptyState description="Belum ada aktivitas yang diterbitkan pada tahap ini." />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {stage.activities.map((activity) => (
                        <li
                          key={activity.id}
                          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
                        >
                          <h4 className="font-medium">{activity.title}</h4>
                          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                            {activity.prompt}
                          </p>
                          {activity.instructions.length > 0 ? (
                            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
                              {activity.instructions.map(
                                (instruction, index) => (
                                  <li key={index}>{instruction}</li>
                                ),
                              )}
                            </ul>
                          ) : null}
                          <p className="font-mono text-xs text-subtle">
                            {activity.allowsAi
                              ? `Bantuan AI tersedia: ${activity.allowedAiFunctions
                                  .map((fn) => AI_FUNCTION_LABEL[fn] ?? fn)
                                  .join(", ")}${
                                  activity.requiresAttemptBeforeAi
                                    ? " — setelah respons awal Anda tersimpan"
                                    : ""
                                }`
                              : "Bantuan AI tidak diaktifkan pada aktivitas ini."}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section
                  aria-labelledby="sumber-heading"
                  className="flex flex-col gap-3"
                >
                  <h3
                    id="sumber-heading"
                    className="font-heading text-h4 font-semibold"
                  >
                    Sumber terkurasi
                  </h3>
                  {casePack.length === 0 ? (
                    <EmptyState description="Belum ada sumber yang dilampirkan pada kasus ini." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                      {casePack.map((source) => (
                        <EvidenceCard
                          key={source.sourceId}
                          item={{
                            id: source.sourceId,
                            title: source.title,
                            publisher: source.publisher,
                            sourceType: source.sourceType,
                            isRequired: source.isRequired,
                            isVerified: verifiedIds.has(source.sourceId),
                          }}
                          href={
                            primaryActivity
                              ? `/app/student/sources/${source.sourceId}?activity=${primaryActivity.id}`
                              : `/app/student/sources/${source.sourceId}`
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>

                {primaryActivity && workState ? (
                  <AttemptGate
                    activityId={primaryActivity.id}
                    classId={workspace.unit.classId}
                    prompt={primaryActivity.prompt}
                    initialDraft={workState.draft}
                    initialSavedAt={workState.draftUpdatedAt}
                    baseline={
                      workState.baseline
                        ? {
                            id: workState.baseline.id,
                            content: workState.baseline.content,
                            submittedAt: workState.baseline.submittedAt,
                          }
                        : null
                    }
                    allowsAi={primaryActivity.allowsAi}
                    allowedFunctions={
                      primaryActivity.allowedAiFunctions as never
                    }
                    feedbackItems={feedbackItems}
                    disclosure={disclosure}
                  />
                ) : null}

                {currentNavStage ? (
                  <MasteryStatus stage={currentNavStage} />
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
