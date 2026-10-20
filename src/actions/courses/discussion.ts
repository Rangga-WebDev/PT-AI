/** @format */

"use server";

import { z } from "zod";

import {
  CLASS_MESSAGE_COLUMNS,
  toClassMessageView,
  type ClassMessageView,
} from "@/lib/discussion/messages";
import { toActionError } from "@/lib/errors";
import { requireUserOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { classMessageSchema } from "@/lib/validation/discussion";
import {
  consumeRateLimit,
  RATE_LIMIT_MESSAGE,
} from "@/server/services/rate-limit";

export type SendMessageResult =
  | { ok: true; message: ClassMessageView }
  | { ok: false; error: string };

function failure(error: unknown, fallback: string): string {
  const mapped = toActionError(error);
  return mapped.ok ? fallback : mapped.error;
}

/** Keanggotaan kelas ditegakkan RLS; aksi ini hanya memvalidasi dan membatasi laju. */
export async function sendClassMessageAction(
  input: unknown,
): Promise<SendMessageResult> {
  try {
    await requireUserOrThrow();

    const parsed = classMessageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Pesan tidak valid.",
      };
    }

    if (!(await consumeRateLimit("class_message"))) {
      return { ok: false, error: RATE_LIMIT_MESSAGE.class_message };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("class_messages")
      .insert({
        class_id: parsed.data.classId,
        module_id: parsed.data.moduleId,
        body: parsed.data.body,
      })
      .select(CLASS_MESSAGE_COLUMNS)
      .single();

    if (error || !data) {
      return {
        ok: false,
        error:
          error?.code === "42501"
            ? "Anda tidak dapat mengirim pesan di diskusi ini."
            : "Pesan gagal dikirim. Coba lagi.",
      };
    }

    return { ok: true, message: toClassMessageView(data) };
  } catch (error) {
    return { ok: false, error: failure(error, "Pesan gagal dikirim.") };
  }
}

export async function deleteClassMessageAction(
  messageId: unknown,
): Promise<{ ok?: boolean; error?: string }> {
  try {
    await requireUserOrThrow();

    const parsed = z.string().uuid().safeParse(messageId);
    if (!parsed.success) return { error: "Pesan tidak valid." };

    const supabase = await createClient();
    const { error } = await supabase.rpc("delete_class_message", {
      p_message_id: parsed.data,
    });

    if (error) {
      return {
        error:
          error.code === "42501"
            ? "Anda tidak berwenang menghapus pesan ini."
            : error.code === "P0002"
              ? "Pesan sudah dihapus."
              : "Pesan gagal dihapus. Coba lagi.",
      };
    }

    return { ok: true };
  } catch (error) {
    return { error: failure(error, "Pesan gagal dihapus.") };
  }
}
