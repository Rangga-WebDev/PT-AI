/** @format */

import { Lock } from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface LockedCardProps {
  title: string;
  reason: string;
  className?: string | undefined;
}

export function LockedCard({ title, reason, className }: LockedCardProps) {
  return (
    <Card
      size="sm"
      className={cn("border-dashed bg-transparent opacity-80", className)}
    >
      <CardHeader>
        <p className="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-subtle uppercase">
          <Lock aria-hidden="true" className="size-3" />
          Terkunci
        </p>
        <CardTitle className="text-base text-muted-foreground">
          {title}
        </CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
    </Card>
  );
}
