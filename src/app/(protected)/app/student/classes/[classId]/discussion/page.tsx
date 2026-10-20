/** @format */

import { notFound } from "next/navigation";

import { ClassShell } from "@/features/classes/components/class-shell";
import { ClassDiscussion } from "@/features/discussion/components/class-discussion";
import { studentClassNav } from "@/lib/classes/navigation";
import { requireClassAccess } from "@/lib/supabase/auth";
import { getClassDetail } from "@/server/repositories/classes";
import {
  listClassMessages,
  listDiscussionModules,
} from "@/server/repositories/discussions";

export default async function StudentClassDiscussionPage({
  params,
  searchParams,
}: PageProps<"/app/student/classes/[classId]/discussion">) {
  const { classId } = await params;
  const { pertemuan } = await searchParams;

  const user = await requireClassAccess(classId);

  // RLS hanya memperlihatkan pertemuan yang terbit, sehingga tautan ke
  // pertemuan draf jatuh kembali ke diskusi kelas.
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

  const base = `/app/student/classes/${classId}/discussion`;
  const threads = [
    { id: null, label: "Diskusi kelas", href: base, draft: false },
    ...modules.map((module) => ({
      id: module.id,
      label: `Pertemuan ${module.sequence} · ${module.title}`,
      href: `${base}?pertemuan=${module.id}`,
      draft: false,
    })),
  ];

  return (
    <ClassShell
      classItem={classItem}
      items={studentClassNav(classId)}
      overviewHref={`/app/student/classes/${classId}`}
    >
      <ClassDiscussion
        key={moduleId ?? "kelas"}
        classId={classId}
        moduleId={moduleId}
        threads={threads}
        initialMessages={messages}
        currentUserId={user.id}
        canModerate={false}
      />
    </ClassShell>
  );
}
