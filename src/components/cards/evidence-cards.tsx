/** @format */

import {
  ExternalLink,
  ShieldCheck,
  ShieldQuestion,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AIFeedbackItem, SourceItem } from "@/types/learning";
import { cn } from "@/lib/utils";

const AI_KIND_LABEL: Record<AIFeedbackItem["kind"], string> = {
  "guiding-question": "Pertanyaan penuntun",
  strength: "Kekuatan",
  gap: "Kesenjangan",
  "counter-argument": "Kontraargumen",
  hint: "Petunjuk",
};

interface EvidenceCardProps {
  item: SourceItem;
  href: string;
  className?: string | undefined;
}

export function EvidenceCard({ item, href, className }: EvidenceCardProps) {
  return (
    <Card className={cn("border-l-2 border-l-evidence", className)}>
      <CardHeader>
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          {item.sourceType} · {item.version}
        </p>
        <CardTitle className="text-base">{item.title}</CardTitle>
        <CardDescription>
          {item.publisher} · {item.publishedAt}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <StatusBadge status={item.verified ? "verified" : "evidence"}>
          {item.verified ? (
            <>
              <ShieldCheck aria-hidden="true" className="size-3" />
              Terverifikasi
            </>
          ) : (
            <>
              <ShieldQuestion aria-hidden="true" className="size-3" />
              Belum diverifikasi
            </>
          )}
        </StatusBadge>
        <StatusBadge status="info" withDot={false}>
          Kredibilitas: {item.credibility}
        </StatusBadge>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" render={<Link href={href} />}>
          Periksa sumber
          <ExternalLink aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}

interface AIFeedbackCardProps {
  item: AIFeedbackItem;
  className?: string | undefined;
}

export function AIFeedbackCard({ item, className }: AIFeedbackCardProps) {
  return (
    <Card
      className={cn("border-l-2 border-l-ai bg-ai/[0.06]", className)}
      size="sm"
    >
      <CardHeader>
        <p className="inline-flex items-center gap-1.5 font-mono text-xs tracking-widest text-ai uppercase">
          <Sparkles aria-hidden="true" className="size-3" />
          {AI_KIND_LABEL[item.kind]}
        </p>
        <CardTitle className="text-base">{item.title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {item.body}
      </CardContent>
    </Card>
  );
}
