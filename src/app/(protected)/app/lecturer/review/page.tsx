/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsCard } from "@/components/cards/insight-cards";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { requireLecturerAccess } from "@/lib/supabase/auth";
import { listReviewQueue } from "@/server/repositories/attempts";

export const metadata: Metadata = {
  title: "Antrean review",
};

export default async function LecturerReviewPage() {
  await requireLecturerAccess();
  const queue = await listReviewQueue();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dosen"
        title="Antrean review"
        description="Respons awal mahasiswa pada kelas yang Anda ampu. Respons bersifat permanen dan tidak dapat diubah siapa pun."
      />
      <div className="flex flex-col gap-5">
        <AnalyticsCard
          title="Respons awal masuk"
          description="Diurutkan dari yang terbaru."
        >
          {queue.length === 0 ? (
            <EmptyState description="Belum ada respons awal yang dikirim mahasiswa." />
          ) : (
            <ul className="flex flex-col gap-3">
              {queue.map((item) => (
                <li
                  key={item.attemptId}
                  className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {item.studentName}
                      </span>
                      <span className="font-mono text-xs text-subtle">
                        {item.studentIdentifier} · {item.className} ·{" "}
                        {item.unitTitle} · {item.stageTitle}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status="verified">Baseline</StatusBadge>
                      <Link
                        href={`/app/lecturer/review/${item.attemptId}`}
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                        })}
                      >
                        Nilai
                      </Link>
                    </div>
                  </div>
                  <p className="font-mono text-xs text-subtle">
                    {item.activityTitle} ·{" "}
                    {new Date(item.submittedAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <blockquote className="rounded-lg border border-border bg-surface-active/50 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
                    {item.content}
                  </blockquote>
                </li>
              ))}
            </ul>
          )}
        </AnalyticsCard>
      </div>
    </PageContainer>
  );
}
