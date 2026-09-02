/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/states/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ClassShell } from "@/features/classes/components/class-shell";
import { EnrollStudentPanel } from "@/features/classes/components/enroll-student-panel";
import { lecturerClassNav } from "@/lib/classes/navigation";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import {
  getClassDetail,
  listClassMembers,
} from "@/server/repositories/classes";

export default async function LecturerClassStudentsPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/students">) {
  const { classId } = await params;

  await requireLecturerOfClass(classId);

  const [classItem, members] = await Promise.all([
    getClassDetail(classId),
    listClassMembers(classId),
  ]);

  if (!classItem) notFound();

  return (
    <ClassShell
      classItem={classItem}
      items={lecturerClassNav(classId)}
      overviewHref={`/app/lecturer/classes/${classId}`}
    >
      <h2 className="font-heading text-h3 font-semibold text-foreground">
        Mahasiswa
      </h2>

      <EnrollStudentPanel classId={classId} />

      {members.students.length === 0 ? (
        <EmptyState
          title="Belum ada mahasiswa"
          description="Cari mahasiswa lalu daftarkan ke kelas ini."
        />
      ) : (
        <ul className="flex flex-col">
          {members.students.map((student) => (
            <li
              key={student.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-sm last:border-b-0"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-foreground">{student.fullName}</span>
                <span className="font-mono text-xs text-subtle">
                  {student.identifier}
                </span>
              </span>
              <Link
                href={`/app/lecturer/classes/${classId}/students/${student.profileId}/portfolio`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Lihat portofolio
              </Link>
            </li>
          ))}
        </ul>
      )}

      {members.lecturers.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-5">
          <h3 className="font-mono text-xs tracking-widest text-subtle uppercase">
            Dosen pengampu
          </h3>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {members.lecturers.map((lecturer) => (
              <li key={lecturer.id}>
                {lecturer.fullName}
                {lecturer.roleInClass ? (
                  <span className="text-subtle"> · {lecturer.roleInClass}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </ClassShell>
  );
}
