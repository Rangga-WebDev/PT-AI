/** @format */

import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/states/empty-state";
import { ClassShell } from "@/features/classes/components/class-shell";
import { StudentMaterialList } from "@/features/materials/components/student-material-list";
import { studentClassNav } from "@/lib/classes/navigation";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { listClassMaterials } from "@/server/repositories/materials";

export default async function StudentClassMaterialsPage({
  params,
}: PageProps<"/app/student/classes/[classId]/materials">) {
  const { classId } = await params;

  await requireClassAccess(classId);

  // Tidak ada penyaring status maupun visibilitas di sini: RLS yang menentukan
  // bahan mana yang boleh dilihat mahasiswa. Menyalinnya ke sini hanya akan
  // menciptakan sumber kebenaran kedua yang bisa berbeda diam-diam.
  const [classItem, materials] = await Promise.all([
    getClassDetail(classId),
    listClassMaterials(classId),
  ]);

  if (!classItem) notFound();

  return (
    <ClassShell
      classItem={classItem}
      items={studentClassNav(classId)}
      overviewHref={`/app/student/classes/${classId}`}
    >
      <h2 className="font-heading text-h3 font-semibold text-foreground">
        Materi kelas
      </h2>

      {materials.length === 0 ? (
        <EmptyState
          title="Belum ada materi"
          description="Belum ada materi yang diterbitkan untuk kelas ini."
        />
      ) : (
        <StudentMaterialList classId={classId} materials={materials} />
      )}
    </ClassShell>
  );
}
