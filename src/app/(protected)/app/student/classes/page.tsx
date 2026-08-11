/** @format */

import type { Metadata } from "next";

import { ClassCard } from "@/components/cards/class-card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { listClassesForStudent } from "@/server/repositories/classes";

export const metadata: Metadata = {
  title: "Kelas saya",
};

export default async function StudentClassesPage() {
  const user = await requireStudentAccess();
  const classes = await listClassesForStudent(user.id);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Mahasiswa"
        title="Kelas saya"
        description="Kelas yang Anda ikuti pada periode akademik berjalan."
      />
      {classes.length === 0 ? (
        <EmptyState description="Belum ada kelas yang diikuti. Hubungi dosen atau administrator Anda." />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {classes.map((item) => (
            <ClassCard
              key={item.id}
              item={item}
              href={`/app/student/classes/${item.id}`}
            />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
