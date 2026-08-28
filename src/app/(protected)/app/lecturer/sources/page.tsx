/** @format */

import type { Metadata } from "next";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  CreateSourceForm,
  CreateSourceVersionForm,
} from "@/features/verification/components/source-forms";
import { SOURCE_TYPE_LABEL } from "@/lib/constants/verification";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import { listSources } from "@/server/repositories/sources";

export const metadata: Metadata = {
  title: "Kurasi sumber",
};

export default async function LecturerSourcesPage() {
  await requireLecturerAccess();
  const sources = await listSources();

  const sourceOptions = sources.map((source) => ({
    id: source.id,
    label: source.title,
  }));

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Bukti"
        title="Kurasi sumber"
        description="Sumber terkurasi menjadi batas bukti yang boleh dipakai mahasiswa. Versi dipisahkan agar kutipan tetap dapat ditelusuri saat sumber diperbarui."
      />

      <div className="flex flex-col gap-5">
        <AnalyticsCard
          title="Tambah sumber"
          description="Metadata lengkap memudahkan mahasiswa menilai kredibilitas."
        >
          <CreateSourceForm />
        </AnalyticsCard>

        {sourceOptions.length > 0 ? (
          <AnalyticsCard
            title="Tambah versi sumber"
            description="Setiap versi mencatat kapan sumber diambil dan apa isinya."
          >
            <CreateSourceVersionForm sources={sourceOptions} />
          </AnalyticsCard>
        ) : null}

        <AnalyticsCard
          title="Daftar sumber"
          description="Sumber yang tersedia untuk dilampirkan ke kasus."
        >
          {sources.length === 0 ? (
            <EmptyState description="Belum ada sumber terkurasi." />
          ) : (
            <ul className="flex flex-col gap-3">
              {sources.map((source) => (
                <li
                  key={source.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm text-foreground">
                        {source.title}
                      </span>
                      <span className="font-mono text-xs text-subtle">
                        {SOURCE_TYPE_LABEL[source.sourceType]}
                        {source.publisher ? ` · ${source.publisher}` : ""}
                        {source.publishedAt ? ` · ${source.publishedAt}` : ""}
                      </span>
                    </div>
                    <StatusBadge
                      status={
                        source.versions.length > 0 ? "verified" : "danger"
                      }
                    >
                      {source.versions.length} versi
                    </StatusBadge>
                  </div>
                  {source.versions.length === 0 ? (
                    <p className="text-xs text-subtle">
                      Belum ada versi. Mahasiswa belum dapat membaca kutipannya.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {source.versions.map((version) => (
                        <li
                          key={version.id}
                          className="rounded-md border border-border px-2 py-1 font-mono text-xs text-subtle"
                        >
                          {version.versionLabel} · diambil{" "}
                          {new Date(version.retrievedAt).toLocaleDateString(
                            "id-ID",
                            { dateStyle: "medium" },
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
