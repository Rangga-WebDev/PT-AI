/** @format */

import "server-only";

import {
  requireLecturerOfClass,
  requireRoleOrThrow,
} from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { unwrap } from "@/server/repositories/shared";

export async function listMyEnrollmentRequests() {
  await requireRoleOrThrow("student");
  const supabase = await createClient();
  return unwrap(
    await supabase.rpc("list_my_enrollment_requests", {}),
    "listMyEnrollmentRequests",
  );
}

export async function getClassEnrollmentInbox(classId: string) {
  await requireLecturerOfClass(classId);
  const supabase = await createClient();
  const [requests, klass] = await Promise.all([
    supabase.rpc("list_class_enrollment_requests", { p_class_id: classId }),
    supabase.from("classes").select("join_code").eq("id", classId).single(),
  ]);
  return {
    requests: unwrap(requests, "listClassEnrollmentRequests"),
    joinCode: unwrap(klass, "getClassJoinCode").join_code,
  };
}
