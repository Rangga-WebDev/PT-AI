/** @format */

// @vitest-environment node

import { describe, expect, it } from "vitest";

import { createArrayItemExtractor } from "@/lib/ai/json-stream";

const DOCUMENT = {
  criteria: [
    {
      criterionId: "a",
      rationale:
        'Kutipan berisi kurung {seperti ini} dan [ini], serta \\"kutip\\".',
      evidence: [{ artifactId: "x", excerpt: "}]{[" }],
    },
    { criterionId: "b", rationale: "Kedua", evidence: [] },
  ],
  suggestedFeedback: "criteria: [{ bukan larik }]",
  limitations: [{ criterionId: "palsu" }],
};

function feed(text: string, size: number): unknown[] {
  const extractor = createArrayItemExtractor("criteria");
  const items: unknown[] = [];
  for (let index = 0; index < text.length; index += size) {
    for (const raw of extractor.push(text.slice(index, index + size))) {
      items.push(JSON.parse(raw));
    }
  }
  return items;
}

describe("createArrayItemExtractor", () => {
  it("mengembalikan setiap elemen utuh, berapa pun ukuran potongannya", () => {
    const text = JSON.stringify(DOCUMENT, null, 2);
    for (const size of [1, 2, 3, 7, 64, text.length]) {
      expect(feed(text, size)).toEqual(DOCUMENT.criteria);
    }
  });

  it("mengirim elemen begitu kurung penutupnya tiba, sebelum dokumen selesai", () => {
    const extractor = createArrayItemExtractor("criteria");
    const text = JSON.stringify(DOCUMENT);
    const firstEnd = text.indexOf('"b"');

    const early = extractor.push(text.slice(0, firstEnd));
    expect(early.map((raw) => JSON.parse(raw))).toEqual([DOCUMENT.criteria[0]]);

    const rest = extractor.push(text.slice(firstEnd));
    expect(rest.map((raw) => JSON.parse(raw))).toEqual([DOCUMENT.criteria[1]]);
  });

  it("mengabaikan larik dengan kunci lain dan teks yang mirip kunci", () => {
    const text = JSON.stringify({
      limitations: [{ criterionId: "palsu" }],
      note: "criteria",
      criteria: [{ criterionId: "asli" }],
    });
    expect(feed(text, 5)).toEqual([{ criterionId: "asli" }]);
  });

  it("tidak mengembalikan apa pun untuk teks yang bukan JSON", () => {
    expect(feed("bukan json", 3)).toEqual([]);
  });
});
