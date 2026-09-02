/** @format */

import type * as React from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string | undefined;
  description?: string | undefined;
  action?: React.ReactNode | undefined;
  className?: string | undefined;
}

/**
 * Kosong bukan galat: keadaan ini ditulis sebagai kalimat, bukan sebagai
 * ilustrasi berbingkai. Kerangka berikon disediakan StateShell untuk keadaan
 * yang memang perlu ditonjolkan.
 */
export function EmptyState({
  title = "Belum ada data",
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-start gap-1.5 py-6", className)}>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
