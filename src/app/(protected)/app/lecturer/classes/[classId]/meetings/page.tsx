/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/states/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ClassShell } from "@/features/classes/components/class-shell";
import { MeetingList } from "@/features/classes/components/meeting-list";
import { lecturerClassNav } from "@/lib/classes/navigation";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { listModulesWithUnits } from "@/server/repositories/content";

export default async function LecturerClassMeetingsPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/meetings">) {
  const { classId } = await params;

  await requireLecturerOfClass(classId);

  const [classItem, modules] = await Promise.all([
    getClassDetail(classId),
    listModulesWithUnits(classId),
  ]);

  if (!classItem) notFound();

  const unpublished = modules.filter(
    (module) => module.status !== "published",
  ).length;

  return (
    <ClassShell
      classItem={classItem}
      items={lecturerClassNav(classId)}
      overviewHref={`/app/lecturer/classes/${classId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-h3 font-semibold text-foreground">
            Pertemuan
          </h2>
          {unpublished > 0 ? (
            <p className="text-sm text-muted-foreground">
              {unpublished} pertemuan belum terbit dan belum terlihat mahasiswa.
            </p>
          ) : null}
        </div>
        <Link
          href={`/app/lecturer/classes/${classId}/builder`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Kelola di perancang materi
        </Link>
      </div>

      {modules.length === 0 ? (
        <EmptyState
          title="Belum ada pertemuan"
          description="Belum ada struktur pertemuan. Susun sendiri di perancang materi, atau terapkan draf dari Quick Setup."
        />
      ) : (
        <MeetingList modules={modules} showStatus />
      )}
    </ClassShell>
  );
}
