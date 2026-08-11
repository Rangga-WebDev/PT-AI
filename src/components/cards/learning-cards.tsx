/** @format */

import { ArrowRight, BookOpen, CalendarClock, Users } from "lucide-react";
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
import type { CaseDetail, ClassSummary } from "@/types/learning";
import { cn } from "@/lib/utils";

interface HeroLearningCardProps {
  moduleTitle: string;
  unitTitle: string;
  stageTitle: string;
  stageFocus: string;
  dueLabel: string;
  progressPercent: number;
  href: string;
  className?: string | undefined;
}

export function HeroLearningCard({
  moduleTitle,
  unitTitle,
  stageTitle,
  stageFocus,
  dueLabel,
  progressPercent,
  href,
  className,
}: HeroLearningCardProps) {
  return (
    <Card className={cn("bg-surface-elevated", className)}>
      <CardHeader>
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          {moduleTitle}
        </p>
        <CardTitle className="text-h2 font-semibold">{unitTitle}</CardTitle>
        <CardDescription>
          Tahap berjalan: {stageTitle} — {stageFocus}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="in-progress">{stageTitle}</StatusBadge>
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-subtle">
            <CalendarClock aria-hidden="true" className="size-3.5" />
            {dueLabel}
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Kemajuan unit</span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Kemajuan unit ${unitTitle}`}
            className="h-2 w-full overflow-hidden rounded-full bg-surface-active"
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button render={<Link href={href} />}>
          Lanjutkan tahap
          <ArrowRight aria-hidden="true" />
        </Button>
      </CardFooter>
    </Card>
  );
}

interface CourseCardProps {
  item: ClassSummary;
  href: string;
  className?: string | undefined;
}

export function CourseCard({ item, href, className }: CourseCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          {item.code} · {item.academicPeriod}
        </p>
        <CardTitle>{item.name}</CardTitle>
        <CardDescription>{item.lecturerName}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <BookOpen aria-hidden="true" className="size-4 text-subtle" />
          {item.activeUnitTitle}
        </span>
        <span className="inline-flex items-center gap-2">
          <Users aria-hidden="true" className="size-4 text-subtle" />
          {item.studentCount} mahasiswa
        </span>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" render={<Link href={href} />}>
          Buka kelas
        </Button>
      </CardFooter>
    </Card>
  );
}

interface CaseCardProps {
  item: Pick<CaseDetail, "title" | "context" | "keyQuestion" | "sourceIds">;
  className?: string | undefined;
}

export function CaseCard({ item, className }: CaseCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <StatusBadge status="info" className="mb-2 w-fit">
          Kasus
        </StatusBadge>
        <CardTitle>{item.title}</CardTitle>
        <CardDescription>{item.context}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{item.keyQuestion}</p>
        <StatusBadge status="evidence" className="w-fit">
          {item.sourceIds.length} sumber terkurasi
        </StatusBadge>
      </CardContent>
    </Card>
  );
}
