/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/states/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ClassShell } from "@/features/classes/components/class-shell";
import { ActivityEvidence } from "@/features/portfolio/components/activity-evidence";
import { studentClassNav } from "@/lib/classes/navigation";
import { formatObservedDuration } from "@/lib/portfolio/aggregate";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import { getClassPortfolio } from "@/server/repositories/portfolio";

export default async function StudentPortfolioMeetingPage({
  params,
}: PageProps<"/app/student/classes/[classId]/portfolio/[moduleId]">) {
  const { classId, moduleId } = await params;

  const user = await requireClassAccess(classId);

  const [classItem, meetings] = await Promise.all([
    getClassDetail(classId),
    getClassPortfolio(classId, user.id),
  ]);

  if (!classItem) notFound();

  // Pertemuan dicari di dalam hasil yang sudah tersaring kelas, sehingga id
  // dari kelas lain tidak akan pernah ditemukan di sini.
  const meeting = meetings.find((item) => item.meeting.id === moduleId);
  if (!meeting) notFound();

  const duration = formatObservedDuration(meeting.observedSeconds);

  return (
    <ClassShell
      classItem={classItem}
      items={studentClassNav(classId)}
      overviewHref={`/app/student/classes/${classId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs tracking-widest text-subtle uppercase">
            Pertemuan {meeting.meeting.sequence}
          </span>
          <h2 className="font-heading text-h3 font-semibold text-foreground">
            {meeting.meeting.title}
          </h2>
          {duration ? (
            <p className="text-sm text-muted-foreground">
              Aktivitas belajar teramati: {duration}
            </p>
          ) : null}
        </div>
        <Link
          href={`/app/student/classes/${classId}/portfolio`}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          Kembali
        </Link>
      </div>

      {meeting.activities.length === 0 ? (
        <EmptyState
          title="Belum ada bukti"
          description="Belum ada aktivitas yang tercatat pada pertemuan ini."
        />
      ) : (
        <div className="reading-surface flex flex-col gap-10 rounded-xl border border-reading-border p-6 md:p-8">
          {meeting.activities.map((activity) => (
            <ActivityEvidence key={activity.activityId} activity={activity} />
          ))}
        </div>
      )}
    </ClassShell>
  );
}
