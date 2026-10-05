/** @format */

import { describe, expect, it } from "vitest";

import {
  activityAiSchema,
  activitySchema,
  caseSchema,
  learningUnitSchema,
  rubricCriterionSchema,
  stageUpdateSchema,
} from "@/lib/validation/content";
import {
  AI_FUNCTION_LABEL,
  STAGE_LABEL,
  STAGE_ORDER,
} from "@/lib/constants/stages";

const ID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

describe("Skema pengaturan AI aktivitas", () => {
  it("menerima AI aktif dengan fungsi yang dikenal", () => {
    const result = activityAiSchema.safeParse({
      activityId: ID,
      allowsAi: true,
      allowedAiFunctions: ["guiding_questions", "hint"],
    });
    expect(result.success).toBe(true);
  });

  it("mewajibkan minimal satu fungsi saat AI diaktifkan", () => {
    const result = activityAiSchema.safeParse({
      unitId: ID,
      allowsAi: true,
      allowedAiFunctions: [],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.flatten().fieldErrors["allowedAiFunctions"]?.[0],
      ).toBe("Pilih minimal satu fungsi AI.");
    }
  });

  it("menolak fungsi AI di luar enum", () => {
    const result = activityAiSchema.safeParse({
      activityId: ID,
      allowsAi: true,
      allowedAiFunctions: ["write_answer"],
    });
    expect(result.success).toBe(false);
  });

  it("mewajibkan tepat satu sasaran: aktivitas atau unit", () => {
    const both = activityAiSchema.safeParse({
      activityId: ID,
      unitId: ID,
      allowsAi: false,
      allowedAiFunctions: [],
    });
    const none = activityAiSchema.safeParse({
      allowsAi: false,
      allowedAiFunctions: [],
    });
    expect(both.success).toBe(false);
    expect(none.success).toBe(false);
  });

  it("mencakup seluruh fungsi yang ditampilkan di formulir", () => {
    for (const value of Object.keys(AI_FUNCTION_LABEL)) {
      const result = activityAiSchema.safeParse({
        activityId: ID,
        allowsAi: true,
        allowedAiFunctions: [value],
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("Skema validasi konten", () => {
  it("menolak tujuan pembelajaran yang terlalu pendek", () => {
    const result = learningUnitSchema.safeParse({
      moduleId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      title: "Unit uji",
      objective: "singkat",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors["objective"]?.[0]).toContain(
        "minimal",
      );
    }
  });

  it("mewajibkan seluruh bagian kasus terisi", () => {
    const result = caseSchema.safeParse({
      learningUnitId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      title: "Kasus uji",
      context: "Konteks memadai",
      body: "terlalu pendek",
      keyQuestion: "Pertanyaan kunci yang memadai?",
    });

    expect(result.success).toBe(false);
  });

  it("menetapkan AI nonaktif secara bawaan pada aktivitas", () => {
    const result = activitySchema.safeParse({
      learningStageId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      title: "Aktivitas uji",
      prompt: "Tuliskan rumusan masalah kebijakan tersebut.",
      activityType: "written_response",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allowsAi).toBe(false);
      expect(result.data.allowedAiFunctions).toEqual([]);
    }
  });

  it("menolak jenis aktivitas di luar daftar yang diizinkan", () => {
    const result = activitySchema.safeParse({
      learningStageId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      title: "Aktivitas uji",
      prompt: "Tuliskan rumusan masalah kebijakan tersebut.",
      activityType: "essay_bebas",
    });

    expect(result.success).toBe(false);
  });

  it("tidak menerima perubahan stage_key maupun sequence pada tahap", () => {
    const result = stageUpdateSchema.safeParse({
      stageId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      title: "Interpretasi",
      focus: "Memahami konteks",
      isEnabled: true,
      stageKey: "reflection",
      sequence: 6,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("stageKey");
      expect(result.data).not.toHaveProperty("sequence");
    }
  });

  it("mewajibkan bobot kriteria rubrik lebih besar dari nol", () => {
    const result = rubricCriterionSchema.safeParse({
      rubricId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      code: "K1",
      description: "Membedakan klaim dari fakta.",
      dimension: "analysis",
      weight: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe("Urutan tahap (LOCK-PED-002)", () => {
  it("mempertahankan enam tahap dalam urutan tetap", () => {
    expect(STAGE_ORDER).toEqual([
      "interpretation",
      "analysis",
      "evaluation",
      "inference",
      "explanation",
      "reflection",
    ]);
    expect(Object.keys(STAGE_LABEL)).toHaveLength(6);
  });
});
