/** @format */

import { Inbox } from "lucide-react";
import type * as React from "react";

import { StateShell } from "@/components/shared/states/state-shell";

interface EmptyStateProps {
  title?: string | undefined;
  description?: string | undefined;
  action?: React.ReactNode | undefined;
  className?: string | undefined;
}

export function EmptyState({
  title = "Belum ada data",
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <StateShell
      icon={Inbox}
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
