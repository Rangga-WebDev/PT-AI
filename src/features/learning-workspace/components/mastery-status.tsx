/** @format */

import { Check, Circle } from "lucide-react";

import { StatusBadge } from "@/components/shared/status-badge";
import type {
  EvaluatorKind,
  MasteryOutcome,
  ProcessCriterion,
} from "@/lib/mastery/access";

const OUTCOME_LABEL: Record<MasteryOutcome, string> = {
  not_met: "Belum memenuhi",
  partially_met: "Sebagian memenuhi",
  met: "Memenuhi",
};

interface MasteryStatusProps {
  outcome: MasteryOutcome | null;
  evaluatorKind: EvaluatorKind | null;
  isFinal: boolean;
  decidedAt: string | null;
  processCriteria: ProcessCriterion[];
}

/** Ketuntasan ditentukan kriteria kinerja, bukan aktivitas klik (LOCK-PED-008). */
export function MasteryStatus({
  outcome,
  evaluatorKind,
  isFinal,
  decidedAt,
  processCriteria,
}: MasteryStatusProps) {
  return (
    <section
      aria-labelledby="mastery-heading"
      data-slot="mastery-status"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="mastery-heading" className="font-heading text-h4 font-semibold">
          Status ketuntasan
        </h3>
        <StatusBadge
          status={
            outcome === "met"
              ? "verified"
              : outcome === "partially_met"
                ? "evidence"
                : outcome === "not_met"
                  ? "danger"
                  : "in-progress"
          }
        >
          {outcome ? OUTCOME_LABEL[outcome] : "Belum dinilai"}
        </StatusBadge>
      </div>

      {outcome ? (
        <p className="font-mono text-xs text-subtle">
          {evaluatorKind === "lecturer" ? "Dinilai dosen" : "Usulan sistem"}
          {isFinal ? " · final" : " · menunggu konfirmasi dosen"}
          {decidedAt
            ? ` · ${new Date(decidedAt).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}`
            : ""}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          Kelengkapan proses
        </p>
        <ul className="flex flex-col gap-1.5">
          {processCriteria.map((criterion) => (
            <li
              key={criterion.key}
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              {criterion.met ? (
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-success"
                />
              ) : (
                <Circle
                  aria-hidden="true"
                  className="mt-0.5 size-3 shrink-0 text-subtle"
                />
              )}
              <span>{criterion.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        Kelengkapan proses membuka tahap berikutnya sementara. Penilaian mutu
        penalaran tetap berada pada dosen — AI tidak menentukan kelulusan maupun
        nilai.
      </p>
    </section>
  );
}
