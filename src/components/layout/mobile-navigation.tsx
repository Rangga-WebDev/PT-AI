/** @format */

"use client";

import Link from "next/link";

import { navIcons, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Bottom navigation mobile (DSN-008): target sentuh minimal 44px.
// Maksimal 4 item utama; menu lengkap tersedia melalui drawer di Topbar.

interface MobileNavigationProps {
  items: NavItem[];
  currentPath: string;
}

export function MobileNavigation({
  items,
  currentPath,
}: MobileNavigationProps) {
  const visibleItems = items.slice(0, 4);

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
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
