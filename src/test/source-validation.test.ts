/** @format */

import { describe, expect, it } from "vitest";

import {
  CRITERION_KEYS,
  VERIFICATION_CRITERIA,
} from "@/lib/constants/verification";
import {
  claimLinkSchema,
  sourceSchema,
  verificationSchema,
} from "@/lib/validation/sources";

const SOURCE_ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const ACTIVITY_ID = "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d";
const CLAIM_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

const fullChecklist = Object.fromEntries(
  CRITERION_KEYS.map((key) => [key, true]),
);

describe("Kriteria verifikasi (LOCK-PED-007)", () => {
  it("berjumlah enam dan memakai kunci yang sama dengan constraint database", () => {
    expect(VERIFICATION_CRITERIA).toHaveLength(6);
    expect(CRITERION_KEYS).toEqual([
      "credibility",
      "relevance",
      "sufficiency",
      "traceability",
      "consistency",
      "bias",
    ]);
  });
});

describe("Skema verifikasi sumber", () => {
  it("menolak checklist yang tidak memuat keenam kriteria", () => {
    const result = verificationSchema.safeParse({
      sourceId: SOURCE_ID,
      activityId: ACTIVITY_ID,
      verdict: "credible",
      checklist: { credibility: true, relevance: true },
      note: "Sumber resmi dan dapat ditelusuri.",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Keenam kriteria");
    }
  });

  it("menerima checklist lengkap meskipun sebagian kriteria tidak terpenuhi", () => {
    const result = verificationSchema.safeParse({
      sourceId: SOURCE_ID,
      activityId: ACTIVITY_ID,
      verdict: "questionable",
      checklist: { ...fullChecklist, bias: false },
      note: "Metodologi tidak dijelaskan sehingga potensi bias sulit dinilai.",
    });

    expect(result.success).toBe(true);
  });

  it("menolak catatan alasan yang terlalu pendek", () => {
    const result = verificationSchema.safeParse({
      sourceId: SOURCE_ID,
      activityId: ACTIVITY_ID,
      verdict: "not_usable",
      checklist: fullChecklist,
      note: "buruk",
    });

    expect(result.success).toBe(false);
  });

  it("menolak kesimpulan verifikasi di luar tiga nilai yang sah", () => {
    const result = verificationSchema.safeParse({
      sourceId: SOURCE_ID,
      activityId: ACTIVITY_ID,
      verdict: "bagus",
      checklist: fullChecklist,
      note: "Sumber resmi dan dapat ditelusuri.",
    });

    expect(result.success).toBe(false);
  });
});

describe("Skema tautan klaim dan bukti", () => {
  it("menerima ketiga jenis tautan", () => {
    for (const linkType of ["supports", "refutes", "contextualizes"]) {
      const result = claimLinkSchema.safeParse({
        claimId: CLAIM_ID,
        sourceId: SOURCE_ID,
        linkType,
      });
      expect(result.success).toBe(true);
    }
  });

  it("menolak jenis tautan di luar daftar", () => {
    const result = claimLinkSchema.safeParse({
      claimId: CLAIM_ID,
      sourceId: SOURCE_ID,
      linkType: "mungkin",
    });

    expect(result.success).toBe(false);
  });
});

describe("Skema sumber", () => {
  it("menolak URL yang tidak valid", () => {
    const result = sourceSchema.safeParse({
      title: "Dokumen kebijakan daerah",
      sourceType: "regulation",
      url: "bukan-url",
    });

    expect(result.success).toBe(false);
  });

  it("menerima sumber tanpa URL", () => {
    const result = sourceSchema.safeParse({
      title: "Dokumen kebijakan daerah",
      sourceType: "regulation",
      url: "",
    });

    expect(result.success).toBe(true);
  });
});
