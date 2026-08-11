/** @format */

import "server-only";

import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface AcademicPeriodRow {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

export async function listAcademicPeriods(): Promise<AcademicPeriodRow[]> {
  const supabase = await createClient();
  return unwrap(
    await supabase
      .from("academic_periods")
      .select("id, name, code, start_date, end_date, is_active")
      .order("start_date", { ascending: false }),
    "listAcademicPeriods",
  );
}
