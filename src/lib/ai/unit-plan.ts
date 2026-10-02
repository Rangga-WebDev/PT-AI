/** @format */

import { z } from "zod";

import { STAGE_ORDER } from "@/lib/constants/stages";

export const AI_UNIT_COUNT = 6;
export const UNIT_PLAN_KIND = "six_unit_plan";

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

const unitActivitySchema = z.strictObject({
  stageKey: z.enum(STAGE_ORDER),
  title: text(3, 200),
  prompt: text(20, 2000),
  responseSchema: z.enum(["free_text", "cer"]),
});

export const plannedUnitSchema = z.strictObject({
  title: text(3, 200),
  objective: text(10, 1000),
  sourceExcerpt: text(20, 800),
  case: z.strictObject({
    title: text(3, 200),
    context: text(10, 1000),
    body: text(50, 4000),
    keyQuestion: text(10, 1000),
  }),
  activities: z
    .array(unitActivitySchema)
    .length(STAGE_ORDER.length)
    .refine(
      (activities) =>
        activities.every(
          (activity, index) => activity.stageKey === STAGE_ORDER[index],
        ),
      "Aktivitas harus mengikuti enam tahap PT-AI secara berurutan.",
    ),
});

export const unitPlanSchema = z.strictObject({
  kind: z.literal(UNIT_PLAN_KIND),
  units: z
    .array(plannedUnitSchema)
    .length(AI_UNIT_COUNT)
    .refine(
      (units) =>
        new Set(units.map((unit) => unit.title.toLocaleLowerCase("id-ID")))
          .size === AI_UNIT_COUNT,
      "Judul keenam unit harus berbeda.",
    ),
  warnings: z.array(text(3, 500)).max(10),
});

export type UnitPlan = z.infer<typeof unitPlanSchema>;

export const unitPlanMetadataSchema = z.object({
  kind: z.literal(UNIT_PLAN_KIND),
  moduleId: z.uuid(),
  moduleTitle: z.string(),
  resourceTitle: z.string(),
  sourceTextHash: z.string().regex(/^[a-f0-9]{64}$/),
  truncated: z.boolean(),
});

export interface UnitPlanDraftView {
  id: string;
  status: "draft" | "approved" | "discarded";
  updatedAt: string;
  createdAt: string;
  model: string;
  promptVersion: number;
  meta: z.infer<typeof unitPlanMetadataSchema>;
  plan: UnitPlan;
}

export const UNIT_PLAN_ERROR: Record<string, string> = {
  forbidden: "Anda tidak berwenang atas draf atau kelas ini.",
  invalid_unit_plan:
    "Draf harus berisi enam unit lengkap dengan urutan tahap yang sesuai.",
  not_reviewable: "Draf sudah disetujui atau dibuang dan tidak dapat diubah.",
  stale_draft:
    "Draf berubah sejak dibuka. Muat ulang halaman sebelum melanjutkan.",
  module_not_found: "Pertemuan sudah tidak tersedia pada kelas ini.",
  source_changed:
    "Materi sumber berubah atau tidak lagi tersedia. Susun draf baru dari materi terbaru.",
  untraceable_output: "Kutipan harus tetap sesuai dengan materi sumber.",
};

// Sama dengan normalisasi pada apply_ai_unit_plan (migrasi 0037).
const normalizeQuote = (value: string) =>
  value.normalize("NFC").replace(/\s+/g, " ").trim();

export function hasTraceableUnitExcerpts(
  plan: UnitPlan,
  sourceText: string,
): boolean {
  const source = normalizeQuote(sourceText);
  return plan.units.every((unit) =>
    source.includes(normalizeQuote(unit.sourceExcerpt)),
  );
}

/**
 * Model kadang menyambung kalimat sumber yang tidak berurutan. Kutipan seperti
 * itu dipangkas ke rangkaian kalimat bersambung terpanjang yang persis ada di
 * sumber; kutipan tanpa bagian yang cocok dibiarkan agar tetap ditolak.
 */
export function trimUntraceableExcerpts(
  plan: UnitPlan,
  sourceText: string,
): UnitPlan {
  const source = normalizeQuote(sourceText);
  const trimmed: number[] = [];
  const units = plan.units.map((unit, index) => {
    const excerpt = normalizeQuote(unit.sourceExcerpt);
    if (source.includes(excerpt)) return unit;

    const sentences = excerpt
      .split(/(?<=[.!?])\s+|\s*(?:\.{3}|…)\s*/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);
    let best = "";
    for (let start = 0; start < sentences.length; start += 1) {
      for (let end = start + 1; end <= sentences.length; end += 1) {
        const candidate = sentences.slice(start, end).join(" ");
        if (candidate.length > 800 || !source.includes(candidate)) break;
        if (candidate.length > best.length) best = candidate;
      }
    }
    if (best.length < 20) return unit;
    trimmed.push(index + 1);
    return { ...unit, sourceExcerpt: best };
  });

  if (trimmed.length === 0) return plan;
  const note = `Kutipan sumber unit ${trimmed.join(", ")} dipangkas ke bagian yang persis sama dengan dokumen.`;
  return {
    ...plan,
    units,
    warnings:
      plan.warnings.length < 10 ? [...plan.warnings, note] : plan.warnings,
  };
}

export const unitPlanProviderSchema = {
  type: "OBJECT",
  properties: {
    kind: { type: "STRING", enum: [UNIT_PLAN_KIND] },
    units: {
      type: "ARRAY",
      minItems: AI_UNIT_COUNT,
      maxItems: AI_UNIT_COUNT,
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          objective: { type: "STRING" },
          sourceExcerpt: { type: "STRING" },
          case: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              context: { type: "STRING" },
              body: { type: "STRING" },
              keyQuestion: { type: "STRING" },
            },
            required: ["title", "context", "body", "keyQuestion"],
          },
          activities: {
            // Gemini menolak (400) minItems/maxItems pada dua array bersarang; Zod menegakkan enam tahap.
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                stageKey: { type: "STRING", enum: [...STAGE_ORDER] },
                title: { type: "STRING" },
                prompt: { type: "STRING" },
                responseSchema: { type: "STRING", enum: ["free_text", "cer"] },
              },
              required: ["stageKey", "title", "prompt", "responseSchema"],
            },
          },
        },
        required: ["title", "objective", "sourceExcerpt", "case", "activities"],
      },
    },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["kind", "units", "warnings"],
} as const;
