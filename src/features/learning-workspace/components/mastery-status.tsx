/** @format */

import { StatusBadge } from "@/components/shared/status-badge";
import type { LearningStage } from "@/types/learning";

const CYCLE_STEPS = [
  { key: "attempt", label: "Attempt" },
  { key: "feedback", label: "Feedback" },
  { key: "verify", label: "Verify" },
  { key: "revise", label: "Revise" },
  { key: "mastery", label: "Mastery" },
] as const;

const MASTERY_CRITERIA = [
  "Klaim dibedakan dari fakta dan asumsi.",
  "Setiap klaim utama ditautkan ke sumber yang diperiksa.",
  "Keterbatasan bukti dinyatakan secara eksplisit.",
  "Kontraargumen ditanggapi dengan alasan.",
];

/** Ketuntasan ditentukan kriteria kinerja, bukan aktivitas klik (LOCK-PED-008). */
export function MasteryStatus({ stage }: { stage: LearningStage }) {
  return (
    <section
      aria-labelledby="mastery-heading"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="mastery-heading" className="font-heading text-h4 font-semibold">
          Status ketuntasan
        </h3>
        <StatusBadge
          status={stage.status === "mastered" ? "verified" : "in-progress"}
        >
          {stage.status === "mastered" ? "Tuntas" : "Belum tuntas"}
        </StatusBadge>
      </div>

      <ol className="flex flex-wrap items-center gap-2">
        {CYCLE_STEPS.map((step, index) => {
          const isActive = step.key === stage.cyclePhase;
          return (
            <li key={step.key} className="flex items-center gap-2">
              <span
                aria-current={isActive ? "step" : undefined}
                className={
                  isActive
                    ? "rounded-md border border-primary/50 bg-primary/12 px-2 py-1 font-mono text-xs text-primary uppercase"
                    : "rounded-md border border-border px-2 py-1 font-mono text-xs text-subtle uppercase"
                }
              >
                {step.label}
              </span>
              {index < CYCLE_STEPS.length - 1 ? (
                <span aria-hidden="true" className="text-subtle">
                  →
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          Kriteria kinerja
        </p>
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {MASTERY_CRITERIA.map((criterion) => (
            <li key={criterion} className="flex gap-2">
              <span aria-hidden="true" className="text-subtle">
                •
              </span>
              {criterion}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">
        Penilaian akhir tetap berada pada dosen. AI tidak menentukan kelulusan
        maupun nilai.
      </p>
    </section>
  );
}
