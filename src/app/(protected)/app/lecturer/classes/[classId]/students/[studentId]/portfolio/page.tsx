/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { ClassShell } from "@/features/classes/components/class-shell";
import { PortfolioIndex } from "@/features/portfolio/components/portfolio-index";
import { lecturerClassNav } from "@/lib/classes/navigation";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import {
  getClassDetail,
  getEnrolledStudent,
} from "@/server/repositories/classes";
import { getClassPortfolio } from "@/server/repositories/portfolio";

export default async function LecturerStudentPortfolioPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/students/[studentId]/portfolio">) {
  const { classId, studentId } = await params;

  await requireLecturerOfClass(classId);

  // Kepesertaan diperiksa terhadap kelas ini; id mahasiswa dari URL tidak
  // pernah cukup untuk membuka portofolionya.
  const student = await getEnrolledStudent(classId, studentId);
  if (!student) notFound();

  const [classItem, meetings] = await Promise.all([
    getClassDetail(classId),
    getClassPortfolio(classId, studentId),
  ]);

  if (!classItem) notFound();

  return (
    <ClassShell
      classItem={classItem}
      items={lecturerClassNav(classId)}
      overviewHref={`/app/lecturer/classes/${classId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs tracking-widest text-subtle uppercase">
            Portofolio mahasiswa
          </span>
          <h2 className="font-heading text-h3 font-semibold text-foreground">
            {student.fullName}
          </h2>
          <p className="font-mono text-xs text-subtle">{student.identifier}</p>
        </div>
        <Link
          href={`/app/lecturer/classes/${classId}/students`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Kembali
        </Link>
      </div>

      <PortfolioIndex
        meetings={meetings}
        hrefFor={(moduleId) =>
          `/app/lecturer/classes/${classId}/students/${studentId}/portfolio/${moduleId}`
        }
        emptyDescription="Mahasiswa ini belum mengerjakan aktivitas PT-AI apa pun."
      />
    </ClassShell>
  );
}
