/** @format */

import { describe, expect, it } from "vitest";

import {
  CER_ELEMENTS,
  CER_REQUIRED,
  cerElementsSchema,
  composeCerNarrative,
  emptyCerElements,
} from "@/lib/validation/cer";

function filled(overrides: Partial<Record<string, string>> = {}) {
  return {
    ...emptyCerElements(),
    claim: "Konsultasi publik itu belum dapat disebut bermakna.",
    evidence: "Notulen mencatat 24 dari 12.000 warga yang hadir.",
    reasoning: "Kehadiran setipis itu tidak mewakili populasi terdampak.",
    ...overrides,
  };
}

describe("cerElementsSchema", () => {
  it("menerima tiga unsur wajib tanpa unsur opsional", () => {
    expect(cerElementsSchema.safeParse(filled()).success).toBe(true);
  });

  it("menolak klaim yang terlalu pendek", () => {
    const result = cerElementsSchema.safeParse(filled({ claim: "Belum." }));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/Klaim minimal/i);
  });

  it("menolak unsur opsional yang diisi setengah", () => {
    const result = cerElementsSchema.safeParse(filled({ rebuttal: "iya" }));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/Sanggahan minimal/i);
  });

  it("membiarkan unsur opsional kosong sepenuhnya", () => {
    const result = cerElementsSchema.safeParse(
      filled({ counterclaim: "", rebuttal: "", limitation: "" }),
    );

    expect(result.success).toBe(true);
  });
});

describe("composeCerNarrative", () => {
  it("menggabungkan hanya unsur yang terisi, sesuai urutan bakunya", () => {
    const narrative = composeCerNarrative(
      filled({ implication: "Kebijakan itu perlu ditinjau ulang." }),
    );

    expect(narrative.split("\n\n")).toEqual([
      "Klaim: Konsultasi publik itu belum dapat disebut bermakna.",
      "Bukti: Notulen mencatat 24 dari 12.000 warga yang hadir.",
      "Penalaran: Kehadiran setipis itu tidak mewakili populasi terdampak.",
      "Implikasi: Kebijakan itu perlu ditinjau ulang.",
    ]);
  });

  it("tidak pernah menyisakan label tanpa isi", () => {
    expect(composeCerNarrative(filled())).not.toMatch(/Kontraargumen:/);
  });
});

describe("kosakata unsur", () => {
  it("memuat tujuh unsur dan tiga di antaranya wajib", () => {
    expect(CER_ELEMENTS).toHaveLength(7);
    expect(CER_REQUIRED).toEqual(["claim", "evidence", "reasoning"]);
  });

  it("setiap unsur wajib termasuk kosakata resmi", () => {
    for (const key of CER_REQUIRED) {
      expect(CER_ELEMENTS).toContain(key);
    }
  });
});
