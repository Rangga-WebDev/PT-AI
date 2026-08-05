/** @format */

"use client";

import { Menu } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

// Topbar 72px (DSN-007): sticky, blur ringan, tanpa gradient berlebihan.

interface TopbarProps {
  title?: string | undefined;
  actions?: React.ReactNode | undefined;
  onOpenMobileNav: () => void;
  className?: string | undefined;
}

export function Topbar({
  title,
  actions,
  onOpenMobileNav,
  className,
}: TopbarProps) {
  return (
    <header
      data-slot="topbar"
      className={cn(
        "sticky top-0 z-30 flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-8",
        className,
      )}
    >
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Buka menu navigasi"
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-surface-active hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 md:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      {title ? (
        <h2 className="min-w-0 flex-1 truncate font-heading text-h4 font-semibold">
          {title}
        </h2>
      ) : (
        <div className="flex-1" />
      )}
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
