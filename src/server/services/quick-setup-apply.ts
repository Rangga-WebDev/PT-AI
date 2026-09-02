/** @format */

import "server-only";

import { buildApplyPlan, type ApplyPlan } from "@/lib/ai/apply-plan";
import { quickSetupDraftSchema } from "@/lib/ai/quick-setup-schema";
import { isPostgresError, toDatabaseError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type ApplyRejection =
  | "draft_not_found"
  | "not_approved"
  | "class_mismatch"
  | "forbidden"
  | "nothing_to_apply"
  | "sequence_taken"
  | "database_error";

export const APPLY_MESSAGE: Record<ApplyRejection, string> = {
  draft_not_found: "Draf tidak ditemukan.",
  not_approved: "Hanya draf yang sudah disetujui yang dapat diterapkan.",
  class_mismatch: "Draf ini bukan milik kelas tersebut.",
  forbidden: "Anda tidak berwenang atas kelas ini.",
  nothing_to_apply:
    "Tidak ada pertemuan baru untuk dibuat. Seluruhnya sudah ada di kelas.",
  sequence_taken:
    "Nomor pertemuan sudah dipakai di kelas ini. Muat ulang halaman lalu coba lagi.",
  database_error: "Perubahan gagal disimpan. Tidak ada yang berubah.",
};

export type PreviewResult =
  | { ok: true; plan: ApplyPlan }
  | { ok: false; reason: ApplyRejection };

export type ApplyResult =
  | { ok: true; created: number; skipped: number }
  | { ok: false; reason: ApplyRejection };

interface AuthorizedDraft {
  id: string;
  classId: string;
  lecturerId: string;
  plan: ApplyPlan;
}

/**
 * Status draf dibaca dari basis data, tidak pernah dari klien, dan barisnya
 * diambil lewat sesi pengguna sehingga RLS yang memutuskan visibilitas.
 * Kepemilikan kelas diperiksa dua kali: dari baris draf, lalu lewat
 * `requireLecturerOfClass`.
 */
async function authorize(
  draftId: string,
  classId: string,
): Promise<AuthorizedDraft | ApplyRejection> {
  const supabase = await createClient();

  const { data: draftRow } = await supabase
    .from("ai_material_drafts")
    .select("id, class_id, status, output")
    .eq("id", draftId)
    .maybeSingle();

  if (!draftRow) return "draft_not_found";
  if (draftRow.class_id !== classId) return "class_mismatch";
  if (draftRow.status !== "approved") return "not_approved";

  let lecturerId: string;
  try {
    lecturerId = (await requireLecturerOfClass(draftRow.class_id)).id;
  } catch {
    return "forbidden";
  }

  const parsed = (() => {
    try {
      return quickSetupDraftSchema.safeParse(JSON.parse(draftRow.output));
    } catch {
      return null;
    }
  })();

  if (!parsed?.success) return "draft_not_found";

  const { data: modules } = await supabase
    .from("modules")
    .select("sequence, title")
    .eq("class_id", draftRow.class_id)
    .is("deleted_at", null)
    .order("sequence", { ascending: true });

  return {
    id: draftRow.id,
    classId: draftRow.class_id,
    lecturerId,
    plan: buildApplyPlan(parsed.data, modules ?? []),
  };
}

export async function previewQuickSetupApply(
  draftId: string,
  classId: string,
): Promise<PreviewResult> {
  const result = await authorize(draftId, classId);
  if (typeof result === "string") return { ok: false, reason: result };
  return { ok: true, plan: result.plan };
}

export async function applyQuickSetupDraft(
  draftId: string,
  classId: string,
): Promise<ApplyResult> {
  const authorized = await authorize(draftId, classId);
  if (typeof authorized === "string") {
    return { ok: false, reason: authorized };
  }

  const { plan } = authorized;
  if (plan.create.length === 0) {
    return { ok: false, reason: "nothing_to_apply" };
  }

  const supabase = await createClient();

  // Satu pernyataan sisip untuk seluruh modul. PostgREST menjalankannya sebagai
  // satu perintah, sehingga satu baris yang ditolak membatalkan semuanya —
  // tidak ada struktur setengah jadi yang tertinggal.
  const { error } = await supabase.from("modules").insert(
    plan.create.map((item) => ({
      class_id: authorized.classId,
      title: item.title,
      description: item.description,
      sequence: item.sequence,
      created_by: authorized.lecturerId,
    })),
  );

  if (error) {
    const mapped = isPostgresError(error)
      ? toDatabaseError(error, "applyQuickSetupDraft")
      : null;

    return {
      ok: false,
      reason:
        mapped?.kind === "unique_violation"
          ? "sequence_taken"
          : "database_error",
    };
  }

  await recordApplication(authorized, plan);

  return { ok: true, created: plan.create.length, skipped: plan.skip.length };
}

/**
 * Draf yang sudah disetujui dibekukan triggernya, sehingga penerapan tidak
 * dapat dicatat di barisnya sendiri. Jejaknya ditulis ke `audit_logs` — satu
 * satunya tempat tahan lama yang tersedia tanpa mengubah skema.
 */
async function recordApplication(
  authorized: AuthorizedDraft,
  plan: ApplyPlan,
): Promise<void> {
  const entry = {
    at: new Date().toISOString(),
    draftId: authorized.id,
    classId: authorized.classId,
    actorId: authorized.lecturerId,
    created: plan.create.map((item) => item.sequence),
    skipped: plan.skip.map((item) => item.sequence),
  };

  console.info("[quick-setup] applied", entry);

  try {
    await createAdminClient().from("audit_logs").insert({
      actor_id: authorized.lecturerId,
      action: "quick_setup_apply",
      subject_table: "modules",
      subject_id: authorized.id,
      after: entry,
    });
  } catch (error) {
    // Struktur sudah terbentuk; kegagalan mencatat tidak boleh membatalkannya.
    console.error("[quick-setup] audit", {
      at: new Date().toISOString(),
      draftId: authorized.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
