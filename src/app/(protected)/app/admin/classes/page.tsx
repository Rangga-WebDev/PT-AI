/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { CreateClassForm } from "@/features/administration/components/structure-forms";
import { listAcademicPeriods } from "@/server/repositories/academic-periods";
import { listClassesForAdmin } from "@/server/repositories/classes";
import { listCourses } from "@/server/repositories/courses";

export const metadata: Metadata = {
  title: "Kelas",
};

const STATUS_LABEL = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
} as const;

export default async function AdminClassesPage() {
  const [classes, courses, periods] = await Promise.all([
    listClassesForAdmin(),
    listCourses(),
    listAcademicPeriods(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Struktur akademik"
        title="Kelas"
        description="Kelas dibuat sebagai draf. Tugaskan dosen dan daftarkan mahasiswa sebelum menerbitkannya."
      />

      <div className="flex flex-col gap-8">
        <section aria-labelledby="daftar-kelas" className="flex flex-col gap-3">
          <h2 id="daftar-kelas" className="font-heading text-h4 font-semibold">
            Daftar kelas ({classes.length})
          </h2>
          {classes.length === 0 ? (
            <EmptyState description="Belum ada kelas yang dibuat." />
          ) : (
            <ul className="flex flex-col gap-2">
              {classes.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{item.name}</span>
                    <span className="font-mono text-xs text-subtle">
                      {item.code} · {item.courseName} · {item.academicPeriod}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.lecturerNames.length > 0
                        ? item.lecturerNames.join(", ")
                        : "Belum ada dosen"}{" "}
                      · {item.studentCount} mahasiswa
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      status={
                        item.status === "published" ? "published" : "draft"
                      }
                    >
                      {STATUS_LABEL[item.status]}
                    </StatusBadge>
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link href={`/app/admin/classes/${item.id}`} />}
                    >
                      Kelola
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="tambah-kelas"
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2
            id="tambah-kelas"
            className="mb-4 font-heading text-h4 font-semibold"
          >
            Buat kelas
          </h2>
          {courses.length === 0 || periods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tambahkan mata kuliah dan periode akademik terlebih dahulu.
            </p>
          ) : (
            <CreateClassForm
              courses={courses.map((course) => ({
                id: course.id,
                label: `${course.code} — ${course.name}`,
              }))}
              periods={periods.map((period) => ({
                id: period.id,
                label: period.name,
              }))}
            />
          )}
        </section>
      </div>
    </PageContainer>
  );
}
