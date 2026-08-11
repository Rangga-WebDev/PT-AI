/** @format */

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  CreateCriterionForm,
  CreateLevelForm,
  CreateRubricForm,
} from "@/features/course-builder/components/rubric-forms";
import { DIMENSION_LABEL, PUBLICATION_LABEL } from "@/lib/constants/stages";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import { listRubrics } from "@/server/repositories/rubrics";

export default async function RubricsPage() {
  await requireLecturerAccess();

  const rubrics = await listRubrics();

  const rubricOptions = rubrics.map((rubric) => ({
    id: rubric.id,
    label: rubric.title,
  }));

  const criterionOptions = rubrics.flatMap((rubric) =>
    rubric.criteria.map((criterion) => ({
      id: criterion.id,
      label: `${rubric.title} — ${criterion.code}`,
    })),
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Penilaian"
        title="Rubrik berpikir kritis"
        description="Setiap kriteria terikat pada satu dimensi berpikir kritis agar skor dapat diagregasi menjadi profil mahasiswa."
      />

      <div className="flex flex-col gap-5">
        <AnalyticsCard
          title="Tambah rubrik"
          description="Rubrik dapat dipakai ulang pada banyak aktivitas."
        >
          <CreateRubricForm />
        </AnalyticsCard>

        {rubricOptions.length > 0 ? (
          <AnalyticsCard
            title="Tambah kriteria"
            description="Bobot menentukan kontribusi kriteria terhadap skor akhir."
          >
            <CreateCriterionForm rubrics={rubricOptions} />
          </AnalyticsCard>
        ) : null}

        {criterionOptions.length > 0 ? (
          <AnalyticsCard
            title="Tambah level"
            description="Level menjelaskan mutu jawaban pada setiap tingkat skor."
          >
            <CreateLevelForm criteria={criterionOptions} />
          </AnalyticsCard>
        ) : null}

        <AnalyticsCard
          title="Daftar rubrik"
          description="Struktur rubrik beserta kriteria dan levelnya."
        >
          {rubrics.length === 0 ? (
            <EmptyState description="Belum ada rubrik yang dibuat." />
          ) : (
            <ul className="flex flex-col gap-4">
              {rubrics.map((rubric) => (
                <li
                  key={rubric.id}
                  className="flex flex-col gap-3 rounded-lg border border-border p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm text-foreground">
                      {rubric.title}
                    </span>
                    <StatusBadge
                      status={
                        rubric.status === "published" ? "published" : "draft"
                      }
                    >
                      {PUBLICATION_LABEL[rubric.status]}
                    </StatusBadge>
                  </div>

                  {rubric.criteria.length === 0 ? (
                    <p className="text-xs text-subtle">
                      Belum ada kriteria pada rubrik ini.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {rubric.criteria.map((criterion) => (
                        <li
                          key={criterion.id}
                          className="rounded-lg border border-border px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm text-foreground">
                              {criterion.code} · {criterion.description}
                            </span>
                            <span className="font-mono text-xs text-subtle">
                              {DIMENSION_LABEL[criterion.dimension]} · bobot{" "}
                              {criterion.weight}
                            </span>
                          </div>
                          {criterion.levels.length > 0 ? (
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {criterion.levels.map((level) => (
                                <li
                                  key={level.id}
                                  className="rounded-md border border-border px-2 py-1 text-xs text-subtle"
                                >
                                  {level.label} ({level.score}) —{" "}
                                  {level.descriptor}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-xs text-subtle">
                              Belum ada level.
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>
      </div>
    </PageContainer>
  );
}
