/** @format */

import type * as React from "react";

import { cn } from "@/lib/utils";

// Bento grid asimetris (DSN-005): 1 kolom mobile, 8 kolom tablet,
// 12 kolom desktop. Item mengatur span-nya sendiri melalui className
// (mis. md:col-span-4 lg:col-span-7). Jangan membuat semua card
// berukuran sama.

export function BentoGrid({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bento-grid"
      className={cn(
        "grid grid-cols-1 gap-4 md:grid-cols-8 md:gap-5 lg:grid-cols-12",
        className,
      )}
      {...props}
    />
  );
}
