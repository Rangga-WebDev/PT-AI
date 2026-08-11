/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsCard, InsightCard } from "@/components/cards/insight-cards";
import { ClassCard } from "@/components/cards/class-card";
import { BentoGrid } from "@/components/layout/bento-grid";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  MOCK_INCIDENTS,
  MOCK_MASTERY_DISTRIBUTION,
  MOCK_REVIEW_QUEUE,
} from "@/mocks/analytics";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import { listClassesForLecturer } from "@/server/repositories/classes";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard dosen",
};

const TONE_CLASS = {
  success: "bg-success",
  info: "bg-info",
  evidence: "bg-evidence",
  danger: "bg-destructive",
} as const;

export default async function LecturerDashboardPage() {
  const user = await requireLecturerAccess();
  const classes = await listClassesForLecturer(user.id);

  const totalStudents = MOCK_MASTERY_DISTRIBUTION.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Beranda dosen"
        title="Ringkasan pengajaran"
        description="Pantau proses berpikir mahasiswa. Keputusan akademik final tetap berada pada Anda."
        actions={
          <Button
            variant="outline"
            render={<Link href="/app/lecturer/review" />}
          >
            Buka antrean review
          </Button>
        }
      />

      <div className="flex flex-col gap-5">
        <MockBanner />

        <BentoGrid>
          <AnalyticsCard
            className="md:col-span-8 lg:col-span-7"
            title="Distribusi ketuntasan"
            description={`${totalStudents} mahasiswa pada tahap evaluasi bukti.`}
          >
            <ul className="flex flex-col gap-3">
              {MOCK_MASTERY_DISTRIBUTION.map((item) => (
                <li key={item.label} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.count} mahasiswa
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-active">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        TONE_CLASS[item.tone],
                      )}
                      style={{
                        width: `${Math.round((item.count / totalStudents) * 100)}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </AnalyticsCard>

          <InsightCard
            className="md:col-span-4 lg:col-span-5"
            label="Menunggu review"
            value={String(
              MOCK_REVIEW_QUEUE.filter((item) => item.status === "menunggu")
                .length,
            )}
            tone="evidence"
            description="Respons mahasiswa yang belum Anda tinjau."
          />

          <AnalyticsCard
            className="md:col-span-4 lg:col-span-6"
            title="Antrean review terbaru"
          >
            <ul className="flex flex-col gap-3">
              {MOCK_REVIEW_QUEUE.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm text-foreground">
                      {item.studentName}
                    </span>
                    <span className="font-mono text-xs text-subtle">
                      {item.className} · {item.stageTitle} ·{" "}
                      {item.submittedLabel}
                    </span>
                  </div>
                  <StatusBadge
                    status={item.status === "menunggu" ? "evidence" : "info"}
                  >
                    {item.status}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </AnalyticsCard>

          <AnalyticsCard
            className="md:col-span-4 lg:col-span-6"
            title="Laporan respons AI"
            description="Insiden yang dilaporkan mahasiswa dan menunggu tindak lanjut Anda."
          >
            <ul className="flex flex-col gap-3">
              {MOCK_INCIDENTS.map((incident) => (
                <li
                  key={incident.id}
                  className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/[0.06] p-3"
                >
                  <span className="font-mono text-xs text-subtle">
                    {incident.className} · {incident.reportedLabel}
                  </span>
                  <span className="text-sm text-foreground">
                    {incident.reason}
                  </span>
                </li>
              ))}
            </ul>
          </AnalyticsCard>

          {classes.slice(0, 2).map((item) => (
            <ClassCard
              key={item.id}
              className="md:col-span-4 lg:col-span-6"
              item={item}
              href={`/app/lecturer/classes/${item.id}`}
              showStatus
            />
          ))}
        </BentoGrid>
      </div>
    </PageContainer>
  );
}
