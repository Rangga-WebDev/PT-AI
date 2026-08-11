/** @format */

import { notFound } from "next/navigation";

import { EvidenceCard } from "@/components/cards/evidence-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { LockedState } from "@/components/shared/states/locked-state";
import { AttemptGate } from "@/features/learning-workspace/components/attempt-gate";
import { CaseReader } from "@/features/learning-workspace/components/case-reader";
import { MasteryStatus } from "@/features/learning-workspace/components/mastery-status";
import {
  PhaseRail,
  PhaseStepper,
} from "@/features/learning-workspace/components/phase-navigation";
import { MOCK_AI_FEEDBACK } from "@/mocks/ai-feedback";
import { MOCK_CASE } from "@/mocks/cases";
import { MOCK_SOURCES } from "@/mocks/sources";
import { findMockStage, findMockUnit } from "@/mocks/units";

export default async function LearnStagePage({
  params,
}: PageProps<"/app/student/learn/[unitId]/stage/[stageKey]">) {
  const { unitId, stageKey } = await params;
  const unit = findMockUnit(unitId);

  if (!unit) {
    notFound();
  }

  const stage = findMockStage(unit, stageKey);

  if (!stage) {
    notFound();
  }

  const buildHref = (key: string) =>
    `/app/student/learn/${unit.id}/stage/${key}`;

  return (
    <PageContainer>
      <PageHeader
        eyebrow={unit.moduleTitle}
        title={`${stage.order}. ${stage.title}`}
        description={stage.focus}
      />

      <div className="flex flex-col gap-5">
        <MockBanner />
        <PhaseStepper
          stages={unit.stages}
          currentStageKey={stage.key}
          buildHref={buildHref}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <PhaseRail
              stages={unit.stages}
              currentStageKey={stage.key}
              buildHref={buildHref}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            {stage.status === "locked" ? (
              <LockedState description="Tahap ini terbuka setelah tahap sebelumnya memenuhi kriteria kinerja. Urutan tahap tidak dapat dilewati." />
            ) : (
              <>
                <CaseReader caseDetail={MOCK_CASE} />

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
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {MOCK_SOURCES.map((source) => (
                      <EvidenceCard
                        key={source.id}
                        item={source}
                        href={`/app/student/sources/${source.id}`}
                      />
                    ))}
                  </div>
                </section>

                <AttemptGate
                  prompt={MOCK_CASE.keyQuestion}
                  aiFeedback={MOCK_AI_FEEDBACK}
                />

                <MasteryStatus stage={stage} />
              </>
            )}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
