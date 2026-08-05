/** @format */

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface SkeletonStateProps {
  lines?: number | undefined;
  className?: string | undefined;
}

export function SkeletonState({ lines = 3, className }: SkeletonStateProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("flex w-full flex-col gap-3", className)}
    >
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === lines - 1 ? "w-3/5" : "w-full")}
        />
      ))}
    </div>
  );
}
