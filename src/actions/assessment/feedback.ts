/** @format */

"use server";

import { revalidatePath } from "next/cache";

import { toActionError } from "@/lib/errors";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { lecturerFeedbackSchema } from "@/lib/validation/revision";

export interface FeedbackActionResult {
  ok?: boolean;
  error?: string;
}

/**
 * Umpan balik dosen atas revisi. `feedback_records` append-only, sehingga
 * koreksi ditulis sebagai catatan baru dan riwayatnya tetap terbaca.
 */
export async function submitLecturerFeedbackAction(
  input: unknown,
): Promise<FeedbackActionResult> {
  try {
    const lecturer = await requireRoleOrThrow("lecturer");

    const parsed = lecturerFeedbackSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Umpan balik tidak valid.",
      };
    }

    const supabase = await createClient();

    const { data: revision } = await supabase
      .from("revisions")
      .select("id, attempt_id")
      .eq("id", parsed.data.revisionId)
      .maybeSingle();

    if (!revision) return { error: "Revisi tidak ditemukan." };

    const { error } = await supabase.from("feedback_records").insert({
      revision_id: revision.id,
      source: "lecturer",
      author_id: lecturer.id,
      content: parsed.data.content,
    });

    if (error) {
      const result = toActionError(error);
      return result.ok ? {} : { error: result.error };
    }

    revalidatePath(`/app/lecturer/review/${revision.attempt_id}`);
    return { ok: true };
  } catch (error) {
    const result = toActionError(error);
    return result.ok ? {} : { error: result.error };
  }
}
