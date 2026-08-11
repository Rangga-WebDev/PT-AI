/** @format */

import { ExternalLink } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import type { SourceItem } from "@/types/learning";

const METADATA_LABEL: Array<[string, keyof SourceItem]> = [
  ["Penulis", "authors"],
  ["Penerbit", "publisher"],
  ["Jenis", "sourceType"],
  ["Terbit", "publishedAt"],
  ["Diakses", "accessedAt"],
  ["Versi", "version"],
];

/** Metadata sumber wajib lengkap dan dapat ditelusuri (LOCK-PED-007). */
export function SourceViewer({ source }: { source: SourceItem }) {
  return (
    <article className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={source.verified ? "verified" : "evidence"}>
            {source.verified ? "Terverifikasi" : "Belum diverifikasi"}
          </StatusBadge>
          <StatusBadge status="info" withDot={false}>
            Kredibilitas: {source.credibility}
          </StatusBadge>
        </div>
        <h2 className="font-heading text-h3 font-semibold">{source.title}</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {METADATA_LABEL.map(([label, key]) => (
            <div key={label} className="flex flex-col">
              <dt className="font-mono text-[0.6875rem] tracking-widest text-subtle uppercase">
                {label}
              </dt>
              <dd className="text-sm text-foreground">{String(source[key])}</dd>
            </div>
          ))}
        </dl>
        <p className="inline-flex items-center gap-2 font-mono text-xs break-all text-subtle">
          <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
          {source.url}
        </p>
        <p className="text-xs text-muted-foreground">
          Tautan contoh tidak dapat dibuka pada prototipe. Sumber terkurasi
          bukan jaminan kebenaran mutlak — tetap nilai isinya secara kritis.
        </p>
      </div>

      <div className="reading-surface rounded-xl border border-reading-border p-6 md:p-8">
        <div className="reading-prose mx-auto flex flex-col gap-4">
          <p className="font-mono text-xs tracking-widest uppercase opacity-70">
            Kutipan sumber
          </p>
          {source.excerpt.map((paragraph, index) => (
            <p key={index} className="text-body-lg">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </article>
  );
}
