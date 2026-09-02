/** @format */

import { z } from "zod";

/**
 * Batas ini menggandakan apa yang sudah ditegakkan bucket Storage dan
 * constraint tabel (migration 0027). Duplikasi disengaja: aplikasi menolak
 * lebih dahulu supaya pengguna memperoleh pesan yang bermakna, sedangkan dua
 * lapis di bawahnya tetap menjadi penentu terakhir.
 */
export const MATERIAL_MAX_BYTES = 26_214_400;

export const MATERIAL_MIME_ALLOWLIST = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/markdown",
] as const;

export type MaterialMime = (typeof MATERIAL_MIME_ALLOWLIST)[number];

export const MATERIAL_MIME_LABEL: Record<MaterialMime, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word (DOCX)",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PowerPoint (PPTX)",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
    "Excel (XLSX)",
  "text/plain": "Teks",
  "text/markdown": "Markdown",
};

export const MATERIAL_KINDS = [
  "rps",
  "syllabus",
  "module",
  "reading",
  "reference",
  "handbook",
  "slide",
  "other",
] as const;

export type MaterialKind = (typeof MATERIAL_KINDS)[number];

export const MATERIAL_KIND_LABEL: Record<MaterialKind, string> = {
  rps: "RPS",
  syllabus: "Silabus",
  module: "Modul",
  reading: "Bahan bacaan",
  reference: "Referensi",
  handbook: "Panduan",
  slide: "Slide",
  other: "Lainnya",
};

export const MATERIAL_VISIBILITIES = ["student", "lecturer"] as const;
export type MaterialVisibility = (typeof MATERIAL_VISIBILITIES)[number];

export const EXTRACTION_STATUSES = [
  "pending",
  "succeeded",
  "failed",
  "unsupported",
] as const;
export type ExtractionStatus = (typeof EXTRACTION_STATUSES)[number];

export function isAllowedMaterialMime(value: string): value is MaterialMime {
  return (MATERIAL_MIME_ALLOWLIST as readonly string[]).includes(value);
}

/**
 * Bentuk kunci objek harus sama persis dengan yang ditegakkan trigger
 * `enforce_material_storage_key()`. Nama berkas pengguna tidak pernah masuk ke
 * sini; ia hanya disimpan sebagai metadata tampilan.
 */
export function materialStorageKey(
  classId: string,
  resourceId: string,
): string {
  return `${classId}/${resourceId}`;
}

/**
 * Nama berkas dari pengguna hanya ditampilkan, tetapi tetap dibersihkan:
 * pemisah path, karakter kendali, dan panjang berlebih tidak punya alasan
 * untuk bertahan sampai ke antarmuka atau header unduhan.
 */
export function safeDisplayFilename(raw: string): string {
  const withoutPath = raw.split(/[/\\]/).pop() ?? raw;
  const cleaned = withoutPath.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const collapsed = cleaned.replace(/\s+/g, " ");
  return collapsed.slice(0, 180) || "berkas";
}

export type SignatureKind = "pdf" | "zip" | "text" | "unknown";

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04];

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Tipe yang dideklarasikan peramban berasal dari klien dan tidak dapat
 * dipercaya. Isi berkas diperiksa sendiri sebelum satu byte pun disimpan.
 */
export function detectSignature(bytes: Uint8Array): SignatureKind {
  if (startsWith(bytes, PDF_SIGNATURE)) return "pdf";
  if (startsWith(bytes, ZIP_SIGNATURE)) return "zip";

  // Berkas teks tidak punya tanda tangan; yang membedakannya adalah tidak
  // adanya byte NUL dan dapat diuraikan sebagai UTF-8.
  if (bytes.length === 0) return "unknown";
  if (bytes.includes(0x00)) return "unknown";

  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return "text";
  } catch {
    return "unknown";
  }
}

const SIGNATURE_FOR_MIME: Record<MaterialMime, SignatureKind> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "zip",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "zip",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "zip",
  "text/plain": "text",
  "text/markdown": "text",
};

export interface UploadCandidate {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  head: Uint8Array;
}

export type UploadRejection =
  | "empty"
  | "too_large"
  | "mime_not_allowed"
  | "content_mismatch";

export const UPLOAD_REJECTION_MESSAGE: Record<UploadRejection, string> = {
  empty: "Berkas kosong tidak dapat diunggah.",
  too_large: "Ukuran berkas melebihi 25 MB.",
  mime_not_allowed:
    "Jenis berkas tidak didukung. Gunakan PDF, DOCX, PPTX, XLSX, teks, atau Markdown.",
  content_mismatch: "Isi berkas tidak cocok dengan jenis yang dinyatakan.",
};

export type UploadCheck =
  | { ok: true; mimeType: MaterialMime; filename: string }
  | { ok: false; reason: UploadRejection };

export function checkUpload(candidate: UploadCandidate): UploadCheck {
  if (candidate.sizeBytes <= 0) return { ok: false, reason: "empty" };
  if (candidate.sizeBytes > MATERIAL_MAX_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  const mimeType = candidate.mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!isAllowedMaterialMime(mimeType)) {
    return { ok: false, reason: "mime_not_allowed" };
  }

  if (detectSignature(candidate.head) !== SIGNATURE_FOR_MIME[mimeType]) {
    return { ok: false, reason: "content_mismatch" };
  }

  return {
    ok: true,
    mimeType,
    filename: safeDisplayFilename(candidate.filename),
  };
}

const uuid = (label: string) => z.string().uuid(`${label} tidak valid.`);

const title = z
  .string()
  .trim()
  .min(3, "Judul minimal 3 karakter.")
  .max(200, "Judul maksimal 200 karakter.");

const description = z
  .string()
  .trim()
  .max(2000, "Deskripsi maksimal 2000 karakter.")
  .optional();

/** Hanya http(s): mencegah `javascript:` dan `data:` masuk ke atribut href. */
const linkUrl = z
  .string()
  .trim()
  .url("Tautan tidak valid.")
  .refine(
    (value) => /^https?:\/\//i.test(value),
    "Tautan harus diawali http:// atau https://",
  );

export const materialParentSchema = z
  .object({
    classId: uuid("Kelas").optional(),
    moduleId: uuid("Modul").optional(),
    learningUnitId: uuid("Unit").optional(),
    activityId: uuid("Aktivitas").optional(),
  })
  .refine(
    (value) =>
      [
        value.classId,
        value.moduleId,
        value.learningUnitId,
        value.activityId,
      ].filter(Boolean).length === 1,
    "Bahan harus melekat tepat pada satu induk.",
  );

const materialFields = {
  title,
  description,
  materialKind: z.enum(MATERIAL_KINDS, {
    message: "Jenis bahan tidak valid.",
  }),
  visibility: z.enum(MATERIAL_VISIBILITIES, {
    message: "Visibilitas tidak valid.",
  }),
};

export const createLinkMaterialSchema = z.object({
  ...materialFields,
  classId: uuid("Kelas"),
  resourceType: z.enum(["link", "video"], {
    message: "Jenis tautan tidak valid.",
  }),
  url: linkUrl,
});

export const createFileMaterialSchema = z.object({
  ...materialFields,
  classId: uuid("Kelas"),
});

/**
 * Materi yang diketik dosen tetap disimpan sebagai objek Markdown, bukan kolom
 * teks: `ck_learning_resources_target` menuntut setiap bahan punya url atau
 * storage_path, dan menempuh jalur unggah yang sama membuat checksum serta
 * ekstraksinya ikut terbentuk tanpa cabang kode kedua.
 */
export const createNoteMaterialSchema = z.object({
  ...materialFields,
  classId: uuid("Kelas"),
  content: z
    .string()
    .trim()
    .min(20, "Isi materi minimal 20 karakter.")
    .max(50_000, "Isi materi maksimal 50.000 karakter."),
});

export const updateMaterialSchema = z.object({
  ...materialFields,
  id: uuid("Bahan"),
});

export const materialPublicationSchema = z.object({
  id: uuid("Bahan"),
  status: z.enum(["draft", "published", "archived"], {
    message: "Status tidak valid.",
  }),
});

export const materialIdSchema = z.object({ id: uuid("Bahan") });
