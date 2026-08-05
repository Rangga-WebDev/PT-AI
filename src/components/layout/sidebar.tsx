/** @format */

"use client";

import { ChevronsLeft, ChevronsRight, Landmark } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { navIcons, type NavSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Sidebar desktop 272px yang dapat diciutkan menjadi rail 80px.
// Pada tablet (md hingga <lg) selalu tampil sebagai rail ikon. (DSN-007)

interface SidebarNavProps {
  sections: NavSection[];
  currentPath: string;
  collapsed?: boolean | undefined;
  onNavigate?: (() => void) | undefined;
}

export function SidebarNav({
  sections,
  currentPath,
  collapsed = false,
  onNavigate,
}: SidebarNavProps) {
  return (
    <nav
      aria-label="Navigasi utama"
      className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4"
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.title ?? sectionIndex}
          className="flex flex-col gap-1"
        >
          {section.title ? (
            <p
              className={cn(
                "px-3 pb-1 font-mono text-[0.6875rem] tracking-widest text-subtle uppercase",
                onNavigate ? null : ["max-lg:hidden", collapsed && "lg:hidden"],
              )}
            >
              {section.title}
            </p>
          ) : null}
          {section.items.map((item) => {
            const Icon = navIcons[item.icon];
            const isActive = currentPath === item.href;
            const iconOnly = !onNavigate;
            const link = (
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                {...(onNavigate ? { onClick: onNavigate } : {})}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
                  isActive &&
                    "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_2px_0_0_0_var(--sidebar-primary)]",
                  iconOnly && [
                    "max-lg:justify-center max-lg:px-0",
                    collapsed && "lg:justify-center lg:px-0",
                  ],
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-5 shrink-0",
                    isActive && "text-sidebar-primary",
                  )}
                />
                <span
                  className={cn(
                    "truncate",
                    iconOnly && ["max-lg:hidden", collapsed && "lg:hidden"],
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );

            return collapsed && iconOnly ? (
              <Tooltip key={item.href}>
                <TooltipTrigger render={link} />
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              <Fragment key={item.href}>{link}</Fragment>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

interface SidebarProps {
  sections: NavSection[];
  currentPath: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({
  sections,
  currentPath,
  collapsed,
  onToggleCollapsed,
}: SidebarProps) {
  return (
    <aside
      data-slot="sidebar"
      data-collapsed={collapsed}
      className={cn(
        "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 md:flex",
        "w-sidebar-collapsed",
        collapsed ? "lg:w-sidebar-collapsed" : "lg:w-sidebar",
      )}
    >
      <div
        className={cn(
          "flex h-topbar shrink-0 items-center gap-3 border-b border-sidebar-border px-4 max-lg:justify-center max-lg:px-0",
          collapsed && "lg:justify-center lg:px-0",
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary"
        >
          <Landmark className="size-5" />
        </span>
        <span
          className={cn(
            "font-heading text-base font-semibold text-foreground max-lg:hidden",
            collapsed && "lg:hidden",
          )}
        >
          PT-AI LMS
        </span>
      </div>
      <SidebarNav
        sections={sections}
        currentPath={currentPath}
        collapsed={collapsed}
      />
      <div className="shrink-0 border-t border-sidebar-border p-3 max-lg:hidden">
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Bentangkan navigasi" : "Ciutkan navigasi"}
          aria-expanded={!collapsed}
          className={cn(
            "flex h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground transition-colors outline-none hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <ChevronsRight aria-hidden="true" className="size-5 shrink-0" />
          ) : (
            <ChevronsLeft aria-hidden="true" className="size-5 shrink-0" />
          )}
          <span className={cn(collapsed && "hidden")}>Ciutkan</span>
        </button>
      </div>
    </aside>
  );
}
