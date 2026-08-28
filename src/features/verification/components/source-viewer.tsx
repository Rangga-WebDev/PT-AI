/** @format */

import { ExternalLink } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import { SOURCE_TYPE_LABEL } from "@/lib/constants/verification";
import type { SourceView } from "@/server/repositories/sources";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { dateStyle: "medium" });
}

/** Metadata sumber wajib lengkap dan dapat ditelusuri (LOCK-PED-007). */
export function SourceViewer({
  source,
  isVerifiedByStudent,
}: {
  source: SourceView;
  isVerifiedByStudent: boolean;
}) {
  const latest = source.versions[0] ?? null;
  const paragraphs = (latest?.contentText ?? "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

  const metadata: Array<[string, string]> = [
    ["Penulis", source.authors ?? "—"],
    ["Penerbit", source.publisher ?? "—"],
    ["Jenis", SOURCE_TYPE_LABEL[source.sourceType]],
    ["Terbit", formatDate(source.publishedAt)],
    ["Diambil", formatDate(latest?.retrievedAt ?? null)],
    ["Versi", latest?.versionLabel ?? "Belum ada versi"],
  ];

  return (
    <article className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={isVerifiedByStudent ? "verified" : "evidence"}>
            {isVerifiedByStudent
              ? "Sudah Anda verifikasi"
              : "Belum Anda verifikasi"}
          </StatusBadge>
          <StatusBadge status="info" withDot={false}>
            {source.versions.length} versi tercatat
          </StatusBadge>
        </div>
        <h2 className="font-heading text-h3 font-semibold">{source.title}</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {metadata.map(([label, value]) => (
            <div key={label} className="flex flex-col">
              <dt className="font-mono text-[0.6875rem] tracking-widest text-subtle uppercase">
                {label}
              </dt>
              <dd className="text-sm text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {source.url ? (
          <p className="inline-flex items-center gap-2 font-mono text-xs break-all text-subtle">
            <ExternalLink aria-hidden="true" className="size-3.5 shrink-0" />
            {source.url}
          </p>
        ) : null}
        {source.curationNote ? (
          <p className="text-sm text-muted-foreground">
            {source.curationNote}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Sumber terkurasi bukan jaminan kebenaran mutlak — tetap nilai isinya
          secara kritis.
        </p>
      </div>

      <div className="reading-surface rounded-xl border border-reading-border p-6 md:p-8">
        <div className="reading-prose mx-auto flex flex-col gap-4">
          <p className="font-mono text-xs tracking-widest uppercase opacity-70">
            Kutipan sumber
          </p>
          {paragraphs.length === 0 ? (
            <p className="text-body-lg">
              Belum ada kutipan yang dicatat untuk sumber ini.
            </p>
          ) : (
            paragraphs.map((paragraph, index) => (
              <p key={index} className="text-body-lg">
                {paragraph}
              </p>
            ))
          )}
        </div>
      </div>
    </article>
  );
}
