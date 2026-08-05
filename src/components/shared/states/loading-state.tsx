/** @format */

import { LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoadingStateProps {
  label?: string | undefined;
  className?: string | undefined;
}

export function LoadingState({
  label = "Memuat data…",
  className,
}: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 px-6 py-12",
        className,
      )}
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-6 animate-spin text-muted-foreground"
      />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
