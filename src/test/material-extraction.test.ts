/** @format */

// @vitest-environment node

import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { extractDocumentText } from "@/lib/materials/extraction/extractor";
import { extractDocumentXmlText } from "@/lib/materials/extraction/docx";
import {
  capExtractedText,
  meaningfulLength,
  normalizeExtractedText,
  MAX_EXTRACTED_CHARS,
} from "@/lib/materials/extraction/normalize";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * PDF minimal yang sah, dengan offset xref dihitung sungguhan.
 *
 * Teks dibungkus per baris karena pdf.js menjatuhkan glif yang jatuh di luar
 * MediaBox — persis seperti pembaca PDF sungguhan.
 */
function buildPdf(pages: string[]): Uint8Array {
  const objects: string[] = [];
  const refs: { page: number; content: number }[] = [];

  let next = 3;
  for (let index = 0; index < pages.length; index += 1) {
    refs.push({ page: next, content: next + 1 });
    next += 2;
  }
  const fontRef = next;

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${refs
    .map((r) => `${r.page} 0 R`)
    .join(" ")}] /Count ${pages.length} >>`;

  refs.forEach((ref, index) => {
    objects[ref.page] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Contents ${ref.content} 0 R /Resources << /Font << /F1 ${fontRef} 0 R >> >> >>`;

    const lines = (pages[index] ?? "").match(/.{1,58}(?:\s|$)/g) ?? [""];
    const drawn = lines
      .map(
        (line, position) => `${position === 0 ? "" : "0 -16 Td "}(${line}) Tj`,
      )
      .join(" ");
    const stream = `BT /F1 12 Tf 72 720 Td ${drawn} ET`;

    objects[ref.content] =
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  objects[fontRef] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = body.length;
    body += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xref = body.length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

  return new TextEncoder().encode(body);
}

/** DOCX minimal: satu entri ZIP berisi word/document.xml. */
function buildDocx(documentXml: string): Uint8Array {
  const name = new TextEncoder().encode("word/document.xml");
  const raw = new TextEncoder().encode(documentXml);
  const compressed = new Uint8Array(deflateRawSync(raw));

  const local = new Uint8Array(30 + name.length + compressed.length);
  const localView = new DataView(local.buffer);
  localView.setUint32(0, 0x04034b50, true);
  localView.setUint16(4, 20, true);
  localView.setUint16(8, 8, true);
  localView.setUint32(18, compressed.length, true);
  localView.setUint32(22, raw.length, true);
  localView.setUint16(26, name.length, true);
  local.set(name, 30);
  local.set(compressed, 30 + name.length);

  const central = new Uint8Array(46 + name.length);
  const centralView = new DataView(central.buffer);
  centralView.setUint32(0, 0x02014b50, true);
  centralView.setUint16(10, 8, true);
  centralView.setUint32(20, compressed.length, true);
  centralView.setUint32(24, raw.length, true);
  centralView.setUint16(28, name.length, true);
  centralView.setUint32(42, 0, true);
  central.set(name, 46);

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, 1, true);
  eocdView.setUint16(10, 1, true);
  eocdView.setUint32(12, central.length, true);
  eocdView.setUint32(16, local.length, true);

  const out = new Uint8Array(local.length + central.length + eocd.length);
  out.set(local, 0);
  out.set(central, local.length);
  out.set(eocd, local.length + central.length);
  return out;
}

function paragraph(text: string): string {
  return `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
}

const LONG = "Bab pendahuluan membahas kedudukan warga negara. ";

describe("normalisasi", () => {
  it("menyeragamkan akhiran baris dan membuang spasi ekor", () => {
    expect(normalizeExtractedText("satu  \r\ndua\t\r\n")).toBe("satu\ndua");
  });

  it("meredam baris kosong berlebih tanpa menghapus batas paragraf", () => {
    expect(normalizeExtractedText("satu\n\n\n\n\ndua")).toBe("satu\n\ndua");
  });

  it("membuang karakter kendali", () => {
    expect(normalizeExtractedText("satu\u0000\u0007dua")).toBe("satudua");
  });

  // Isi tidak boleh berubah maknanya; normalisasi hanya merapikan bentuk.
  it("tidak mengubah kata maupun urutannya", () => {
    const source = "Pertemuan 1: hak warga negara\nPertemuan 2: kewajiban";
    expect(normalizeExtractedText(source)).toBe(source);
  });

  it("menghitung hanya karakter yang membawa isi", () => {
    expect(meaningfulLength("... --- ...")).toBe(0);
    expect(meaningfulLength("Bab 1")).toBe(4);
  });

  it("memotong secara deterministik dan menandainya", () => {
    const capped = capExtractedText("a".repeat(MAX_EXTRACTED_CHARS + 500));
    expect(capped.truncated).toBe(true);
    expect(capped.text).toHaveLength(MAX_EXTRACTED_CHARS);
    expect(capExtractedText("pendek").truncated).toBe(false);
  });
});

describe("ekstraksi PDF", () => {
  it("membaca teks dari PDF berbasis teks", async () => {
    const result = await extractDocumentText(
      "application/pdf",
      buildPdf([LONG.repeat(2)]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("kedudukan warga negara");
    expect(result.pages).toBe(1);
  });

  it("mempertahankan urutan halaman", async () => {
    // Penanda diletakkan di awal halaman supaya tidak terbelah pembungkusan
    // baris — yang terbelah akan terbaca apa adanya, dan itu memang benar.
    const result = await extractDocumentText(
      "application/pdf",
      buildPdf([`Halaman satu. ${LONG}`, `Halaman dua. ${LONG}`]),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.pages).toBe(2);
    expect(result.text.indexOf("Halaman satu")).toBeLessThan(
      result.text.indexOf("Halaman dua"),
    );
  });

  // Parser yang tidak melempar bukan bukti dokumen berisi. PDF hasil pindai
  // menghasilkan teks kosong dan tidak boleh lolos sebagai sukses.
  it("menolak PDF tanpa lapisan teks", async () => {
    const result = await extractDocumentText("application/pdf", buildPdf([""]));

    expect(result).toEqual({ ok: false, failure: "no_text_layer" });
  });

  it("menolak PDF yang isinya terlalu sedikit", async () => {
    const result = await extractDocumentText(
      "application/pdf",
      buildPdf(["1"]),
    );

    expect(result).toEqual({ ok: false, failure: "no_text_layer" });
  });

  it("menolak berkas rusak tanpa melempar", async () => {
    const result = await extractDocumentText(
      "application/pdf",
      new TextEncoder().encode("%PDF-1.4 tetapi tidak sah"),
    );

    expect(result).toEqual({ ok: false, failure: "unreadable_file" });
  });
});

describe("ekstraksi DOCX", () => {
  it("membaca paragraf menurut urutannya", async () => {
    const docx = buildDocx(
      `<w:document><w:body>${paragraph(`${LONG}Paragraf satu`)}${paragraph(
        "Paragraf dua",
      )}</w:body></w:document>`,
    );

    const result = await extractDocumentText(DOCX_MIME, docx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text.indexOf("Paragraf satu")).toBeLessThan(
      result.text.indexOf("Paragraf dua"),
    );
  });

  it("mengambil teks tabel dengan batas sel dan baris", () => {
    const xml =
      "<w:document><w:body><w:tbl><w:tr>" +
      `<w:tc>${paragraph("Pertemuan")}</w:tc>` +
      `<w:tc>${paragraph("Topik")}</w:tc>` +
      "</w:tr><w:tr>" +
      `<w:tc>${paragraph("1")}</w:tc>` +
      `<w:tc>${paragraph("Hak warga negara")}</w:tc>` +
      "</w:tr></w:tbl></w:body></w:document>";

    const text = normalizeExtractedText(extractDocumentXmlText(xml));

    expect(text).toContain("Pertemuan");
    expect(text).toContain("Hak warga negara");
    expect(text.indexOf("Pertemuan")).toBeLessThan(
      text.indexOf("Hak warga negara"),
    );
  });

  it("menerjemahkan entitas XML baku", () => {
    const text = extractDocumentXmlText(
      `<w:document><w:body>${paragraph("Hak &amp; kewajiban")}</w:body></w:document>`,
    );

    expect(text).toContain("Hak & kewajiban");
  });

  // Entitas buatan dari DTD tidak pernah diperluas, sehingga XXE tidak berpijak.
  it("tidak memperluas entitas buatan", () => {
    const text = extractDocumentXmlText(
      `<w:document><w:body>${paragraph("&xxe;")}</w:body></w:document>`,
    );

    expect(text).toContain("&xxe;");
  });

  it("menghormati baris dan tab eksplisit", () => {
    const text = extractDocumentXmlText(
      "<w:document><w:body><w:p><w:r><w:t>satu</w:t>" +
        "<w:tab/><w:t>dua</w:t><w:br/><w:t>tiga</w:t></w:r></w:p></w:body></w:document>",
    );

    expect(text).toContain("satu\tdua");
    expect(text).toContain("dua\ntiga");
  });

  it("menolak DOCX kosong", async () => {
    const result = await extractDocumentText(
      DOCX_MIME,
      buildDocx("<w:document><w:body></w:body></w:document>"),
    );

    expect(result).toEqual({ ok: false, failure: "empty_document" });
  });

  it("menolak arsip yang bukan DOCX", async () => {
    const result = await extractDocumentText(
      DOCX_MIME,
      new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]),
    );

    expect(result).toEqual({ ok: false, failure: "unreadable_file" });
  });
});

describe("teks biasa dan tipe tak didukung", () => {
  it("membaca text/markdown", async () => {
    const result = await extractDocumentText(
      "text/markdown",
      new TextEncoder().encode(`# RPS\n\n${LONG}`),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.text).toContain("# RPS");
    expect(result.pages).toBeNull();
  });

  it("menolak byte yang bukan UTF-8 pada berkas teks", async () => {
    const result = await extractDocumentText(
      "text/plain",
      new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]),
    );

    expect(result).toEqual({ ok: false, failure: "unreadable_file" });
  });

  it("menolak tipe di luar yang didukung", async () => {
    const result = await extractDocumentText(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    );

    expect(result).toEqual({ ok: false, failure: "unsupported_type" });
  });
});
