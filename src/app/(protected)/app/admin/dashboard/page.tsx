/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { InsightCard } from "@/components/cards/insight-cards";
import { BentoGrid } from "@/components/layout/bento-grid";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { buttonVariants } from "@/components/ui/button";
import { listAcademicPeriods } from "@/server/repositories/academic-periods";
import { listClassesForAdmin } from "@/server/repositories/classes";
import { listCourses } from "@/server/repositories/courses";
import { listProfiles } from "@/server/repositories/profiles";

export const metadata: Metadata = {
  title: "Dashboard administrator",
};

export default async function AdminDashboardPage() {
  const [profiles, courses, classes, periods] = await Promise.all([
    listProfiles(),
    listCourses(),
    listClassesForAdmin(),
    listAcademicPeriods(),
  ]);

  const activePeriod = periods.find((period) => period.is_active);
  const publishedClasses = classes.filter(
    (item) => item.status === "published",
  );
  const withoutLecturer = classes.filter(
    (item) => item.lecturerNames.length === 0,
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administrasi"
        title="Ringkasan struktur akademik"
        description="Kelola akun, struktur akademik, dan kelas. Administrator tidak memiliki akses ke nilai maupun jawaban mahasiswa."
        actions={
          <Link
            href="/app/admin/users"
            className={buttonVariants({ variant: "outline" })}
          >
            Kelola pengguna
          </Link>
        }
      />

      <BentoGrid>
        <InsightCard
          className="md:col-span-4 lg:col-span-3"
          label="Pengguna"
          value={String(profiles.length)}
          tone="info"
        />
        <InsightCard
          className="md:col-span-4 lg:col-span-3"
          label="Mata kuliah"
          value={String(courses.length)}
          tone="primary"
        />
        <InsightCard
          className="md:col-span-4 lg:col-span-3"
          label="Kelas terbit"
          value={`${publishedClasses.length} / ${classes.length}`}
          tone="success"
        />
        <InsightCard
          className="md:col-span-4 lg:col-span-3"
          label="Kelas tanpa dosen"
          value={String(withoutLecturer.length)}
          tone={withoutLecturer.length > 0 ? "danger" : "success"}
          description={
            withoutLecturer.length > 0
              ? "Tugaskan dosen sebelum kelas dipublikasikan."
              : "Seluruh kelas sudah memiliki pengampu."
          }
        />
        <InsightCard
          className="md:col-span-8 lg:col-span-6"
          label="Periode akademik aktif"
          value={activePeriod?.name ?? "Belum ada"}
          tone={activePeriod ? "primary" : "evidence"}
          description={
            activePeriod
              ? `${activePeriod.start_date} sampai ${activePeriod.end_date}`
              : "Tandai satu periode sebagai aktif."
          }
        />
      </BentoGrid>
    </PageContainer>
  );
}
