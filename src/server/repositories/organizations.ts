/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface OrganizationRow {
  id: string;
  name: string;
  code: string;
  kind: string;
  timezone: string;
  is_active: boolean;
}

export interface FacultyRow {
  id: string;
  organization_id: string;
  name: string;
  code: string;
}

export interface StudyProgramRow {
  id: string;
  faculty_id: string;
  name: string;
  code: string;
  degree_level: string;
  faculties: { name: string } | null;
}

export async function listOrganizations(): Promise<OrganizationRow[]> {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("organizations")
      .select("id, name, code, kind, timezone, is_active")
      .order("name"),
    "listOrganizations",
  );
}

export async function listFaculties(): Promise<FacultyRow[]> {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("faculties")
      .select("id, organization_id, name, code")
      .order("name"),
    "listFaculties",
  );
}

export async function listStudyPrograms(): Promise<StudyProgramRow[]> {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("study_programs")
      .select("id, faculty_id, name, code, degree_level, faculties(name)")
      .order("name"),
    "listStudyPrograms",
  );
}
