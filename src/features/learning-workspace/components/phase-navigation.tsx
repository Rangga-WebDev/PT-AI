/** @format */

import { Check, Circle, Lock, PenLine } from "lucide-react";
import Link from "next/link";

import type { LearningStage, StageStatus } from "@/types/learning";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<StageStatus, string> = {
  locked: "Terkunci",
  available: "Terbuka",
  "in-progress": "Berjalan",
  attempted: "Sudah attempt",
  mastered: "Tuntas",
};

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "mastered") {
    return <Check aria-hidden="true" className="size-4" />;
  }
  if (status === "locked") {
    return <Lock aria-hidden="true" className="size-3.5" />;
  }
  if (status === "in-progress" || status === "attempted") {
    return <PenLine aria-hidden="true" className="size-3.5" />;
  }
  return <Circle aria-hidden="true" className="size-3" />;
}

function markerClass(status: StageStatus) {
  return cn(
    "flex size-8 shrink-0 items-center justify-center rounded-full border",
    status === "mastered" && "border-success/50 bg-success/15 text-success",
    status === "in-progress" && "border-primary/60 bg-primary/15 text-primary",
    status === "attempted" && "border-info/50 bg-info/15 text-info",
    status === "available" &&
      "border-border bg-surface-active text-muted-foreground",
    status === "locked" && "border-border bg-transparent text-subtle",
  );
}

interface PhaseNavProps {
  stages: LearningStage[];
  currentStageKey: string;
  buildHref: (stageKey: string) => string;
}

/** Rail vertikal enam tahap untuk desktop; urutan LOCKED (LOCK-PED-002). */
export function PhaseRail({
  stages,
  currentStageKey,
  buildHref,
}: PhaseNavProps) {
  return (
    <nav
      aria-label="Tahap pembelajaran"
      data-slot="phase-rail"
      className="hidden lg:block"
    >
      <ol className="flex flex-col gap-1">
        {stages.map((stage) => {
          const isCurrent = stage.key === currentStageKey;
          const content = (
            <>
              <span className={markerClass(stage.status)}>
                <StageIcon status={stage.status} />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {stage.order}. {stage.title}
                </span>
                <span className="truncate font-mono text-[0.6875rem] text-subtle uppercase">
                  {STATUS_LABEL[stage.status]}
                </span>
              </span>
            </>
          );

          return (
            <li key={stage.key}>
              {stage.status === "locked" ? (
                <span
                  aria-disabled="true"
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-subtle"
                >
                  {content}
                </span>
              ) : (
                <Link
                  href={buildHref(stage.key)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-foreground transition-colors outline-none hover:bg-surface-active focus-visible:ring-2 focus-visible:ring-ring/60",
                    isCurrent && "bg-surface-active",
                  )}
                >
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Stepper horizontal untuk tablet dan mobile (DSN-008). */
export function PhaseStepper({
  stages,
  currentStageKey,
  buildHref,
}: PhaseNavProps) {
  return (
    <nav
      aria-label="Tahap pembelajaran"
      data-slot="phase-stepper"
      className="lg:hidden"
    >
      <ol className="flex gap-2 overflow-x-auto pb-2">
        {stages.map((stage) => {
          const isCurrent = stage.key === currentStageKey;
          const label = `${stage.order}. ${stage.title}`;
          return (
            <li key={stage.key} className="shrink-0">
              {stage.status === "locked" ? (
                <span
                  aria-disabled="true"
                  className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-border px-3 text-sm text-subtle"
                >
                  <Lock aria-hidden="true" className="size-3.5" />
                  {label}
                </span>
              ) : (
                <Link
                  href={buildHref(stage.key)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    isCurrent
                      ? "border-primary/60 bg-primary/12 text-primary"
                      : "text-foreground hover:bg-surface-active",
                  )}
                >
                  <StageIcon status={stage.status} />
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
