/** @format */

import { ExternalLink, ShieldCheck, ShieldQuestion } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SOURCE_TYPE_LABEL,
  type SourceType,
} from "@/lib/constants/verification";
import { cn } from "@/lib/utils";

export interface EvidenceCardItem {
  id: string;
  title: string;
  publisher: string | null;
  sourceType: SourceType;
  isRequired: boolean;
  isVerified: boolean;
}

interface EvidenceCardProps {
  item: EvidenceCardItem;
  href: string;
  className?: string | undefined;
}

export function EvidenceCard({ item, href, className }: EvidenceCardProps) {
  return (
    <Card className={cn("border-l-2 border-l-evidence", className)}>
      <CardHeader>
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          {SOURCE_TYPE_LABEL[item.sourceType]} ·{" "}
          {item.isRequired ? "wajib dibaca" : "opsional"}
        </p>
        <CardTitle className="text-base">{item.title}</CardTitle>
        <CardDescription>
          {item.publisher ?? "Penerbit tidak dicatat"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <StatusBadge status={item.isVerified ? "verified" : "evidence"}>
          {item.isVerified ? (
            <>
              <ShieldCheck aria-hidden="true" className="size-3" />
              Sudah Anda verifikasi
            </>
          ) : (
            <>
              <ShieldQuestion aria-hidden="true" className="size-3" />
              Belum diverifikasi
            </>
          )}
        </StatusBadge>
      </CardContent>
      <CardFooter>
        <Link
          href={href}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Periksa sumber
          <ExternalLink aria-hidden="true" />
        </Link>
      </CardFooter>
    </Card>
  );
}
