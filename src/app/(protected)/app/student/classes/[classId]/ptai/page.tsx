/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { HeroLearningCard } from "@/components/cards/learning-cards";
import { EmptyState } from "@/components/shared/states/empty-state";
import { ClassShell } from "@/features/classes/components/class-shell";
import { studentClassNav } from "@/lib/classes/navigation";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { listStudentUnits } from "@/server/repositories/content";

export default async function StudentClassPtaiPage({
  params,
}: PageProps<"/app/student/classes/[classId]/ptai">) {
  const { classId } = await params;

  await requireClassAccess(classId);

  const [classItem, units] = await Promise.all([
    getClassDetail(classId),
    listStudentUnits(classId),
  ]);

  if (!classItem) notFound();

  return (
    <ClassShell
      classItem={classItem}
      items={studentClassNav(classId)}
      overviewHref={`/app/student/classes/${classId}`}
    >
      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-h3 font-semibold text-foreground">
          Unit PT-AI
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Latihan berpikir kritis bertahap. Membaca materi kelas tidak
          mengharuskan Anda masuk ke sini.
        </p>
        <Link
          href="/app/student/guide#memulai-ptai"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Cara mengerjakan aktivitas PT-AI
        </Link>
      </div>

      {units.length === 0 ? (
        <EmptyState
          title="Belum ada unit"
          description="Belum ada unit pembelajaran yang diterbitkan pada kelas ini."
        />
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
    </ClassShell>
  );
}
