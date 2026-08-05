/** @format */

import { ShieldX } from "lucide-react";
import type * as React from "react";

import { StateShell } from "@/components/shared/states/state-shell";

interface ForbiddenStateProps {
  title?: string | undefined;
  description?: string | undefined;
  action?: React.ReactNode | undefined;
  className?: string | undefined;
}

export function ForbiddenState({
  title = "Akses ditolak",
  description = "Anda tidak memiliki izin untuk melihat halaman atau data ini.",
  action,
  className,
}: ForbiddenStateProps) {
  return (
    <StateShell
      icon={ShieldX}
      tone="danger"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
