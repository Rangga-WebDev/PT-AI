/** @format */

import { StatusBadge } from "@/components/shared/status-badge";
import type { CaseDetail } from "@/types/learning";

interface CaseReaderProps {
  caseDetail: CaseDetail;
}

/** Teks kasus dirender di kanvas baca hangat dengan lebar baca terbatas. */
export function CaseReader({ caseDetail }: CaseReaderProps) {
  return (
    <article className="reading-surface rounded-xl border border-reading-border p-6 md:p-8">
      <div className="reading-prose mx-auto flex flex-col gap-5">
        <StatusBadge status="info" className="w-fit">
          {caseDetail.context}
        </StatusBadge>
        <h2 className="font-heading text-h2 font-semibold">
          {caseDetail.title}
        </h2>
        {caseDetail.paragraphs.map((paragraph, index) => (
          <p key={index} className="text-body-lg">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-lg border border-reading-border bg-reading-highlight/60 p-4">
          <p className="font-mono text-xs tracking-widest uppercase opacity-70">
            Pertanyaan kunci
          </p>
          <p className="mt-1 font-medium">{caseDetail.keyQuestion}</p>
        </aside>
      </div>
    </article>
  );
}
