/** @format */

"use client";

import Link from "next/link";

import { navIcons, mobileBarItems, type NavSection } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Bottom navigation mobile (DSN-008): target sentuh minimal 44px.
// Berisi tujuan yang paling sering dibuka; menu lengkap tetap tersedia
// melalui drawer di Topbar.

interface MobileNavigationProps {
  sections: NavSection[];
  currentPath: string;
}

export function MobileNavigation({
  sections,
  currentPath,
}: MobileNavigationProps) {
  const visibleItems = mobileBarItems(sections);

  return (
    <nav
      aria-label="Navigasi bawah"
      data-slot="mobile-navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sidebar-border bg-sidebar/95 backdrop-blur md:hidden"
    >
      <ul className="grid auto-cols-fr grid-flow-col">
        {visibleItems.map((item) => {
          const Icon = navIcons[item.icon];
          const isActive = currentPath === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-2 py-2 text-[0.6875rem] font-medium text-sidebar-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 focus-visible:ring-inset",
                  isActive && "text-sidebar-primary",
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span className="max-w-full truncate">
                  {item.shortLabel ?? item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
