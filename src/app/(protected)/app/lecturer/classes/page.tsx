/** @format */

import type { Metadata } from "next";

import Link from "next/link";

import { ClassCard } from "@/components/cards/class-card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { CreateClassPanel } from "@/features/classes/components/create-class-form";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import { listAcademicPeriods } from "@/server/repositories/academic-periods";
import { listClassesForLecturer } from "@/server/repositories/classes";
import { listCourses } from "@/server/repositories/courses";

export const metadata: Metadata = {
  title: "Kelas yang diampu",
};

export default async function LecturerClassesPage() {
  const user = await requireLecturerAccess();
  const [classes, courses, periods] = await Promise.all([
    listClassesForLecturer(user.id),
    listCourses(),
    listAcademicPeriods(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dosen"
        title="Kelas yang diampu"
        description="Kelas yang Anda ampu, termasuk yang Anda buat sendiri."
        actions={
          <Link
            href="/app/lecturer/guide#membuat-kelas"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Panduan membuat kelas
          </Link>
        }
      />

      <CreateClassPanel
        courses={courses.map((course) => ({
          id: course.id,
          name: course.name,
          code: course.code,
        }))}
        periods={periods.map((period) => ({
          id: period.id,
          name: period.name,
          isActive: period.is_active,
        }))}
      />

      {classes.length === 0 ? (
        <EmptyState description="Belum ada kelas. Buat kelas dari mata kuliah yang Anda ampu, atau hubungi administrator bila kelas seharusnya sudah ditugaskan." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => (
            <ClassCard
              key={item.id}
              item={item}
              href={`/app/lecturer/classes/${item.id}`}
              showStatus
              showStudentCount
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
