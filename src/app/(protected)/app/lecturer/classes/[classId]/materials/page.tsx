/** @format */

import { notFound } from "next/navigation";

import { ClassShell } from "@/features/classes/components/class-shell";
import { MaterialsWorkspace } from "@/features/materials/components/materials-workspace";
import { lecturerClassNav } from "@/lib/classes/navigation";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { listClassMaterials } from "@/server/repositories/materials";

export default async function LecturerClassMaterialsPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/materials">) {
  const { classId } = await params;

  await requireLecturerOfClass(classId);

  const [classItem, materials] = await Promise.all([
    getClassDetail(classId),
    listClassMaterials(classId),
  ]);

  if (!classItem) notFound();

  return (
    <ClassShell
      classItem={classItem}
      items={lecturerClassNav(classId)}
      overviewHref={`/app/lecturer/classes/${classId}`}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-h3 font-semibold text-foreground">
          Materi
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Mahasiswa hanya melihat bahan yang sudah terbit dan ditujukan kepada
          mereka.
        </p>
      </div>
      <MaterialsWorkspace classId={classId} materials={materials} />
    </ClassShell>
  );
}
