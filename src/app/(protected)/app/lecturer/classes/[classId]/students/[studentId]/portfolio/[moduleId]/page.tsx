/** @format */

import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/shared/states/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ClassShell } from "@/features/classes/components/class-shell";
import { ActivityEvidence } from "@/features/portfolio/components/activity-evidence";
import { lecturerClassNav } from "@/lib/classes/navigation";
import { formatObservedDuration } from "@/lib/portfolio/aggregate";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import {
  getClassDetail,
  getEnrolledStudent,
} from "@/server/repositories/classes";
import { getClassPortfolio } from "@/server/repositories/portfolio";

export default async function LecturerStudentPortfolioMeetingPage({
  params,
}: PageProps<"/app/lecturer/classes/[classId]/students/[studentId]/portfolio/[moduleId]">) {
  const { classId, studentId, moduleId } = await params;

  await requireLecturerOfClass(classId);

  const student = await getEnrolledStudent(classId, studentId);
  if (!student) notFound();

  const [classItem, meetings] = await Promise.all([
    getClassDetail(classId),
    getClassPortfolio(classId, studentId),
  ]);

  if (!classItem) notFound();

  const meeting = meetings.find((item) => item.meeting.id === moduleId);
  if (!meeting) notFound();

  const duration = formatObservedDuration(meeting.observedSeconds);

  return (
    <ClassShell
      classItem={classItem}
      items={lecturerClassNav(classId)}
      overviewHref={`/app/lecturer/classes/${classId}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-xs tracking-widest text-subtle uppercase">
            {student.fullName} · Pertemuan {meeting.meeting.sequence}
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
          href={`/app/lecturer/classes/${classId}/students/${studentId}/portfolio`}
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
