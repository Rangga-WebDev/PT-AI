/** @format */

import type { Metadata } from "next";

import { CourseCard } from "@/components/cards/learning-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { MOCK_LECTURER_CLASSES } from "@/mocks/classes";

export const metadata: Metadata = {
  title: "Kelas yang diampu",
};

export default function LecturerClassesPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dosen"
        title="Kelas yang diampu"
        description="Kelas yang ditugaskan kepada Anda pada periode akademik berjalan."
      />
      <div className="flex flex-col gap-5">
        <MockBanner />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MOCK_LECTURER_CLASSES.map((item) => (
            <CourseCard
              key={item.id}
              item={item}
              href={`/app/lecturer/classes/${item.id}`}
            />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
