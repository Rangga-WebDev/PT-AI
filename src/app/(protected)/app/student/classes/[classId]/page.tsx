/** @format */

import { notFound } from "next/navigation";

import { CaseCard, HeroLearningCard } from "@/components/cards/learning-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { MOCK_CASE } from "@/mocks/cases";
import { MOCK_ACTIVE_UNIT } from "@/mocks/units";

export default async function StudentClassDetailPage({
  params,
}: PageProps<"/app/student/classes/[classId]">) {
  const { classId } = await params;

  // Memastikan mahasiswa memang terdaftar sebelum data kelas dibaca.
  await requireClassAccess(classId);
  const classItem = await getClassDetail(classId);

  if (!classItem) {
    notFound();
  }

  const currentStage = MOCK_ACTIVE_UNIT.stages.find(
    (stage) => stage.key === MOCK_ACTIVE_UNIT.currentStageKey,
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`${classItem.code} · ${classItem.academicPeriod}`}
        title={classItem.name}
        description={`${classItem.courseName} · ${
          classItem.lecturerNames.join(", ") || "Belum ada dosen pengampu"
        }`}
      />
      <div className="flex flex-col gap-5">
        <MockBanner />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <HeroLearningCard
            moduleTitle={MOCK_ACTIVE_UNIT.moduleTitle}
            unitTitle={MOCK_ACTIVE_UNIT.title}
            stageTitle={currentStage?.title ?? "Interpretasi"}
            stageFocus={currentStage?.focus ?? "Memahami konteks"}
            dueLabel={MOCK_ACTIVE_UNIT.dueLabel}
            progressPercent={42}
            href={`/app/student/learn/${MOCK_ACTIVE_UNIT.id}`}
          />
          <CaseCard item={MOCK_CASE} />
        </div>
      </div>
    </PageContainer>
  );
}
