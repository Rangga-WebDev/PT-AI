/** @format */

import type * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DimensionProgressRow } from "@/lib/analytics/aggregate";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  label: string;
  value: string;
  description?: string | undefined;
  tone?: "primary" | "success" | "evidence" | "danger" | "info" | undefined;
  className?: string | undefined;
}

export function InsightCard({
  label,
  value,
  description,
  tone = "primary",
  className,
}: InsightCardProps) {
  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardDescription className="font-mono text-xs tracking-widest uppercase">
          {label}
        </CardDescription>
        <CardTitle
          className={cn(
            "text-h2 font-semibold",
            tone === "primary" && "text-primary",
            tone === "success" && "text-success",
            tone === "evidence" && "text-evidence",
            tone === "danger" && "text-destructive",
            tone === "info" && "text-info",
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {description ? (
        <CardContent className="text-sm text-muted-foreground">
          {description}
        </CardContent>
      ) : null}
    </Card>
  );
}

interface AnalyticsCardProps {
  title: string;
  description?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

export function AnalyticsCard({
  title,
  description,
  children,
  className,
}: AnalyticsCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle as="h3">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

/** Bar horizontal enam dimensi berpikir kritis (LOCK-PED-001). */
export function DimensionBars({ items }: { items: DimensionProgressRow[] }) {
  return (
    <ul data-slot="dimension-bars" className="flex flex-col gap-3">
      {items.map((item) => {
        const reachedTarget = item.score >= item.target;
        const delta =
          item.previousScore === null ? null : item.score - item.previousScore;

        return (
          <li key={item.dimension} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">{item.label}</span>
              <span className="font-mono text-xs text-muted-foreground">
                {item.score} / target {item.target}
                {delta === null
                  ? ""
                  : delta === 0
                    ? " · tetap"
                    : ` · ${delta > 0 ? "+" : "−"}${Math.abs(delta)}`}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={item.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Skor dimensi ${item.label}`}
              className="h-2 w-full overflow-hidden rounded-full bg-surface-active"
            >
              <div
                className={cn(
                  "h-full rounded-full",
                  reachedTarget ? "bg-success" : "bg-evidence",
                )}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
