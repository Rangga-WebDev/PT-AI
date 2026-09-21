/** @format */

import type { Metadata } from "next";

import { ClassCard } from "@/components/cards/class-card";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { JoinClassPanel } from "@/features/classes/components/join-class-panel";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { listClassesForStudent } from "@/server/repositories/classes";
import { listMyEnrollmentRequests } from "@/server/repositories/enrollment-requests";

export const metadata: Metadata = {
  title: "Kelas saya",
};

export default async function StudentClassesPage() {
  const user = await requireStudentAccess();
  const [classes, requests] = await Promise.all([
    listClassesForStudent(user.id),
    listMyEnrollmentRequests(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Mahasiswa"
        title="Kelas saya"
        description="Kelas yang Anda ikuti pada periode akademik berjalan."
      />
      <JoinClassPanel requests={requests} />
      {classes.length === 0 ? (
        <EmptyState description="Belum ada kelas yang disetujui." />
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
