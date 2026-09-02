/** @format */

import "server-only";

import {
  extractDocumentText,
  EXTRACTION_FAILURE_MESSAGE,
  type ExtractionFailure,
} from "@/lib/materials/extraction/extractor";
import { requireLecturerOfClass } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

import {
  readMaterialObject,
  recordExtractionOutcome,
} from "./material-storage";

export type ExtractionRejection =
  | "forbidden"
  | "resource_not_found"
  | "no_file"
  | "storage_error"
  | ExtractionFailure;

export const EXTRACTION_MESSAGE: Record<ExtractionRejection, string> = {
  ...EXTRACTION_FAILURE_MESSAGE,
  forbidden: "Anda tidak berwenang atas dokumen ini.",
  resource_not_found: "Dokumen tidak ditemukan.",
  no_file: "Bahan ini tidak memiliki berkas untuk dibaca.",
  storage_error: "Dokumen gagal diambil dari penyimpanan. Silakan coba lagi.",
};

export type ExtractionResult =
  | { ok: true; characters: number; truncated: boolean }
  | { ok: false; reason: ExtractionRejection };

/**
 * Penjaga sejalan dalam satu proses. Pada penyebaran banyak instans ia tidak
 * berlaku lintas instans, dan itu memang tidak apa: ekstraksi bersifat
 * deterministik atas objek yang sama, sehingga dua jalannya bersamaan
 * menghasilkan tulisan yang identik, bukan keadaan yang rusak.
 */
const inFlight = new Set<string>();

/**
 * Satu-satunya masukan publik adalah id bahan. Kunci objek dan kelas
 * pemiliknya dibaca dari basis data lewat sesi pengguna, sehingga jalur
 * penyimpanan tidak pernah datang dari permintaan.
 */
export async function extractMaterial(
  resourceId: string,
): Promise<ExtractionResult> {
  const supabase = await createClient();

  const { data: resource } = await supabase
    .from("learning_resources")
    .select("id, class_id, storage_path, mime_type, extracted_text")
    .eq("id", resourceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!resource?.class_id) return { ok: false, reason: "resource_not_found" };

  try {
    await requireLecturerOfClass(resource.class_id);
  } catch {
    return { ok: false, reason: "forbidden" };
  }

  if (!resource.storage_path || !resource.mime_type) {
    return { ok: false, reason: "no_file" };
  }

  if (inFlight.has(resourceId)) {
    return { ok: false, reason: "storage_error" };
  }
  inFlight.add(resourceId);

  try {
    let bytes: Uint8Array;
    try {
      bytes = await readMaterialObject(resource.storage_path);
    } catch (error) {
      console.error("[extraction] storage", {
        at: new Date().toISOString(),
        resourceId,
        message: error instanceof Error ? error.message : "unknown",
      });
      return { ok: false, reason: "storage_error" };
    }

    const output = await extractDocumentText(resource.mime_type, bytes);

    if (!output.ok) {
      console.warn("[extraction] failed", {
        at: new Date().toISOString(),
        resourceId,
        mimeType: resource.mime_type,
        failure: output.failure,
      });

      await recordExtractionOutcome(resourceId, {
        status:
          output.failure === "unsupported_type" ? "unsupported" : "failed",
      });

      return { ok: false, reason: output.failure };
    }

    await recordExtractionOutcome(resourceId, {
      status: "succeeded",
      text: output.text,
    });

    return {
      ok: true,
      characters: output.text.length,
      truncated: output.truncated,
    };
  } finally {
    inFlight.delete(resourceId);
  }
}
