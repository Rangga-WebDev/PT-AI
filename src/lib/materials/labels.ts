/** @format */

import type { MaterialView } from "@/lib/materials/types";

// Istilah basis data tidak pernah sampai ke layar. Pemetaannya dikumpulkan di
// satu modul murni supaya dapat diuji tanpa merender apa pun.

export const MATERIAL_STATUS_LABEL = {
  draft: "Draf",
  published: "Terbit",
  archived: "Ditarik",
} as const;

export const MATERIAL_VISIBILITY_LABEL = {
  student: "Mahasiswa",
  lecturer: "Hanya dosen",
} as const;

export const MATERIAL_EXTRACTION_LABEL = {
  pending: "Menunggu pembacaan",
  succeeded: "Teks siap",
  failed: "Pembacaan gagal",
  unsupported: "Tidak dapat dibaca",
} as const;

const MIME_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "Slide",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "text/plain": "Teks",
  "text/markdown": "Teks",
};

/** Yang dilihat dosen adalah bentuk bahannya, bukan nilai kolom `resource_type`. */
export function materialFormatLabel(material: MaterialView): string {
  if (material.resourceType === "link") return "Tautan";
  if (material.resourceType === "video") return "Video";
  if (material.resourceType === "note") return "Tulisan";
  return material.mimeType
    ? (MIME_LABEL[material.mimeType] ?? "Berkas")
    : "Berkas";
}

export type MaterialStatusTone =
  | "draft"
  | "published"
  | "locked"
  | "evidence"
  | "danger";

export function materialStatusTone(
  status: MaterialView["status"],
): MaterialStatusTone {
  if (status === "published") return "published";
  if (status === "archived") return "locked";
  return "draft";
}

/**
 * Status pembacaan hanya bermakna bagi bahan yang punya berkas. Tautan dan
 * tulisan tidak pernah menunggu ekstraksi, jadi menampilkannya di sana hanya
 * akan membuat dosen menunggu sesuatu yang tidak pernah terjadi.
 */
export function materialExtractionNote(material: MaterialView): {
  label: string;
  tone: MaterialStatusTone;
} | null {
  if (!material.hasFile) return null;

  if (material.extractionStatus === "succeeded") {
    return { label: MATERIAL_EXTRACTION_LABEL.succeeded, tone: "published" };
  }
  if (material.extractionStatus === "pending") {
    return { label: MATERIAL_EXTRACTION_LABEL.pending, tone: "evidence" };
  }
  if (material.extractionStatus === "failed") {
    return { label: MATERIAL_EXTRACTION_LABEL.failed, tone: "danger" };
  }
  return { label: MATERIAL_EXTRACTION_LABEL.unsupported, tone: "locked" };
}

const DATE_FORMAT = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatMaterialDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

export function formatMaterialSize(bytes: number | null): string | null {
  if (bytes === null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
