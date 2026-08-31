/** @format */

import "server-only";

import { randomUUID } from "node:crypto";

import {
  AppError,
  AuthenticationError,
  isPostgresError,
  toDatabaseError,
} from "@/lib/errors";
import {
  requireLecturerOfClass,
  requireUserOrThrow,
} from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import {
  checkUpload,
  createFileMaterialSchema,
  decodeUtf8Text,
  isInlineExtractable,
  materialStorageKey,
  UPLOAD_REJECTION_MESSAGE,
  type ExtractionStatus,
} from "@/lib/validation/materials";
import { nextMaterialSequence } from "@/server/repositories/materials";
import {
  checksumOf,
  putMaterialObject,
  recordExtractionOutcome,
  removeMaterialObject,
} from "@/server/services/material-storage";

/** Byte awal sudah cukup untuk mengenali tanda tangan berkas. */
const SIGNATURE_SAMPLE_BYTES = 4096;

export type UploadFailureReason =
  | "unauthenticated"
  | "forbidden"
  | "invalid"
  | "file_rejected"
  | "server";

export type UploadMaterialOutcome =
  | { ok: true; resourceId: string; extractionStatus: ExtractionStatus }
  | { ok: false; reason: UploadFailureReason; error: string };

export interface UploadMaterialInput {
  fields: Record<string, unknown>;
  file: { name: string; type: string; bytes: Uint8Array };
  /** `note` untuk materi yang diketik dosen; isinya tetap disimpan sebagai objek. */
  resourceType?: "file" | "note";
}

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Data yang dikirim tidak valid.";
}

/**
 * Galat mentah tidak pernah keluar dari fungsi ini. Yang teknis dicatat lewat
 * infrastruktur P4, yang dikembalikan hanya kalimat yang aman dibaca pengguna.
 */
function toFailure(error: unknown): UploadMaterialOutcome {
  if (error instanceof AuthenticationError) {
    return { ok: false, reason: "unauthenticated", error: error.publicMessage };
  }

  if (error instanceof AppError) {
    return { ok: false, reason: "forbidden", error: error.publicMessage };
  }

  if (isPostgresError(error)) {
    return {
      ok: false,
      reason: "server",
      error: toDatabaseError(error, "uploadClassMaterial").publicMessage,
    };
  }

  console.error("[unexpected]", {
    at: new Date().toISOString(),
    operation: "uploadClassMaterial",
    error,
  });
  return {
    ok: false,
    reason: "server",
    error: "Berkas gagal diunggah. Silakan coba lagi.",
  };
}

/**
 * Satu-satunya jalur masuk berkas bahan ajar. Urutannya mengikat: identitas
 * dan wewenang diputuskan lewat sesi pengguna — sehingga RLS yang menjawab —
 * dan kredensial service role baru menyentuh Storage setelah keputusan itu
 * jatuh. Membalik urutannya berarti menyimpan berkas atas nama orang yang
 * belum tentu berhak.
 */
export async function uploadClassMaterial(
  input: UploadMaterialInput,
): Promise<UploadMaterialOutcome> {
  let classId: string | null = null;
  let resourceId: string | null = null;
  let rowInserted = false;

  try {
    await requireUserOrThrow();

    const parsed = createFileMaterialSchema.safeParse(input.fields);
    if (!parsed.success) {
      return { ok: false, reason: "invalid", error: firstIssue(parsed.error) };
    }

    const lecturer = await requireLecturerOfClass(parsed.data.classId);

    const bytes = input.file.bytes;
    const check = checkUpload({
      filename: input.file.name,
      mimeType: input.file.type,
      sizeBytes: bytes.byteLength,
      head: bytes.subarray(0, SIGNATURE_SAMPLE_BYTES),
    });

    if (!check.ok) {
      return {
        ok: false,
        reason: "file_rejected",
        error: UPLOAD_REJECTION_MESSAGE[check.reason],
      };
    }

    // Id dibuat lebih dahulu supaya kunci objek dapat disusun sebelum baris
    // ditulis; trigger basis data menuntut keduanya cocok persis.
    resourceId = randomUUID();
    classId = parsed.data.classId;

    const supabase = await createClient();

    // Baris ditulis lebih dahulu agar constraint dan trigger — gerbang paling
    // ketat — menolak sebelum satu byte pun tersimpan.
    const { error } = await supabase.from("learning_resources").insert({
      id: resourceId,
      class_id: classId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      resource_type: input.resourceType ?? "file",
      material_kind: parsed.data.materialKind,
      visibility: parsed.data.visibility,
      storage_path: materialStorageKey(classId, resourceId),
      mime_type: check.mimeType,
      size_bytes: bytes.byteLength,
      original_filename: check.filename,
      checksum: checksumOf(bytes),
      sequence: await nextMaterialSequence(classId),
      created_by: lecturer.id,
    });

    if (error) throw error;
    rowInserted = true;

    await putMaterialObject({
      classId,
      resourceId,
      body: bytes,
      contentType: check.mimeType,
    });

    rowInserted = false;

    return {
      ok: true,
      resourceId,
      extractionStatus: await runInlineExtraction(
        resourceId,
        check.mimeType,
        bytes,
      ),
    };
  } catch (error) {
    // Objek tidak pernah ditulis sebelum barisnya ada, sehingga objek yatim
    // mustahil. Yang mungkin adalah kebalikannya: baris yang penunjuknya tidak
    // jadi berisi objek — dan itu tampil kepada pengguna sebagai bahan rusak.
    if (rowInserted && classId && resourceId) {
      await discardPartialUpload(classId, resourceId);
    }
    return toFailure(error);
  }
}

/**
 * Ekstraksi dijalankan setelah objek aman tersimpan. Kegagalannya tidak boleh
 * membatalkan unggahan yang sudah berhasil, sehingga bahan tetap dapat diunduh
 * meski teksnya belum terbaca. Berkas biner sengaja dibiarkan `pending`.
 */
async function runInlineExtraction(
  resourceId: string,
  mimeType: string,
  bytes: Uint8Array,
): Promise<ExtractionStatus> {
  if (!isInlineExtractable(mimeType)) return "pending";

  const text = decodeUtf8Text(bytes);

  try {
    await recordExtractionOutcome(
      resourceId,
      text === null ? { status: "failed" } : { status: "succeeded", text },
    );
    return text === null ? "failed" : "succeeded";
  } catch {
    return "pending";
  }
}

async function discardPartialUpload(
  classId: string,
  resourceId: string,
): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("learning_resources").delete().eq("id", resourceId);
    await removeMaterialObject({ classId, resourceId });
  } catch (cleanupError) {
    console.error("[cleanup]", {
      at: new Date().toISOString(),
      operation: "discardPartialUpload",
      resourceId,
      error: cleanupError,
    });
  }
}
