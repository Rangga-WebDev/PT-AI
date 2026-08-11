/** @format */

import { notFound, redirect } from "next/navigation";

import { requireStudentAccess } from "@/lib/supabase/auth";
import { getStudentUnitWorkspace } from "@/server/repositories/content";

export default async function LearnUnitPage({
  params,
}: PageProps<"/app/student/learn/[unitId]">) {
  const { unitId } = await params;

  await requireStudentAccess();

  const workspace = await getStudentUnitWorkspace(unitId);
  if (!workspace) notFound();

  const firstStage = workspace.stages.find((stage) => stage.isEnabled);
  if (!firstStage) notFound();

  redirect(`/app/student/learn/${unitId}/stage/${firstStage.stageKey}`);
}
