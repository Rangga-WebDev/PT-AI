/** @format */

import "server-only";

import { toDatabaseError } from "@/lib/errors";
import {
  preliminaryOverviewSchema,
  preliminaryRespondentListSchema,
  type PreliminaryOverview,
  type PreliminaryRespondent,
} from "@/lib/research/preliminary-study";
import { requireRoleOrThrow } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { unwrap } from "@/server/repositories/shared";

// Schema research tertutup bagi peran klien. Satu-satunya jalan masuk adalah
// RPC 0038, yang memeriksa peran dan organisasi di dalam basis data; pemeriksaan
// peran di sini hanya mencegah permintaan yang pasti ditolak.

/** Ringkasan agregat dataset terbaru organisasi; null bila belum ada impor. */
export async function getPreliminaryOverview(): Promise<PreliminaryOverview | null> {
  await requireRoleOrThrow("admin", "lecturer");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("preliminary_study_overview");
  if (error) throw toDatabaseError(error, "getPreliminaryOverview");
  return data === null ? null : preliminaryOverviewSchema.parse(data);
}

/** Skor per responden tanpa jawaban; khusus admin. */
export async function listPreliminaryRespondents(
  datasetId: string,
): Promise<PreliminaryRespondent[]> {
  await requireRoleOrThrow("admin");
  const supabase = await createClient();
  const data = unwrap(
    await supabase.rpc("preliminary_study_respondents", {
      p_dataset_id: datasetId,
    }),
    "listPreliminaryRespondents",
  );
  return preliminaryRespondentListSchema.parse(data);
}
