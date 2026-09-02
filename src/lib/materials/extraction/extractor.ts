/** @format */

import { extractDocxText } from "./docx";
import { extractPdfText } from "./pdf";
import {
  capExtractedText,
  meaningfulLength,
  normalizeExtractedText,
  MIN_MEANINGFUL_CHARS,
} from "./normalize";

export type ExtractionFailure =
  | "unsupported_type"
  | "unreadable_file"
  | "no_text_layer"
  | "empty_document";

export const EXTRACTION_FAILURE_MESSAGE: Record<ExtractionFailure, string> = {
  unsupported_type: "Format dokumen ini belum dapat dibaca.",
  unreadable_file: "Dokumen gagal dibaca. Berkasnya mungkin rusak.",
  no_text_layer:
    "Teks tidak ditemukan pada PDF. Dokumen mungkin berupa hasil pindai.",
  empty_document: "Dokumen tidak memuat teks yang dapat dibaca.",
};

export type ExtractionOutput =
  | { ok: true; text: string; truncated: boolean; pages: number | null }
  | { ok: false; failure: ExtractionFailure };

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isExtractableMime(mime: string): boolean {
  return (
    mime === "application/pdf" ||
    mime === DOCX_MIME ||
    mime === "text/plain" ||
    mime === "text/markdown"
  );
}

/**
 * Bekerja atas byte, bukan atas kunci objek: siapa yang berhak membaca berkas
 * sudah diputuskan sebelum fungsi ini dipanggil.
 *
 * Parser yang tidak melempar bukan berarti dokumen berisi. Ambang isi diuji
 * sesudahnya supaya PDF hasil pindai tidak lolos sebagai sukses palsu.
 */
export async function extractDocumentText(
  mimeType: string,
  bytes: Uint8Array,
): Promise<ExtractionOutput> {
  if (!isExtractableMime(mimeType)) {
    return { ok: false, failure: "unsupported_type" };
  }

  let raw: string;
  let pages: number | null = null;

  try {
    if (mimeType === "application/pdf") {
      const result = await extractPdfText(bytes);
      raw = result.text;
      pages = result.pages;
    } else if (mimeType === DOCX_MIME) {
      raw = extractDocxText(bytes);
    } else {
      raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
  } catch {
    return { ok: false, failure: "unreadable_file" };
  }

  const normalized = normalizeExtractedText(raw);

  if (meaningfulLength(normalized) < MIN_MEANINGFUL_CHARS) {
    return {
      ok: false,
      failure:
        mimeType === "application/pdf" ? "no_text_layer" : "empty_document",
    };
  }

  const capped = capExtractedText(normalized);
  return {
    ok: true,
    text: capped.text,
    truncated: capped.truncated,
    pages,
  };
}
