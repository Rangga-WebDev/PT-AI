/** @format */

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  CreateFacultyForm,
  CreateStudyProgramForm,
} from "@/features/administration/components/structure-forms";
import {
  listFaculties,
  listOrganizations,
  listStudyPrograms,
} from "@/server/repositories/organizations";

export const metadata: Metadata = {
  title: "Organisasi",
};

export default async function AdminOrganizationsPage() {
  const [organizations, faculties, studyPrograms] = await Promise.all([
    listOrganizations(),
    listFaculties(),
    listStudyPrograms(),
  ]);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Struktur akademik"
        title="Organisasi, fakultas, dan program studi"
        description="Struktur ini menjadi dasar penempatan mata kuliah, kelas, dan akun pengguna."
      />

      <div className="flex flex-col gap-8">
        <section aria-labelledby="organisasi" className="flex flex-col gap-3">
          <h2 id="organisasi" className="font-heading text-h4 font-semibold">
            Organisasi
          </h2>
          <ul className="flex flex-col gap-2">
            {organizations.map((organization) => (
              <li
                key={organization.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {organization.name}
                  </span>
                  <span className="font-mono text-xs text-subtle">
                    {organization.code} · {organization.timezone}
                  </span>
                </div>
                <StatusBadge
                  status={organization.is_active ? "published" : "draft"}
                >
                  {organization.is_active ? "Aktif" : "Nonaktif"}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="fakultas"
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
        >
          <h2 id="fakultas" className="font-heading text-h4 font-semibold">
            Fakultas ({faculties.length})
          </h2>
          {faculties.length === 0 ? (
            <EmptyState description="Belum ada fakultas." />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {faculties.map((faculty) => (
                <li
                  key={faculty.id}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm"
                >
                  {faculty.name}{" "}
                  <span className="font-mono text-xs text-subtle">
                    {faculty.code}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <CreateFacultyForm />
        </section>

        <section
          aria-labelledby="prodi"
          className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
        >
          <h2 id="prodi" className="font-heading text-h4 font-semibold">
            Program studi ({studyPrograms.length})
          </h2>
          {studyPrograms.length === 0 ? (
            <EmptyState description="Belum ada program studi." />
          ) : (
            <ul className="flex flex-col gap-2">
              {studyPrograms.map((program) => (
                <li
                  key={program.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span>{program.name}</span>
                  <span className="font-mono text-xs text-subtle">
                    {program.degree_level.toUpperCase()} ·{" "}
                    {program.faculties?.name ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {faculties.length > 0 ? (
            <CreateStudyProgramForm
              faculties={faculties.map((faculty) => ({
                id: faculty.id,
                label: faculty.name,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Tambahkan fakultas terlebih dahulu sebelum membuat program studi.
            </p>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
