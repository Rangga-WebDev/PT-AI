/** @format */

import "server-only";

import {
  CLASS_MESSAGE_COLUMNS,
  toClassMessageView,
  type ClassMessageView,
} from "@/lib/discussion/messages";
import { createClient } from "@/lib/supabase/server";

import { unwrap } from "./shared";

export interface DiscussionModule {
  id: string;
  title: string;
  sequence: number;
  status: "draft" | "published" | "archived";
}

/** RLS hanya memperlihatkan pertemuan terbit kepada mahasiswa. */
export async function listDiscussionModules(
  classId: string,
): Promise<DiscussionModule[]> {
  const supabase = await createClient();

  return unwrap(
    await supabase
      .from("modules")
      .select("id, title, sequence, status")
      .eq("class_id", classId)
      .is("deleted_at", null)
      .order("sequence"),
    "listDiscussionModules",
  );
}

export async function listClassMessages(
  classId: string,
  moduleId: string | null,
  limit = 100,
): Promise<ClassMessageView[]> {
  const supabase = await createClient();

  const query = supabase
    .from("class_messages")
    .select(CLASS_MESSAGE_COLUMNS)
    .eq("class_id", classId);

  const rows = unwrap(
    await (
      moduleId ? query.eq("module_id", moduleId) : query.is("module_id", null)
    )
      .order("created_at", { ascending: false })
      .limit(limit),
    "listClassMessages",
  );

  return rows.reverse().map(toClassMessageView);
}
