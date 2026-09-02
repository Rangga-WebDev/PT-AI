/** @format */

import Link from "next/link";

import { EmptyState } from "@/components/shared/states/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { formatObservedDuration } from "@/lib/portfolio/aggregate";
import type { MeetingPortfolio } from "@/lib/portfolio/types";

function summarize(item: MeetingPortfolio): string[] {
  const parts: string[] = [];
  const { counts } = item;

  if (counts.activities > 0) parts.push(`${counts.activities} aktivitas`);
  if (counts.revisions > 0) parts.push(`${counts.revisions} revisi`);
  if (counts.verifications > 0)
    parts.push(`${counts.verifications} verifikasi`);
  if (counts.aiAssistance > 0) parts.push(`${counts.aiAssistance} bantuan AI`);
  if (counts.reflections > 0) parts.push(`${counts.reflections} refleksi`);
  if (counts.lecturerFeedback > 0) {
    parts.push(`${counts.lecturerFeedback} umpan balik dosen`);
  }

  const duration = formatObservedDuration(item.observedSeconds);
  if (duration) parts.push(`${duration} teramati`);

  return parts;
}

/**
 * Ringkasan hanya menyebut apa yang benar-benar tercatat. Pertemuan tanpa
 * artefak dinyatakan kosong, bukan diberi kemajuan nol persen.
 */
export function PortfolioIndex({
  meetings,
  hrefFor,
  emptyDescription,
}: {
  meetings: MeetingPortfolio[];
  hrefFor: (moduleId: string) => string;
  emptyDescription: string;
}) {
  if (meetings.length === 0) {
    return (
      <EmptyState title="Belum ada pertemuan" description={emptyDescription} />
    );
  }

  const anyEvidence = meetings.some((item) => item.hasEvidence);

  return (
    <div className="flex flex-col gap-4">
      {!anyEvidence ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          {emptyDescription}
        </p>
      ) : null}

      <ol className="flex flex-col">
        {meetings.map((item) => {
          const parts = summarize(item);

          return (
            <li
              key={item.meeting.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-mono text-xs tracking-widest text-subtle uppercase">
                  Pertemuan {item.meeting.sequence}
                </span>
                <span className="font-medium text-foreground">
                  {item.meeting.title}
                </span>
                <span className="text-sm text-muted-foreground">
                  {parts.length > 0
                    ? parts.join(" · ")
                    : "Belum ada aktivitas PT-AI yang tercatat"}
                </span>
              </div>

              {item.hasEvidence ? (
                <Link
                  href={hrefFor(item.meeting.id)}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Lihat portofolio
                </Link>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
