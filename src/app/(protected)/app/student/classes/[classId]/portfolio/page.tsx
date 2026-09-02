/** @format */

import { notFound } from "next/navigation";

import { ClassShell } from "@/features/classes/components/class-shell";
import { PortfolioIndex } from "@/features/portfolio/components/portfolio-index";
import { studentClassNav } from "@/lib/classes/navigation";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { getClassPortfolio } from "@/server/repositories/portfolio";

export default async function StudentPortfolioPage({
  params,
}: PageProps<"/app/student/classes/[classId]/portfolio">) {
  const { classId } = await params;

  // Portofolio selalu milik pengguna yang sedang masuk; tidak ada studentId
  // yang datang dari URL sehingga tidak ada yang dapat ditukar.
  const user = await requireClassAccess(classId);

  const [classItem, meetings] = await Promise.all([
    getClassDetail(classId),
    getClassPortfolio(classId, user.id),
  ]);

  if (!classItem) notFound();

  return (
    <ClassShell
      classItem={classItem}
      items={studentClassNav(classId)}
      overviewHref={`/app/student/classes/${classId}`}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-h3 font-semibold text-foreground">
          Portofolio saya
        </h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          Jejak proses belajar Anda pada setiap pertemuan: respons awal, bantuan
          AI, verifikasi sumber, revisi, refleksi, dan penilaian dosen.
        </p>
      </div>

      <PortfolioIndex
        meetings={meetings}
        hrefFor={(moduleId) =>
          `/app/student/classes/${classId}/portfolio/${moduleId}`
        }
        emptyDescription="Portofolio akan terbentuk ketika Anda mulai mengerjakan aktivitas PT-AI."
      />
    </ClassShell>
  );
}
