/** @format */

import type * as React from "react";

import { cn } from "@/lib/utils";

// Kontainer halaman: lebar maksimum 1600px, padding 32px desktop (DSN-007).

export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-container"
      className={cn(
        "mx-auto w-full max-w-shell px-4 py-6 md:px-8 md:py-8",
        className,
      )}
      {...props}
    />
  );
}
