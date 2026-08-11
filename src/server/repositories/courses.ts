/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface CourseRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  credits: number;
  study_program_id: string;
  study_programs: { name: string } | null;
}

export async function listCourses(): Promise<CourseRow[]> {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("courses")
      .select(
        "id, code, name, description, credits, study_program_id, study_programs(name)",
      )
      .is("deleted_at", null)
      .order("code"),
    "listCourses",
  );
}
