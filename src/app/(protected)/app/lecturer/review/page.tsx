/** @format */

import type { Metadata } from "next";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { MockBanner } from "@/components/shared/mock-banner";
import { EmptyState } from "@/components/shared/states/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { MOCK_REVIEW_QUEUE } from "@/mocks/analytics";

export const metadata: Metadata = {
  title: "Antrean review",
};

export default function LecturerReviewPage() {
  return (
    <PageContainer>
      <PageHeader
        eyebrow="Dosen"
        title="Antrean review"
        description="Tinjau respons mahasiswa, beri umpan balik, dan lakukan override bila rekomendasi sistem tidak sesuai."
      />
      <div className="flex flex-col gap-5">
        <MockBanner />
        {MOCK_REVIEW_QUEUE.length === 0 ? (
          <EmptyState description="Tidak ada respons yang menunggu tinjauan." />
        ) : (
          <ul className="flex flex-col gap-3">
            {MOCK_REVIEW_QUEUE.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {item.studentName}
                  </span>
                  <span className="font-mono text-xs text-subtle">
                    {item.className} · {item.stageTitle} · {item.submittedLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge
                    status={item.status === "menunggu" ? "evidence" : "info"}
                  >
                    {item.status}
                  </StatusBadge>
                  <Button variant="outline" size="sm" disabled>
                    Tinjau (PHASE 12)
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
