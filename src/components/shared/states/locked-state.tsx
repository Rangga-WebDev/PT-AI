/** @format */

import { Lock } from "lucide-react";
import type * as React from "react";

import { StateShell } from "@/components/shared/states/state-shell";

interface LockedStateProps {
  title?: string | undefined;
  description?: string | undefined;
  action?: React.ReactNode | undefined;
  className?: string | undefined;
}

export function LockedState({
  title = "Tahap terkunci",
  description = "Selesaikan tahap sebelumnya untuk membuka bagian ini.",
  action,
  className,
}: LockedStateProps) {
  return (
    <StateShell
      icon={Lock}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
