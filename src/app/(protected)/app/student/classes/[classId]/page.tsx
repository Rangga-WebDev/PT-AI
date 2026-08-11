/** @format */

import { notFound } from "next/navigation";

import { HeroLearningCard } from "@/components/cards/learning-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { listStudentUnits } from "@/server/repositories/content";

export default async function StudentClassDetailPage({
  params,
}: PageProps<"/app/student/classes/[classId]">) {
  const { classId } = await params;

  // Memastikan mahasiswa memang terdaftar sebelum data kelas dibaca.
  await requireClassAccess(classId);

  const [classItem, units] = await Promise.all([
    getClassDetail(classId),
    listStudentUnits(classId),
  ]);

  if (!classItem) {
    notFound();
  }

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
        {units.length === 0 ? (
          <EmptyState description="Belum ada unit pembelajaran yang diterbitkan pada kelas ini." />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {units.map((unit) => (
              <HeroLearningCard
                key={unit.id}
                moduleTitle={unit.moduleTitle}
                unitTitle={unit.title}
                stageTitle="Interpretasi"
                stageFocus={unit.objective}
                dueLabel={
                  unit.caseTitle
                    ? `Kasus: ${unit.caseTitle}`
                    : "Kasus belum tersedia"
                }
                progressPercent={0}
                href={`/app/student/learn/${unit.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
