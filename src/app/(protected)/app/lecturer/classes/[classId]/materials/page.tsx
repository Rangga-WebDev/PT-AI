/** @format */

import { notFound } from "next/navigation";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MaterialsWorkspace } from "@/features/materials/components/materials-workspace";
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
    <PageContainer>
      <PageHeader
        eyebrow={classItem.name}
        title="Materi"
        description="Bahan ajar kelas ini. Mahasiswa hanya melihat bahan yang sudah terbit dan ditujukan kepada mereka."
      />
      <MaterialsWorkspace classId={classId} materials={materials} />
    </PageContainer>
  );
}
