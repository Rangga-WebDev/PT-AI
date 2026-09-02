/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { ClassCard } from "@/components/cards/class-card";
import { BentoGrid } from "@/components/layout/bento-grid";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import { listAiIncidents } from "@/server/repositories/analytics";
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

  const openIncidents = incidents.filter(
    (incident) => incident.status === "open",
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Beranda"
        title="Ringkasan pengajaran"
        description="Pantau proses berpikir mahasiswa. Keputusan akademik final tetap berada pada Anda."
        actions={
          <Link
            href="/app/lecturer/classes"
            className={buttonVariants({ variant: "outline" })}
          >
            Kelas saya
          </Link>
        }
      />

      <div className="flex flex-col gap-5">
        <BentoGrid>
          {classes.length === 0 ? (
            <div className="md:col-span-8 lg:col-span-12">
              <EmptyState
                title="Belum ada kelas"
                description="Buat kelas dari mata kuliah yang Anda ampu untuk mulai menyiapkan materi dan aktivitas."
                action={
                  <Link
                    href="/app/lecturer/classes"
                    className={buttonVariants({ size: "sm" })}
                  >
                    Buat kelas
                  </Link>
                }
              />
            </div>
          ) : (
            classes
              .slice(0, 3)
              .map((item) => (
                <ClassCard
                  key={item.id}
                  className="md:col-span-4 lg:col-span-4"
                  item={item}
                  href={`/app/lecturer/classes/${item.id}`}
                  showStatus
                  showStudentCount
                />
              ))
          )}

          <AnalyticsCard
            className="md:col-span-4 lg:col-span-6"
            title="Menunggu dinilai"
            description={
              queue.length === 0
                ? undefined
                : `${queue.length} pekerjaan mahasiswa belum Anda nilai.`
            }
          >
            {queue.length === 0 ? (
              <EmptyState description="Belum ada respons awal yang dikirim mahasiswa." />
            ) : (
              <div className="flex flex-col gap-3">
                <ul className="flex flex-col">
                  {queue.slice(0, 5).map((item) => (
                    <li
                      key={item.attemptId}
                      className="border-b border-border last:border-b-0"
                    >
                      <Link
                        href={`/app/lecturer/review/${item.attemptId}`}
                        className="flex flex-wrap items-center justify-between gap-2 py-2.5 transition-colors hover:bg-surface-active focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm text-foreground">
                            {item.studentName}
                          </span>
                          <span className="truncate font-mono text-xs text-subtle">
                            {item.className} · {item.stageTitle}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-xs text-subtle">
                          {new Date(item.submittedAt).toLocaleDateString(
                            "id-ID",
                            { dateStyle: "medium" },
                          )}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <div>
                  <Link
                    href="/app/lecturer/review"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Buka antrean review
                  </Link>
                </div>
              </div>
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
                <ul className="flex flex-col">
                  {openIncidents.slice(0, 3).map((incident) => (
                    <li
                      key={incident.id}
                      className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0"
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
                  <Link
                    href="/app/lecturer/incidents"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    Tinjau seluruh laporan
                  </Link>
                </div>
              </div>
            )}
          </AnalyticsCard>
        </BentoGrid>
      </div>
    </PageContainer>
  );
}
