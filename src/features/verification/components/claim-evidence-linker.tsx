/** @format */

import { Link2, Unlink } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import type { ClaimItem, SourceItem } from "@/types/learning";

interface ClaimEvidenceLinkerProps {
  claims: ClaimItem[];
  sources: SourceItem[];
}

/** Tampilan statis keterkaitan klaim dan bukti; penautan interaktif di PHASE 9. */
export function ClaimEvidenceLinker({
  claims,
  sources,
}: ClaimEvidenceLinkerProps) {
  return (
    <section
      aria-labelledby="klaim-heading"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <h3 id="klaim-heading" className="font-heading text-h4 font-semibold">
        Klaim dan bukti
      </h3>
      <ul className="flex flex-col gap-3">
        {claims.map((claim) => {
          const linked = sources.filter((source) =>
            claim.linkedSourceIds.includes(source.id),
          );
          return (
            <li
              key={claim.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-4"
            >
              <p className="text-sm text-foreground">{claim.text}</p>
              {linked.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {linked.map((source) => (
                    <li
                      key={source.id}
                      className="inline-flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <Link2
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0 text-evidence"
                      />
                      {source.title}
                    </li>
                  ))}
                </ul>
              ) : (
                <StatusBadge status="danger" className="w-fit">
                  <Unlink aria-hidden="true" className="size-3" />
                  Belum ada bukti tertaut
                </StatusBadge>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
