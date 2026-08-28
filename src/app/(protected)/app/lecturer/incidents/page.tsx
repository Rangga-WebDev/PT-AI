/** @format */

import type { Metadata } from "next";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/states/empty-state";
import { IncidentResolutionForm } from "@/features/analytics/components/incident-resolution-form";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import { listAiIncidents } from "@/server/repositories/analytics";

export const metadata: Metadata = {
  title: "Laporan respons AI",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Baru dilaporkan",
  reviewing: "Sedang ditinjau",
  resolved: "Selesai ditangani",
  dismissed: "Tidak berdasar",
};

export default async function LecturerIncidentsPage() {
  await requireLecturerAccess();
  const incidents = await listAiIncidents();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dosen"
        title="Laporan respons AI"
        description="Laporan mahasiswa atas umpan balik AI yang dianggap mengarahkan, keliru, atau tidak dapat ditelusuri. Penanganan adalah keputusan akademik, bukan administratif."
      />

      <AnalyticsCard
        title="Daftar laporan"
        description="Diurutkan dari yang terbaru."
      >
        {incidents.length === 0 ? (
          <EmptyState description="Belum ada laporan dari mahasiswa." />
        ) : (
          <ul className="flex flex-col gap-4">
            {incidents.map((incident) => (
              <li
                key={incident.id}
                data-slot="incident-item"
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {incident.className}
                      {incident.feedbackTitle
                        ? ` — ${incident.feedbackTitle}`
                        : ""}
                    </span>
                    <span className="font-mono text-xs text-subtle">
                      Dilaporkan {incident.reporterName ?? "mahasiswa"} ·{" "}
                      {new Date(incident.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                  <StatusBadge
                    status={
                      incident.status === "resolved"
                        ? "verified"
                        : incident.status === "dismissed"
                          ? "info"
                          : "danger"
                    }
                  >
                    {STATUS_LABEL[incident.status] ?? incident.status}
                  </StatusBadge>
                </div>

                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {incident.reason}
                </p>

                {incident.resolutionNote ? (
                  <p
                    data-slot="incident-resolution-note"
                    className="rounded-lg border border-border bg-surface-active/50 p-3 text-sm text-muted-foreground"
                  >
                    {incident.resolutionNote}
                  </p>
                ) : null}

                <IncidentResolutionForm incidentId={incident.id} />
              </li>
            ))}
          </ul>
        )}
      </AnalyticsCard>
    </PageContainer>
  );
}
