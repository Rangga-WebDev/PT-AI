/** @format */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { isActiveClassNav, type ClassNavItem } from "@/lib/classes/navigation";

/**
 * Satu bilah untuk kedua peran. Di layar sempit bilahnya digeser mendatar —
 * pola yang sudah dikenal dari LMS lain — bukan dilipat menjadi menu yang
 * menyembunyikan tujuan.
 */
export function ClassNav({
  items,
  overviewHref,
}: {
  items: ClassNavItem[];
  overviewHref: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi kelas"
      className="-mx-6 overflow-x-auto border-b border-border px-6 md:mx-0 md:px-0"
    >
      <ul className="flex min-w-max items-center gap-1">
        {items.map((item) => {
          const active = isActiveClassNav(item, pathname, overviewHref);

          if (!item.available) {
            return (
              <li key={item.label}>
                <span
                  aria-disabled="true"
                  title="Belum tersedia"
                  className="inline-flex cursor-not-allowed items-center border-b-2 border-transparent px-3 py-2.5 text-sm text-subtle"
                >
                  {item.label}
                  <span className="sr-only"> — belum tersedia</span>
                </span>
              </li>
            );
          }

          return (
            <li key={item.label}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center border-b-2 px-3 py-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none",
                  active
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
