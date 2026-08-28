/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsCard, InsightCard } from "@/components/cards/insight-cards";
import { ClassCard } from "@/components/cards/class-card";
import { BentoGrid } from "@/components/layout/bento-grid";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { Button } from "@/components/ui/button";
import { MasteryDistribution } from "@/features/analytics/components/analytics-cards";
import { summarizeMasteryDistribution } from "@/lib/analytics/aggregate";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import {
  getClassMasterySnapshot,
  listAiIncidents,
} from "@/server/repositories/analytics";
import { listReviewQueue } from "@/server/repositories/attempts";
import { listClassesForLecturer } from "@/server/repositories/classes";

export const metadata: Metadata = {
  title: "Dashboard dosen",
};

export default async function LecturerDashboardPage() {
  const user = await requireLecturerAccess();
  const [classes, queue, incidents] = await Promise.all([
    listClassesForLecturer(user.id),
    listReviewQueue(),
    listAiIncidents(),
  ]);

  const primaryClass = classes[0] ?? null;
  const snapshot = primaryClass
    ? await getClassMasterySnapshot(primaryClass.id)
    : { enrolledCount: 0, outcomes: [] };
  const distribution = summarizeMasteryDistribution(snapshot);

  const openIncidents = incidents.filter(
    (incident) => incident.status === "open",
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
        <BentoGrid>
          <AnalyticsCard
            className="md:col-span-8 lg:col-span-7"
            title="Distribusi ketuntasan"
            description={
              primaryClass
                ? `${primaryClass.name} · ${snapshot.enrolledCount} mahasiswa terdaftar.`
                : "Belum ada kelas yang Anda ampu."
            }
          >
            {snapshot.enrolledCount === 0 ? (
              <EmptyState description="Belum ada mahasiswa terdaftar pada kelas ini." />
            ) : (
              <MasteryDistribution slices={distribution} />
            )}
          </AnalyticsCard>

          <InsightCard
            className="md:col-span-4 lg:col-span-5"
            label="Menunggu review"
            value={String(queue.length)}
            tone="evidence"
            description="Respons awal mahasiswa yang belum Anda nilai."
          />

          <AnalyticsCard
            className="md:col-span-4 lg:col-span-6"
            title="Antrean review terbaru"
          >
            {queue.length === 0 ? (
              <EmptyState description="Belum ada respons awal yang dikirim mahasiswa." />
            ) : (
              <ul className="flex flex-col gap-3">
                {queue.slice(0, 5).map((item) => (
                  <li
                    key={item.attemptId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm text-foreground">
                        {item.studentName}
                      </span>
                      <span className="font-mono text-xs text-subtle">
                        {item.className} · {item.stageTitle} ·{" "}
                        {new Date(item.submittedAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      render={
                        <Link href={`/app/lecturer/review/${item.attemptId}`} />
                      }
                    >
                      Nilai
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </AnalyticsCard>

          <AnalyticsCard
            className="md:col-span-4 lg:col-span-6"
            title="Laporan respons AI"
            description="Insiden yang dilaporkan mahasiswa dan menunggu tindak lanjut Anda."
          >
            {openIncidents.length === 0 ? (
              <EmptyState description="Tidak ada laporan yang menunggu tindak lanjut." />
            ) : (
              <div className="flex flex-col gap-3">
                <ul className="flex flex-col gap-3">
                  {openIncidents.slice(0, 3).map((incident) => (
                    <li
                      key={incident.id}
                      className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/[0.06] p-3"
                    >
                      <span className="font-mono text-xs text-subtle">
                        {incident.className} ·{" "}
                        {new Date(incident.createdAt).toLocaleDateString(
                          "id-ID",
                          { dateStyle: "medium" },
                        )}
                      </span>
                      <span className="text-sm text-foreground">
                        {incident.reason}
                      </span>
                    </li>
                  ))}
                </ul>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href="/app/lecturer/incidents" />}
                  >
                    Tinjau seluruh laporan
                  </Button>
                </div>
              </div>
            )}
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
