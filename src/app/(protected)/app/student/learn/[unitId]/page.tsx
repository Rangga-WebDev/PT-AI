/** @format */

import { notFound, redirect } from "next/navigation";

import { findMockUnit } from "@/mocks/units";

export default async function LearnUnitPage({
  params,
}: PageProps<"/app/student/learn/[unitId]">) {
  const { unitId } = await params;
  const unit = findMockUnit(unitId);

  if (!unit) {
    notFound();
  }

  redirect(`/app/student/learn/${unit.id}/stage/${unit.currentStageKey}`);
}
