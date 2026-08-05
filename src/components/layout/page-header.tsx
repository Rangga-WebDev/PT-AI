/** @format */

import type * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  actions?: React.ReactNode | undefined;
  className?: string | undefined;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      data-slot="page-header"
      className={cn(
        "flex flex-col gap-4 pb-6 md:flex-row md:items-end md:justify-between md:pb-8",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? (
          <p className="font-mono text-xs tracking-widest text-subtle uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-heading text-h2 font-semibold text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
