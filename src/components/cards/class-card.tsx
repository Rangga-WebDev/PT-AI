/** @format */

import { BookOpen, Users } from "lucide-react";
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
import type { ClassSummaryView } from "@/server/repositories/classes";
import { cn } from "@/lib/utils";

interface ClassCardProps {
  item: ClassSummaryView;
  href: string;
  showStatus?: boolean | undefined;
  /** Jumlah peserta berguna bagi pengelola kelas, bukan bagi pesertanya. */
  showStudentCount?: boolean | undefined;
  className?: string | undefined;
}

const STATUS_LABEL = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
} as const;

export function ClassCard({
  item,
  href,
  showStatus = false,
  showStudentCount = false,
  className,
}: ClassCardProps) {
  // Nama kelas sudah memuat nama mata kuliah; menampilkannya dua kali hanya
  // menambah baris tanpa menambah keterangan.
  const showCourse = !item.name.startsWith(item.courseName);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          {item.code} · {item.academicPeriod}
        </p>
        <CardTitle>{item.name}</CardTitle>
        {showCourse ? (
          <CardDescription>{item.courseName}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <BookOpen aria-hidden="true" className="size-4 text-subtle" />
          {item.lecturerNames.length > 0
            ? item.lecturerNames.join(", ")
            : "Belum ada dosen pengampu"}
        </span>
        {showStudentCount ? (
          <span className="inline-flex items-center gap-2">
            <Users aria-hidden="true" className="size-4 text-subtle" />
            {item.studentCount} mahasiswa
          </span>
        ) : null}
        {showStatus ? (
          <StatusBadge
            status={item.status === "published" ? "published" : "draft"}
            className="w-fit"
          >
            {STATUS_LABEL[item.status]}
          </StatusBadge>
        ) : null}
      </CardContent>
      <CardFooter>
        <Link
          href={href}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Buka kelas
        </Link>
      </CardFooter>
    </Card>
  );
}
