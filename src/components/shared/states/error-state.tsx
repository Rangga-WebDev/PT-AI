/** @format */

import { TriangleAlert } from "lucide-react";
import type * as React from "react";

import { StateShell } from "@/components/shared/states/state-shell";

interface ErrorStateProps {
  title?: string | undefined;
  description?: string | undefined;
  action?: React.ReactNode | undefined;
  className?: string | undefined;
}

export function ErrorState({
  title = "Terjadi kesalahan",
  description = "Data tidak dapat dimuat. Silakan coba lagi.",
  action,
  className,
}: ErrorStateProps) {
  return (
    <StateShell
      icon={TriangleAlert}
      tone="danger"
      role="alert"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
