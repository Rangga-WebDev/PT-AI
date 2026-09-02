/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { ClassShell } from "@/features/classes/components/class-shell";
import { PublishClassControl } from "@/features/classes/components/publish-class-control";
import { lecturerClassNav } from "@/lib/classes/navigation";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import {
  getClassDetail,
  listClassMembers,
} from "@/server/repositories/classes";
import { listModulesWithUnits } from "@/server/repositories/content";
import { listClassMaterials } from "@/server/repositories/materials";

const STATUS_LABEL = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
} as const;

export default async function LecturerClassDetailPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]">) {
  const { classId } = await params;

  // Dosen hanya boleh membuka kelas yang ditugaskan kepadanya.
  await requireLecturerOfClass(classId);

  const [classItem, members, modules, materials] = await Promise.all([
    getClassDetail(classId),
    listClassMembers(classId),
    listModulesWithUnits(classId),
    listClassMaterials(classId),
  ]);

  if (!classItem) {
    notFound();
  }

  const base = `/app/lecturer/classes/${classId}`;
  const publishedUnits = modules.reduce(
    (total, module) =>
      total + module.units.filter((unit) => unit.status === "published").length,
    0,
  );

  const entries = [
    {
      href: `${base}/materials`,
      label: "Materi",
      count: `${materials.length} bahan`,
      description: "Bahan ajar yang Anda kelola untuk kelas ini.",
    },
    {
      href: `${base}/meetings`,
      label: "Pertemuan",
      count: `${modules.length} pertemuan`,
      description: "Susunan pertemuan beserta tujuannya.",
    },
    {
      href: `${base}/builder`,
      label: "PT-AI",
      count: `${publishedUnits} unit terbit`,
      description: "Unit berpikir kritis, kasus, dan aktivitasnya.",
    },
    {
      href: `${base}/students`,
      label: "Mahasiswa",
      count: `${members.students.length} terdaftar`,
      description: "Peserta kelas dan dosen pengampu.",
    },
  ];

  // Perkakas pedagogis dan penelitian tidak masuk bilah utama supaya
  // navigasinya tetap terasa seperti LMS, tetapi tetap terjangkau dari sini.
  const secondary = [
    { href: `${base}/quick-setup`, label: "Quick Setup AI" },
    { href: `${base}/instruments`, label: "Instrumen" },
    { href: `${base}/branching`, label: "Percabangan" },
  ];

  return (
    <ClassShell
      classItem={classItem}
      items={lecturerClassNav(classId)}
      overviewHref={base}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge
          status={classItem.status === "published" ? "published" : "draft"}
        >
          {STATUS_LABEL[classItem.status]}
        </StatusBadge>
        <PublishClassControl classId={classId} status={classItem.status} />
      </div>

      {materials.length === 0 && modules.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
          <p className="text-sm text-muted-foreground">
            Kelas ini masih kosong. Mulai dari bahan ajar atau dari RPS.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${base}/materials`}
              className={buttonVariants({ variant: "primary", size: "sm" })}
            >
              Tambah materi
            </Link>
            <Link
              href={`${base}/quick-setup`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Siapkan dari RPS
            </Link>
          </div>
        </div>
      ) : null}

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

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-5">
        {secondary.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </ClassShell>
  );
}
