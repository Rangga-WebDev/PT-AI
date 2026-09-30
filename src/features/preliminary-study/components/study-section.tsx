/** @format */

import type * as React from "react";

import { cn } from "@/lib/utils";

interface StudySectionProps {
  id: string;
  title: string;
  description?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

/** Bagian halaman tanpa kartu: judul dan jarak yang mengelompokkan isi. */
export function StudySection({
  id,
  title,
  description,
  children,
  className,
}: StudySectionProps) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex flex-col gap-5", className)}
    >
      <div className="flex flex-col gap-1">
        <h2
          id={id}
          className="font-heading text-h4 font-semibold text-foreground"
        >
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
