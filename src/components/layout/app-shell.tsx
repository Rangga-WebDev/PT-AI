/** @format */

"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import type * as React from "react";

import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { Sidebar, SidebarNav } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { NavSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// AppShell "Civic Intelligence" (DSN-007/DSN-008):
// - desktop : sidebar 272px (dapat diciutkan ke 80px) + topbar 72px
// - tablet  : navigation rail 80px
// - mobile  : bottom navigation + drawer menu dari Topbar
// State collapse memakai React state lokal (LOCK-TECH-016: state lokal
// terlebih dahulu; Zustand belum diperlukan pada fase ini).

interface AppShellProps {
  navSections: NavSection[];
  activePath?: string | undefined;
  topbarTitle?: string | undefined;
  topbarActions?: React.ReactNode | undefined;
  children: React.ReactNode;
}

export function AppShell({
  navSections,
  activePath,
  topbarTitle,
  topbarActions,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const currentPath = activePath ?? pathname ?? "";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const allItems = navSections.flatMap((section) => section.items);

  return (
    <TooltipProvider>
      <div className="min-h-svh bg-background">
        <a
          href="#main-content"
          className="sr-only z-50 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Langsung ke konten utama
        </a>
        <Sidebar
          sections={navSections}
          currentPath={currentPath}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
        />
        <div
          className={cn(
            "flex min-h-svh flex-col md:pl-sidebar-collapsed",
            collapsed ? "lg:pl-sidebar-collapsed" : "lg:pl-sidebar",
          )}
        >
          <Topbar
            title={topbarTitle}
            actions={topbarActions}
            onOpenMobileNav={() => setMobileNavOpen(true)}
          />
          <main
            id="main-content"
            className="flex flex-1 flex-col pb-20 md:pb-0"
          >
            {children}
          </main>
        </div>
        <MobileNavigation items={allItems} currentPath={currentPath} />
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0">
            <SheetHeader className="border-b border-sidebar-border">
              <SheetTitle>PT-AI LMS</SheetTitle>
            </SheetHeader>
            <SidebarNav
              sections={navSections}
              currentPath={currentPath}
              onNavigate={() => setMobileNavOpen(false)}
            />
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}
