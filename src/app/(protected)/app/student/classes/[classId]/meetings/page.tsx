/** @format */

import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/states/empty-state";
import { ClassShell } from "@/features/classes/components/class-shell";
import { MeetingList } from "@/features/classes/components/meeting-list";
import { studentClassNav } from "@/lib/classes/navigation";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { listModulesWithUnits } from "@/server/repositories/content";

export default async function StudentClassMeetingsPage({
  params,
}: PageProps<"/app/student/classes/[classId]/meetings">) {
  const { classId } = await params;

  await requireClassAccess(classId);

  // RLS hanya memperlihatkan pertemuan yang sudah diterbitkan kepada
  // mahasiswa, sehingga tidak ada penyaring status yang perlu ditulis di sini.
  const [classItem, modules] = await Promise.all([
    getClassDetail(classId),
    listModulesWithUnits(classId),
  ]);

  if (!classItem) notFound();

  return (
    <ClassShell
      classItem={classItem}
      items={studentClassNav(classId)}
      overviewHref={`/app/student/classes/${classId}`}
    >
      <h2 className="font-heading text-h3 font-semibold text-foreground">
        Pertemuan
      </h2>

      {modules.length === 0 ? (
        <EmptyState
          title="Belum ada pertemuan"
          description="Belum ada struktur pertemuan untuk kelas ini."
        />
      ) : (
        <MeetingList modules={modules} showStatus={false} />
      )}

      <p className="text-sm text-subtle">
        Materi kelas dapat dibuka dari tab Materi. Hubungan antara materi dan
        pertemuan tertentu belum tersedia.
      </p>
    </ClassShell>
  );
}
