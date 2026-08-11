/** @format */

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { CreateAcademicPeriodForm } from "@/features/administration/components/structure-forms";
import { listAcademicPeriods } from "@/server/repositories/academic-periods";

export const metadata: Metadata = {
  title: "Periode akademik",
};

export default async function AdminAcademicPeriodsPage() {
  const periods = await listAcademicPeriods();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Struktur akademik"
        title="Periode akademik"
        description="Setiap kelas terikat pada satu periode akademik."
      />

      <div className="flex flex-col gap-8">
        <section
          aria-labelledby="daftar-periode"
          className="flex flex-col gap-3"
        >
          <h2
            id="daftar-periode"
            className="font-heading text-h4 font-semibold"
          >
            Daftar periode ({periods.length})
          </h2>
          {periods.length === 0 ? (
            <EmptyState description="Belum ada periode akademik." />
          ) : (
            <ul className="flex flex-col gap-2">
              {periods.map((period) => (
                <li
                  key={period.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{period.name}</span>
                    <span className="font-mono text-xs text-subtle">
                      {period.code} · {period.start_date} — {period.end_date}
                    </span>
                  </div>
                  <StatusBadge
                    status={period.is_active ? "published" : "draft"}
                  >
                    {period.is_active ? "Aktif" : "Tidak aktif"}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          aria-labelledby="tambah-periode"
          className="rounded-xl border border-border bg-card p-5"
        >
          <h2
            id="tambah-periode"
            className="mb-4 font-heading text-h4 font-semibold"
          >
            Tambah periode
          </h2>
          <CreateAcademicPeriodForm />
        </section>
      </div>
    </PageContainer>
  );
}
