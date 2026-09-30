/** @format */

"use server";

import { z } from "zod";

import { toActionError, type ActionResult } from "@/lib/errors";
import {
  preliminaryRespondentDetailSchema,
  type PreliminaryRespondentDetail,
} from "@/lib/research/preliminary-study";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const FAILURE = "Jawaban responden tidak dapat dimuat. Coba lagi.";

/**
 * Jawaban lengkap satu responden studi pendahuluan, khusus admin. RPC yang
 * dipanggil memeriksa organisasi dan mencatat setiap pembukaan ke log audit.
 */
export async function getPreliminaryRespondentAction(
  respondentId: string,
): Promise<ActionResult<PreliminaryRespondentDetail>> {
  try {
    await requireRoleOrThrow("admin");
    const id = z.uuid().safeParse(respondentId);
    if (!id.success) return { ok: false, error: "Responden tidak valid." };

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("preliminary_study_respondent", {
      p_respondent_id: id.data,
    });
    if (error) {
      const mapped = toActionError(error);
      return mapped.ok ? { ok: false, error: FAILURE } : mapped;
    }

    const detail = preliminaryRespondentDetailSchema.safeParse(data);
    return detail.success
      ? { ok: true, data: detail.data }
      : { ok: false, error: FAILURE };
  } catch (error) {
    const mapped = toActionError(error);
    return mapped.ok ? { ok: false, error: FAILURE } : mapped;
  }
}
