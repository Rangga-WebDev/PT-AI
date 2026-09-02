/** @format */

import "server-only";

import { createHash } from "node:crypto";

import { AppError, AuthorizationError, NotFoundError } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  materialStorageKey,
  type ExtractionStatus,
  type MaterialMime,
} from "@/lib/validation/materials";

export const MATERIALS_BUCKET = "materials";

/**
 * Umur signed URL sengaja pendek. Tautan yang bocor lewat riwayat peramban,
 * salinan tempel, atau log proxy karena itu punya jendela pakai yang sempit.
 */
export const SIGNED_URL_TTL_SECONDS = 300;

export function checksumOf(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

class StorageError extends AppError {
  constructor(message: string) {
    super("DATABASE", "Berkas gagal diproses. Coba lagi.", message);
    this.name = "StorageError";
  }
}

/**
 * Klien hanya boleh menyebut id bahan. Kunci objek disusun di server dari
 * identitas yang sudah tervalidasi, sehingga tidak ada jalan bagi klien untuk
 * mengarahkan operasi ke objek milik kelas lain.
 */
export async function putMaterialObject(params: {
  classId: string;
  resourceId: string;
  body: Uint8Array;
  contentType: MaterialMime;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.storage
    .from(MATERIALS_BUCKET)
    .upload(
      materialStorageKey(params.classId, params.resourceId),
      params.body,
      { contentType: params.contentType, upsert: false },
    );

  if (error) throw new StorageError(`putMaterialObject: ${error.message}`);
}

export async function removeMaterialObject(params: {
  classId: string;
  resourceId: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.storage
    .from(MATERIALS_BUCKET)
    .remove([materialStorageKey(params.classId, params.resourceId)]);
}

/**
 * Kunci objek berasal dari baris basis data yang sudah diotorisasi, bukan dari
 * permintaan. Bucket tetap tertutup bagi klien; hanya server yang membacanya.
 */
export async function readMaterialObject(
  storagePath: string,
): Promise<Uint8Array> {
  const admin = createAdminClient();

  const { data, error } = await admin.storage
    .from(MATERIALS_BUCKET)
    .download(storagePath);

  if (error || !data) {
    throw new StorageError(
      `readMaterialObject: ${error?.message ?? "objek kosong"}`,
    );
  }

  return new Uint8Array(await data.arrayBuffer());
}

export interface SignedMaterialDownload {
  url: string;
  filename: string;
  expiresInSeconds: number;
}

/**
 * Otorisasi dilakukan dengan membaca barisnya memakai sesi pengguna, sehingga
 * yang memutuskan adalah RLS `learning_resources_select` — enrollment,
 * visibility, status terbit, dan can_access_activity sekaligus. Baris yang
 * tidak terlihat berarti tidak berhak, dan penandatanganan tidak pernah
 * terjadi. Service role baru dipakai sesudah keputusan itu, semata karena
 * bucket tertutup bagi klien.
 */
export async function createMaterialDownloadUrl(
  materialId: string,
): Promise<SignedMaterialDownload> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("learning_resources")
    .select("id, class_id, storage_path, original_filename")
    .eq("id", materialId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data) throw new AuthorizationError();
  if (!data.storage_path) {
    throw new NotFoundError("Bahan ini tidak memiliki berkas untuk diunduh.");
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from(MATERIALS_BUCKET)
    .createSignedUrl(data.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: data.original_filename ?? true,
    });

  if (error || !signed) {
    throw new StorageError(
      `createMaterialDownloadUrl: ${error?.message ?? "tautan kosong"}`,
    );
  }

  return {
    url: signed.signedUrl,
    filename: data.original_filename ?? "berkas",
    expiresInSeconds: SIGNED_URL_TTL_SECONDS,
  };
}

export type ExtractionOutcome =
  | { status: "succeeded"; text: string }
  | { status: Exclude<ExtractionStatus, "succeeded" | "pending"> };

/**
 * Pengunggahan tidak pernah dengan sendirinya berarti isi berkas sudah
 * terbaca. Status ekstraksi hanya berpindah lewat jalur ini, dan hanya
 * `succeeded` yang boleh membawa teks — aturan yang sama ditegakkan
 * `ck_learning_resources_extraction` di basis data.
 */
export async function recordExtractionOutcome(
  materialId: string,
  outcome: ExtractionOutcome,
): Promise<void> {
  const admin = createAdminClient();

  const patch =
    outcome.status === "succeeded"
      ? {
          extraction_status: "succeeded",
          extracted_text: outcome.text,
          extracted_at: new Date().toISOString(),
        }
      : {
          extraction_status: outcome.status,
          extracted_text: null,
          extracted_at: new Date().toISOString(),
        };

  const { error } = await admin
    .from("learning_resources")
    .update(patch)
    .eq("id", materialId);

  if (error) {
    throw new StorageError(`recordExtractionOutcome: ${error.message}`);
  }
}
