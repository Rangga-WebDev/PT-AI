/** @format */

import type { Metadata } from "next";

import { ClassCard } from "@/components/cards/class-card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import { listClassesForLecturer } from "@/server/repositories/classes";

export const metadata: Metadata = {
  title: "Kelas yang diampu",
};

export default async function LecturerClassesPage() {
  const user = await requireLecturerAccess();
  const classes = await listClassesForLecturer(user.id);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dosen"
        title="Kelas yang diampu"
        description="Kelas yang ditugaskan kepada Anda pada periode akademik berjalan."
      />
      {classes.length === 0 ? (
        <EmptyState description="Belum ada kelas yang ditugaskan kepada Anda. Hubungi administrator." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((item) => (
            <ClassCard
              key={item.id}
              item={item}
              href={`/app/lecturer/classes/${item.id}`}
              showStatus
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
