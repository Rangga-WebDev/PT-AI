/** @format */

import { notFound } from "next/navigation";

import { ClassShell } from "@/features/classes/components/class-shell";
import { ClassDiscussion } from "@/features/discussion/components/class-discussion";
import { lecturerClassNav } from "@/lib/classes/navigation";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import {
  listClassMessages,
  listDiscussionModules,
} from "@/server/repositories/discussions";

export default async function LecturerClassDiscussionPage({
  params,
  searchParams,
}: PageProps<"/app/lecturer/classes/[classId]/discussion">) {
  const { classId } = await params;
  const { pertemuan } = await searchParams;

  const lecturer = await requireLecturerOfClass(classId);

  const [classItem, modules] = await Promise.all([
    getClassDetail(classId),
    listDiscussionModules(classId),
  ]);

  if (!classItem) notFound();

  const moduleId =
    typeof pertemuan === "string" && modules.some((m) => m.id === pertemuan)
      ? pertemuan
      : null;
  const messages = await listClassMessages(classId, moduleId);

  const base = `/app/lecturer/classes/${classId}/discussion`;
  const threads = [
    { id: null, label: "Diskusi kelas", href: base, draft: false },
    ...modules.map((module) => ({
      id: module.id,
      label: `Pertemuan ${module.sequence} · ${module.title}`,
      href: `${base}?pertemuan=${module.id}`,
      draft: module.status !== "published",
    })),
  ];

  return (
    <ClassShell
      classItem={classItem}
      items={lecturerClassNav(classId)}
      overviewHref={`/app/lecturer/classes/${classId}`}
    >
      <ClassDiscussion
        key={moduleId ?? "kelas"}
        classId={classId}
        moduleId={moduleId}
        threads={threads}
        initialMessages={messages}
        currentUserId={lecturer.id}
        canModerate
      />
    </ClassShell>
  );
}
