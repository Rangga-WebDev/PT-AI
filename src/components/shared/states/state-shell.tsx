/** @format */

import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

// Kerangka bersama komponen state (empty/error/forbidden/locked).
// Action dikirim sebagai slot ReactNode agar komponen state tetap dapat
// dirender dari Server Component tanpa event handler.

interface StateShellProps {
  icon: LucideIcon;
  title: string;
  description?: string | undefined;
  action?: React.ReactNode | undefined;
  tone?: "neutral" | "danger" | "info" | undefined;
  role?: React.AriaRole | undefined;
  className?: string | undefined;
}

export function StateShell({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  role,
  className,
}: StateShellProps) {
  return (
    <div
      {...(role ? { role } : {})}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl border",
          tone === "neutral" &&
            "border-border bg-surface-active text-muted-foreground",
          tone === "danger" &&
            "border-destructive/35 bg-destructive/10 text-destructive",
          tone === "info" && "border-info/35 bg-info/10 text-info",
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </div>
      <h3 className="font-heading text-h4 font-semibold text-foreground">
        {title}
      </h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
