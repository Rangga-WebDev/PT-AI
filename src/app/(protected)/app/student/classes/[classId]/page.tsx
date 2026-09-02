/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassShell } from "@/features/classes/components/class-shell";
import { studentClassNav } from "@/lib/classes/navigation";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import {
  listModulesWithUnits,
  listStudentUnits,
} from "@/server/repositories/content";
import { listClassMaterials } from "@/server/repositories/materials";

export default async function StudentClassDetailPage({
  params,
}: PageProps<"/app/student/classes/[classId]">) {
  const { classId } = await params;

  // Memastikan mahasiswa memang terdaftar sebelum data kelas dibaca.
  await requireClassAccess(classId);

  const [classItem, materials, modules, units] = await Promise.all([
    getClassDetail(classId),
    listClassMaterials(classId),
    listModulesWithUnits(classId),
    listStudentUnits(classId),
  ]);

  if (!classItem) {
    notFound();
  }

  const base = `/app/student/classes/${classId}`;

  // Jumlahnya dihitung dari yang benar-benar terlihat mahasiswa, bukan dari
  // seluruh isi kelas.
  const entries = [
    {
      href: `${base}/materials`,
      label: "Materi",
      count: `${materials.length} bahan`,
      description: "Bahan bacaan, tautan, dan berkas dari dosen.",
    },
    {
      href: `${base}/meetings`,
      label: "Pertemuan",
      count: `${modules.length} pertemuan`,
      description: "Susunan pertemuan beserta tujuannya.",
    },
    {
      href: `${base}/ptai`,
      label: "PT-AI",
      count: `${units.length} unit`,
      description: "Latihan berpikir kritis bertahap.",
    },
  ];

  return (
    <ClassShell
      classItem={classItem}
      items={studentClassNav(classId)}
      overviewHref={base}
    >
      <ul className="flex flex-col">
        {entries.map((entry) => (
          <li
            key={entry.href}
            className="border-b border-border last:border-b-0"
          >
            <Link
              href={entry.href}
              className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-surface-active focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
            >
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-foreground">
                  {entry.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {entry.description}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-subtle">
                {entry.count}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ClassShell>
  );
}
