/** @format */

import { StatusBadge } from "@/components/shared/status-badge";
import type { DistributionSlice } from "@/lib/analytics/aggregate";

const TONE_CLASS: Record<DistributionSlice["tone"], string> = {
  success: "bg-success",
  info: "bg-info",
  evidence: "bg-evidence",
  danger: "bg-destructive",
};

export function MasteryDistribution({
  slices,
}: {
  slices: DistributionSlice[];
}) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0);

  return (
    <ul data-slot="mastery-distribution" className="flex flex-col gap-3">
      {slices.map((slice) => (
        <li key={slice.key} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-foreground">{slice.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {slice.count} mahasiswa
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-active">
            <div
              className={`h-full rounded-full ${TONE_CLASS[slice.tone]}`}
              style={{
                width: total === 0 ? "0%" : `${(slice.count / total) * 100}%`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

const EVENT_LABEL: Record<string, string> = {
  attempt_submitted: "Respons awal dikirim",
  revision_submitted: "Revisi dikirim",
  reflection_submitted: "Refleksi diisi",
  source_verified: "Sumber diverifikasi",
  ai_feedback_requested: "Bantuan AI diminta",
  mastery_decided: "Ketuntasan diputuskan",
};

export function EventSummary({
  rows,
}: {
  rows: { eventType: string; count: number; lastOccurredAt: string }[];
}) {
  return (
    <ul data-slot="event-summary" className="flex flex-col gap-2">
      {rows.map((row) => (
        <li
          key={row.eventType}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
        >
          <span className="text-sm">
            {EVENT_LABEL[row.eventType] ?? row.eventType}
          </span>
          <span className="font-mono text-xs text-subtle">
            {row.count}× · terakhir{" "}
            {new Date(row.lastOccurredAt).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ObservationList({
  observations,
}: {
  observations: {
    studentId: string;
    studentName: string;
    key: string;
    description: string;
  }[];
}) {
  return (
    <ul data-slot="observation-list" className="flex flex-col gap-2">
      {observations.map((observation) => (
        <li
          key={`${observation.studentId}-${observation.key}`}
          data-slot="observation-item"
          className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2"
        >
          <span className="text-sm font-medium">{observation.studentName}</span>
          <span className="text-sm text-muted-foreground">
            {observation.description}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function FidelitySummary({
  rate,
  items,
}: {
  rate: number;
  items: { key: string; label: string; isImplemented: boolean | null }[];
}) {
  return (
    <div data-slot="fidelity-summary" className="flex flex-col gap-3">
      <StatusBadge status="info" withDot={false}>
        Keterlaksanaan {rate}%
      </StatusBadge>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span>{item.label}</span>
            <span className="font-mono text-xs text-subtle">
              {item.isImplemented === null
                ? "belum diobservasi"
                : item.isImplemented
                  ? "terlaksana"
                  : "belum terlaksana"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
