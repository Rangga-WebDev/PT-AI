/** @format */

import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

// StatusBadge semantik Civic Intelligence (DSN-002):
// aqua = tindakan manusia, violet = AI, amber = evidence,
// mint = verified/completed, coral = danger/incident, blue = info.

const statusBadgeVariants = cva(
  "inline-flex w-fit items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-medium tracking-wide uppercase",
  {
    variants: {
      status: {
        draft: "border-border bg-muted text-muted-foreground",
        published: "border-primary/35 bg-primary/12 text-primary",
        "in-progress": "border-info/35 bg-info/12 text-info",
        verified: "border-success/35 bg-success/12 text-success",
        evidence: "border-evidence/35 bg-evidence/12 text-evidence",
        ai: "border-ai/35 bg-ai/12 text-ai-hover",
        info: "border-info/35 bg-info/12 text-info",
        danger: "border-destructive/35 bg-destructive/12 text-destructive",
        locked: "border-border bg-transparent text-subtle",
      },
    },
    defaultVariants: {
      status: "draft",
    },
  },
);

type StatusBadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof statusBadgeVariants> & {
    withDot?: boolean | undefined;
  };

function StatusBadge({
  className,
  status = "draft",
  withDot = true,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {withDot ? (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      ) : null}
      {children}
    </span>
  );
}

export { StatusBadge, statusBadgeVariants };
