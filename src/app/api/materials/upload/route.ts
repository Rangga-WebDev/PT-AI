/** @format */

import { NextResponse } from "next/server";

import { MATERIAL_MAX_BYTES } from "@/lib/validation/materials";
import {
  consumeRateLimit,
  RATE_LIMIT_MESSAGE,
} from "@/server/services/rate-limit";
import {
  uploadClassMaterial,
  type UploadFailureReason,
} from "@/server/services/material-upload";

/**
 * Unggahan berkas dipisahkan dari Server Action supaya batas body besar hanya
 * berlaku di sini. Server Action lain tetap memakai batas bawaan Next.js yang
 * jauh lebih ketat.
 */

// Multipart membawa boundary dan field teks di luar berkasnya, sehingga
// Content-Length selalu sedikit lebih besar daripada berkas itu sendiri.
const MULTIPART_OVERHEAD_BYTES = 1_048_576;
const MAX_REQUEST_BYTES = MATERIAL_MAX_BYTES + MULTIPART_OVERHEAD_BYTES;

const STATUS_BY_REASON: Record<UploadFailureReason, number> = {
  unauthenticated: 401,
  forbidden: 403,
  invalid: 400,
  file_rejected: 415,
  server: 500,
};

function reject(error: string, status: number): NextResponse {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(request: Request): Promise<NextResponse> {
  // Ukuran diperiksa sebelum body dibaca. Tanpa ini, permintaan sebesar apa
  // pun akan lebih dahulu dimuat seluruhnya ke memori untuk kemudian ditolak.
  const declaredLength = Number(request.headers.get("content-length"));

  if (!Number.isFinite(declaredLength) || declaredLength <= 0) {
    return reject("Ukuran permintaan tidak dinyatakan.", 411);
  }

  if (declaredLength > MAX_REQUEST_BYTES) {
    return reject("Ukuran berkas melebihi 25 MB.", 413);
  }

  // Pembatas laju dijalankan sebelum body dibaca, dengan alasan yang sama.
  if (!(await consumeRateLimit("material_upload"))) {
    return reject(RATE_LIMIT_MESSAGE.material_upload, 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reject("Permintaan tidak dapat dibaca.", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return reject("Berkas belum dipilih.", 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  const outcome = await uploadClassMaterial({
    fields: {
      classId: form.get("classId"),
      title: form.get("title"),
      description: form.get("description") ?? undefined,
      materialKind: form.get("materialKind"),
      visibility: form.get("visibility") ?? "student",
    },
    file: { name: file.name, type: file.type, bytes },
  });

  if (!outcome.ok) {
    return reject(outcome.error, STATUS_BY_REASON[outcome.reason]);
  }

  return NextResponse.json(
    {
      ok: true,
      resourceId: outcome.resourceId,
      extractionStatus: outcome.extractionStatus,
    },
    { status: 201 },
  );
}
