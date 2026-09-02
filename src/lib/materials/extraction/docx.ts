/** @format */

import { inflateRawSync } from "node:zlib";

/**
 * DOCX adalah arsip ZIP berisi XML. Pembacaannya dilakukan sendiri, bukan lewat
 * pustaka pihak ketiga, karena yang dibutuhkan hanya satu entri —
 * `word/document.xml` — dan menolak sisanya adalah jaminan terkuat bahwa tidak
 * ada makro, relasi eksternal, atau sumber daya jarak jauh yang tersentuh.
 */

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

const DOCUMENT_ENTRY = "word/document.xml";

/** Batas ledakan arsip: satu entri tidak boleh mengembang melampaui ini. */
const MAX_ENTRY_BYTES = 80 * 1024 * 1024;

export class DocxReadError extends Error {}

interface CentralEntry {
  name: string;
  method: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

function findEndOfCentralDirectory(view: DataView): number {
  // Komentar arsip paling panjang 65.535 byte, jadi pencarian cukup dari ekor.
  const minimum = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimum; offset -= 1) {
    if (view.getUint32(offset, true) === EOCD_SIGNATURE) return offset;
  }
  throw new DocxReadError("Struktur arsip DOCX tidak ditemukan.");
}

function readCentralDirectory(
  bytes: Uint8Array,
  view: DataView,
): CentralEntry[] {
  const eocd = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  const entries: CentralEntry[] = [];
  const decoder = new TextDecoder("utf-8");

  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > bytes.byteLength) break;
    if (view.getUint32(offset, true) !== CENTRAL_SIGNATURE) break;

    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);

    entries.push({
      name: decoder.decode(
        bytes.subarray(offset + 46, offset + 46 + nameLength),
      ),
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      uncompressedSize: view.getUint32(offset + 24, true),
      localOffset: view.getUint32(offset + 42, true),
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

function readEntry(
  bytes: Uint8Array,
  view: DataView,
  entry: CentralEntry,
): Uint8Array {
  if (entry.uncompressedSize > MAX_ENTRY_BYTES) {
    throw new DocxReadError("Isi dokumen melampaui batas yang wajar.");
  }

  const local = entry.localOffset;
  if (local + 30 > bytes.byteLength) {
    throw new DocxReadError("Penunjuk entri arsip tidak sah.");
  }
  if (view.getUint32(local, true) !== LOCAL_SIGNATURE) {
    throw new DocxReadError("Kepala entri arsip tidak sah.");
  }

  const nameLength = view.getUint16(local + 26, true);
  const extraLength = view.getUint16(local + 28, true);
  const start = local + 30 + nameLength + extraLength;
  const payload = bytes.subarray(start, start + entry.compressedSize);

  if (entry.method === 0) return payload;
  if (entry.method !== 8) {
    throw new DocxReadError(`Metode kompresi ${entry.method} tidak didukung.`);
  }

  return new Uint8Array(
    inflateRawSync(payload, { maxOutputLength: MAX_ENTRY_BYTES }),
  );
}

const XML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * Hanya lima entitas baku dan rujukan numerik yang diterjemahkan. Entitas
 * buatan dari DTD sengaja tidak pernah diperluas, sehingga serangan XXE dan
 * ledakan entitas tidak punya pijakan.
 */
function decodeXmlText(value: string): string {
  return value.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g,
    (match, body: string) => {
      if (body.startsWith("#x") || body.startsWith("#X")) {
        const code = Number.parseInt(body.slice(2), 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      if (body.startsWith("#")) {
        const code = Number.parseInt(body.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return XML_ENTITIES[body] ?? match;
    },
  );
}

/**
 * Teks diambil menurut urutan kemunculannya di dokumen. Batas paragraf, sel,
 * dan baris tabel dipertahankan sebagai baris dan tab supaya struktur bacaan
 * tidak lenyap, tetapi gaya visual sepenuhnya diabaikan.
 */
export function extractDocumentXmlText(xml: string): string {
  const body = xml.slice(xml.indexOf("<w:body"));
  const pattern =
    /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:(?:br|cr)\s*\/?>|<\/w:p>|<\/w:tc>|<\/w:tr>/g;

  let output = "";
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(body)) !== null) {
    const token = match[0];
    if (match[1] !== undefined) {
      output += decodeXmlText(match[1]);
    } else if (token.startsWith("<w:tab")) {
      output += "\t";
    } else if (token.startsWith("</w:tc>")) {
      output += "\t";
    } else {
      output += "\n";
    }
  }

  return output;
}

export function extractDocxText(bytes: Uint8Array): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = readCentralDirectory(bytes, view);
  const entry = entries.find((item) => item.name === DOCUMENT_ENTRY);

  if (!entry) {
    throw new DocxReadError("Dokumen utama tidak ditemukan di dalam berkas.");
  }

  const xml = new TextDecoder("utf-8").decode(readEntry(bytes, view, entry));
  return extractDocumentXmlText(xml);
}
