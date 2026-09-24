/** @format */

import { describe, expect, it } from "vitest";

import { hasTraceableUnitExcerpts, unitPlanSchema } from "@/lib/ai/unit-plan";
import { STAGE_ORDER } from "@/lib/constants/stages";

function plan() {
  return {
    kind: "six_unit_plan" as const,
    units: Array.from({ length: 6 }, (_, index) => ({
      title: `Unit kewarganegaraan ${index + 1}`,
      objective: "Menilai kekuatan bukti dalam partisipasi warga.",
      sourceExcerpt:
        "Partisipasi warga memerlukan informasi yang dapat diverifikasi.",
      case: {
        title: "Konsultasi kebijakan publik",
        context: "Latihan hipotetis untuk diskusi kelas.",
        body: "Warga membahas sebuah kebijakan. Mereka perlu menimbang kualitas informasi sebelum menyimpulkan apakah alasan kebijakan tersebut memadai.",
        keyQuestion: "Apa bukti yang diperlukan untuk menilai kebijakan?",
      },
      activities: STAGE_ORDER.map((stageKey) => ({
        stageKey,
        title: `Latihan ${stageKey}`,
        prompt: "Tulis penalaran Anda sendiri dan periksa bukti pendukungnya.",
        responseSchema: "free_text" as const,
      })),
    })),
    warnings: [],
  };
}

describe("draf enam unit AI", () => {
  it("menerima tepat enam unit dengan 36 aktivitas terurut", () => {
    const result = unitPlanSchema.parse(plan());
    expect(result.units).toHaveLength(6);
    expect(result.units.flatMap((unit) => unit.activities)).toHaveLength(36);
  });

  it.each([0, 1, 5, 7])("menolak jumlah unit %i", (count) => {
    const draft = plan();
    draft.units = Array.from({ length: count }, (_, index) => ({
      ...draft.units[0]!,
      title: `Unit ${index}`,
    }));
    expect(unitPlanSchema.safeParse(draft).success).toBe(false);
  });

  it("menolak tahap yang diganti atau diduplikasi", () => {
    const draft = plan();
    draft.units[0]!.activities[0]!.stageKey = "analysis";
    expect(unitPlanSchema.safeParse(draft).success).toBe(false);
  });

  it("menolak judul unit ganda", () => {
    const draft = plan();
    draft.units[1]!.title = draft.units[0]!.title;
    expect(unitPlanSchema.safeParse(draft).success).toBe(false);
  });

  it("menolak status penerbitan yang disisipkan AI", () => {
    const draft = plan();
    expect(
      unitPlanSchema.safeParse({ ...draft, status: "published" }).success,
    ).toBe(false);
    expect(
      unitPlanSchema.safeParse({
        ...draft,
        units: draft.units.map((unit) => ({ ...unit, status: "published" })),
      }).success,
    ).toBe(false);
  });

  it("memverifikasi setiap kutipan terhadap isi sumber, bukan nama dokumen", () => {
    const draft = unitPlanSchema.parse(plan());
    expect(
      hasTraceableUnitExcerpts(
        draft,
        "Partisipasi warga\nmemerlukan informasi yang dapat diverifikasi.",
      ),
    ).toBe(true);
    draft.units[3]!.sourceExcerpt =
      "Angka yang sama sekali tidak ada di sumber asli.";
    expect(
      hasTraceableUnitExcerpts(
        draft,
        "Partisipasi warga memerlukan informasi yang dapat diverifikasi.",
      ),
    ).toBe(false);
  });
});
