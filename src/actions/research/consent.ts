/** @format */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { toActionError } from "@/lib/errors";
import {
  CONSENT_DOCUMENT_VERSION,
  CONSENT_STUDY_KEY,
} from "@/lib/research/consent";
import { requireStudentAccess } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  registerParticipant,
  removeParticipant,
} from "@/server/research/participants";

export interface ConsentActionResult {
  ok?: boolean;
  error?: string;
}

const decisionSchema = z.object({
  decision: z.enum(["granted", "declined"], {
    message: "Pilihan persetujuan tidak valid.",
  }),
});

function fail(error: unknown): ConsentActionResult {
  const result = toActionError(error);
  return result.ok ? {} : { error: result.error };
}

/**
 * Keputusan ikut serta adalah milik mahasiswa. Dosen tidak memiliki policy
 * membaca `consent_records` agar keikutsertaan tidak memengaruhi perlakuan
 * akademik.
 */
export async function submitConsentAction(
  input: unknown,
): Promise<ConsentActionResult> {
  try {
    const student = await requireStudentAccess();

    const parsed = decisionSchema.safeParse(input);
    if (!parsed.success) {
      return {
        error: parsed.error.issues[0]?.message ?? "Pilihan tidak valid.",
      };
    }

    const supabase = await createClient();
    const granted = parsed.data.decision === "granted";

    const { data: record, error } = await supabase
      .from("consent_records")
      .upsert(
        {
          profile_id: student.id,
          study_key: CONSENT_STUDY_KEY,
          status: parsed.data.decision,
          document_version: CONSENT_DOCUMENT_VERSION,
          consented_at: granted ? new Date().toISOString() : null,
          withdrawn_at: null,
        },
        { onConflict: "profile_id,study_key" },
      )
      .select("id")
      .single();

    if (error) return fail(error);

    if (granted) {
      const registration = await registerParticipant(student.id, record.id);
      if (!registration.ok) {
        return {
          error:
            registration.error ??
            "Persetujuan tersimpan, tetapi pendaftaran peserta gagal.",
        };
      }
    } else {
      // Menolak setelah sebelumnya setuju harus ikut memutus pemetaannya.
      await removeParticipant(student.id);
    }

    revalidatePath("/app/student/consent");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}

export async function withdrawConsentAction(): Promise<ConsentActionResult> {
  try {
    const student = await requireStudentAccess();

    const supabase = await createClient();

    const { error } = await supabase
      .from("consent_records")
      .update({
        status: "withdrawn",
        withdrawn_at: new Date().toISOString(),
      })
      .eq("profile_id", student.id)
      .eq("study_key", CONSENT_STUDY_KEY);

    if (error) return fail(error);

    // Pemutusan tautan identitas dilakukan setelah status tercatat, sehingga
    // tidak ada keadaan peserta terdaftar tanpa jejak penarikannya.
    const removal = await removeParticipant(student.id);
    if (!removal.ok) {
      return {
        error:
          removal.error ??
          "Penarikan tercatat, tetapi pemutusan tautan identitas gagal.",
      };
    }

    revalidatePath("/app/student/consent");
    return { ok: true };
  } catch (error) {
    return fail(error);
  }
}
