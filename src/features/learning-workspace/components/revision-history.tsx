/** @format */

import { StatusBadge } from "@/components/shared/status-badge";
import { diffWords, summarizeDiff } from "@/lib/revision/diff";
import {
  REVISION_REASON_LABEL,
  type RevisionReasonType,
} from "@/lib/validation/revision";
import type { RevisionView } from "@/server/repositories/revisions";

interface RevisionHistoryProps {
  baseline: { content: string; submittedAt: string };
  revisions: RevisionView[];
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const SEGMENT_CLASS = {
  equal: "",
  insert: "rounded bg-success/20 text-foreground",
  delete: "rounded bg-destructive/20 text-muted-foreground line-through",
} as const;

/**
 * Diff ditampilkan terhadap versi sebelumnya, bukan hanya terhadap baseline,
 * agar mahasiswa melihat langkah perubahannya satu per satu.
 */
export function RevisionHistory({ baseline, revisions }: RevisionHistoryProps) {
  return (
    <section
      aria-labelledby="revision-history-heading"
      data-slot="revision-history"
      className="flex flex-col gap-4"
    >
      <h3
        id="revision-history-heading"
        className="font-heading text-h4 font-semibold"
      >
        Riwayat revisi
      </h3>

      <ol className="flex flex-col gap-4">
        <li
          data-slot="revision-baseline"
          className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Respons awal</span>
            <span className="font-mono text-xs text-subtle">
              {formatDateTime(baseline.submittedAt)}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">
            {baseline.content}
          </p>
        </li>

        {revisions.map((revision, index) => {
          const previous =
            index === 0
              ? baseline.content
              : (revisions[index - 1]?.content ?? baseline.content);
          const segments = diffWords(previous, revision.content);
          const summary = summarizeDiff(segments);

          return (
            <li
              key={revision.id}
              data-slot="revision-item"
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  Revisi {revision.revisionNumber}
                </span>
                <div className="flex items-center gap-2">
                  <StatusBadge status="info" withDot={false}>
                    +{summary.addedWords} / −{summary.removedWords} kata
                  </StatusBadge>
                  <span className="font-mono text-xs text-subtle">
                    {formatDateTime(revision.submittedAt)}
                  </span>
                </div>
              </div>

              <p
                data-slot="revision-diff"
                className="text-sm whitespace-pre-wrap"
              >
                {segments.map((segment, segmentIndex) => (
                  <span
                    key={segmentIndex}
                    className={SEGMENT_CLASS[segment.op]}
                    data-op={segment.op}
                  >
                    {segment.text}
                  </span>
                ))}
              </p>

              {revision.reasons.length > 0 ? (
                <ul className="flex flex-col gap-1 border-t border-border pt-2">
                  {revision.reasons.map((reason) => (
                    <li
                      key={reason.id}
                      data-slot="revision-reason"
                      className="text-sm text-muted-foreground"
                    >
                      <span className="font-medium text-foreground">
                        {REVISION_REASON_LABEL[
                          reason.reasonType as RevisionReasonType
                        ] ?? reason.reasonType}
                      </span>{" "}
                      — {reason.detail}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
