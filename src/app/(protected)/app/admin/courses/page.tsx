/** @format */

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { CreateCourseForm } from "@/features/administration/components/structure-forms";
import { listCourses } from "@/server/repositories/courses";
import { listStudyPrograms } from "@/server/repositories/organizations";

export const metadata: Metadata = {
  title: "Mata kuliah",
};

export default async function AdminCoursesPage() {
  const [courses, studyPrograms] = await Promise.all([
    listCourses(),
    listStudyPrograms(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Struktur akademik"
        title="Mata kuliah"
        description="Mata kuliah menjadi induk kelas yang dibuka pada tiap periode akademik."
      />

      <div className="flex flex-col gap-8">
        <section aria-labelledby="daftar-mk" className="flex flex-col gap-3">
          <h2 id="daftar-mk" className="font-heading text-h4 font-semibold">
            Daftar mata kuliah ({courses.length})
          </h2>
          {courses.length === 0 ? (
            <EmptyState description="Belum ada mata kuliah." />
          ) : (
            <ul className="flex flex-col gap-2">
              {courses.map((course) => (
                <li
                  key={course.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{course.name}</span>
                    <span className="font-mono text-xs text-subtle">
                      {course.code} · {course.credits} SKS ·{" "}
                      {course.study_programs?.name ?? "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="tambah-mk"
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2
            id="tambah-mk"
            className="mb-4 font-heading text-h4 font-semibold"
          >
            Tambah mata kuliah
          </h2>
          {studyPrograms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tambahkan program studi terlebih dahulu.
            </p>
          ) : (
            <CreateCourseForm
              studyPrograms={studyPrograms.map((program) => ({
                id: program.id,
                label: program.name,
              }))}
            />
          )}
        </section>
      </div>
    </PageContainer>
  );
}
