/** @format */

import type { Metadata } from "next";

import { CourseCard } from "@/components/cards/learning-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { EmptyState } from "@/components/shared/states/empty-state";
import { MOCK_STUDENT_CLASSES } from "@/mocks/classes";

export const metadata: Metadata = {
  title: "Kelas saya",
};

export default function StudentClassesPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Mahasiswa"
        title="Kelas saya"
        description="Kelas yang Anda ikuti pada periode akademik berjalan."
      />
      <div className="flex flex-col gap-5">
        <MockBanner />
        {MOCK_STUDENT_CLASSES.length === 0 ? (
          <EmptyState description="Belum ada kelas yang diikuti. Hubungi dosen atau administrator Anda." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {MOCK_STUDENT_CLASSES.map((item) => (
              <CourseCard
                key={item.id}
                item={item}
                href={`/app/student/classes/${item.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
