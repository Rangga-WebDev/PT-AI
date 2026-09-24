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

export function hasTraceableUnitExcerpts(
  plan: UnitPlan,
  sourceText: string,
): boolean {
  const normalize = (value: string) =>
    value.normalize("NFC").replace(/\s+/g, " ").trim();
  const source = normalize(sourceText);
  return plan.units.every((unit) =>
    source.includes(normalize(unit.sourceExcerpt)),
  );
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
            type: "ARRAY",
            minItems: STAGE_ORDER.length,
            maxItems: STAGE_ORDER.length,
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
