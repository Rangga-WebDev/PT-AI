/** @format */

import { Compass, Lock, LifeBuoy } from "lucide-react";
import type * as React from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LockedCardProps {
  title: string;
  reason: string;
  className?: string | undefined;
}

export function LockedCard({ title, reason, className }: LockedCardProps) {
  return (
    <Card
      size="sm"
      className={cn("border-dashed bg-transparent opacity-80", className)}
    >
      <CardHeader>
        <p className="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-subtle uppercase">
          <Lock aria-hidden="true" className="size-3" />
          Terkunci
        </p>
        <CardTitle className="text-base text-muted-foreground">
          {title}
        </CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
    </Card>
  );
}

interface PathwayCardProps {
  title: string;
  description: string;
  reason: string;
  action?: React.ReactNode | undefined;
  className?: string | undefined;
}

/** Jalur remedial hasil branching — alasan wajib ditampilkan (LOCK-PED-009). */
export function RemedialCard({
  title,
  description,
  reason,
  action,
  className,
}: PathwayCardProps) {
  return (
    <Card className={cn("border-l-2 border-l-evidence", className)}>
      <CardHeader>
        <p className="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-evidence uppercase">
          <LifeBuoy aria-hidden="true" className="size-3" />
          Remedial
        </p>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="rounded-lg border border-border bg-surface-active/60 p-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            Alasan rekomendasi:{" "}
          </span>
          {reason}
        </p>
      </CardContent>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}

export function EnrichmentCard({
  title,
  description,
  reason,
  action,
  className,
}: PathwayCardProps) {
  return (
    <Card className={cn("border-l-2 border-l-success", className)}>
      <CardHeader>
        <p className="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-success uppercase">
          <Compass aria-hidden="true" className="size-3" />
          Pengayaan
        </p>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <StatusBadge status="verified" className="w-fit">
          Tahap sebelumnya tuntas
        </StatusBadge>
        <p className="rounded-lg border border-border bg-surface-active/60 p-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            Alasan rekomendasi:{" "}
          </span>
          {reason}
        </p>
      </CardContent>
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}
