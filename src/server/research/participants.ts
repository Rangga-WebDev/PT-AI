/** @format */

import "server-only";

import { randomBytes } from "node:crypto";

import { formatPseudonym } from "@/lib/research/consent";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `research.participants` tidak memiliki policy untuk peran klien mana pun,
 * termasuk admin. Pendaftaran dan pencabutan karena itu hanya lewat sini,
 * memakai service role, dan tidak pernah dari komponen klien.
 *
 * Schema `research` tidak diekspos PostgREST, sehingga aksesnya memakai fungsi
 * SQL berhak eksekusi terbatas.
 */
export async function registerParticipant(
  profileId: string,
  consentRecordId: string,
): Promise<{ ok: boolean; pseudonym?: string; error?: string }> {
  const supabase = createAdminClient();

  // Tabrakan pseudonim sangat kecil kemungkinannya, tetapi tetap dicoba ulang
  // ketimbang menggagalkan persetujuan mahasiswa.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const pseudonym = formatPseudonym(randomBytes(8));

    const { error } = await supabase.rpc("register_research_participant", {
      p_profile_id: profileId,
      p_consent_record_id: consentRecordId,
      p_pseudonym: pseudonym,
    });

    if (!error) return { ok: true, pseudonym };
    if (!error.message.includes("participants_pseudonym_key")) {
      return { ok: false, error: error.message };
    }
  }

  return { ok: false, error: "Gagal membuat pseudonim unik." };
}

/**
 * Menarik consent memutus pemetaan identitas, bukan menghapus jejak belajar.
 * Jejak itu append-only dan tidak dapat dihapus siapa pun (LOCK-PED-012);
 * yang hilang permanen adalah kemampuan mengaitkannya kepada seseorang.
 */
export async function removeParticipant(
  profileId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc("remove_research_participant", {
    p_profile_id: profileId,
  });

  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function countParticipants(): Promise<number> {
  const supabase = createAdminClient();
  const { data } = await supabase.rpc("research_participant_count");
  return typeof data === "number" ? data : 0;
}
