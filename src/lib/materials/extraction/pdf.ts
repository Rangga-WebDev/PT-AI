/** @format */

import { extractText, getDocumentProxy } from "unpdf";

export class PdfReadError extends Error {}

/**
 * pdf.js mengambil alih buffer masukan dan mengosongkannya setelah dipakai.
 * Pemanggil karena itu tidak boleh memakai ulang `bytes` sesudah fungsi ini.
 *
 * Tidak ada sumber daya jarak jauh yang diambil: pemrosesan sepenuhnya atas
 * data yang sudah ada di memori.
 */
export async function extractPdfText(
  bytes: Uint8Array,
): Promise<{ text: string; pages: number }> {
  let document;
  try {
    document = await getDocumentProxy(bytes);
  } catch (error) {
    throw new PdfReadError(
      error instanceof Error ? error.message : "berkas PDF tidak terbaca",
    );
  }

  try {
    // Halaman digabung menurut urutannya, dipisahkan baris baru.
    const result = await extractText(document, { mergePages: true });
    return { text: result.text, pages: result.totalPages };
  } catch (error) {
    throw new PdfReadError(
      error instanceof Error ? error.message : "isi PDF tidak terbaca",
    );
  }
}
