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

const MIN_SNAPPED_EXCERPT = 40;

/** Substring bersama terpanjang; posisi dihitung pada `source`. */
function longestCommonSubstring(excerpt: string, source: string) {
  let previous = new Uint16Array(source.length + 1);
  let current = new Uint16Array(source.length + 1);
  let length = 0;
  let end = 0;
  for (let i = 1; i <= excerpt.length; i += 1) {
    const char = excerpt.charCodeAt(i - 1);
    for (let j = 1; j <= source.length; j += 1) {
      if (char === source.charCodeAt(j - 1)) {
        const run = previous[j - 1]! + 1;
        current[j] = run;
        if (run > length) {
          length = run;
          end = j;
        }
      } else current[j] = 0;
    }
    [previous, current] = [current, previous];
  }
  return { start: end - length, end };
}

/** Bagian sumber terpanjang yang dikutip model, dirapikan ke batas kata atau kalimat. */
function snapToSource(excerpt: string, source: string): string | null {
  let { start, end } = longestCommonSubstring(excerpt, source);
  // Kata yang hanya sebagian sama dibuang agar kutipan tidak memuat kata yang tidak dikutip model.
  if (start > 0 && source[start - 1] !== " ") {
    const space = source.indexOf(" ", start);
    start = space === -1 || space >= end ? end : space + 1;
  }
  if (end < source.length && source[end] !== " ") {
    const space = source.lastIndexOf(" ", end - 1);
    end = space < start ? start : space;
  }
  let fragment = source
    .slice(start, end)
    .trim()
    .replace(/[\s,;:(–-]+$/u, "");
  const lastSentenceEnd = Math.max(
    ...[". ", "! ", "? "].map((mark) => fragment.lastIndexOf(mark)),
  );
  // Sisa kalimat yang terpotong pendek dibuang; sisa panjang tetap relevan.
  if (
    lastSentenceEnd + 1 >= MIN_SNAPPED_EXCERPT &&
    fragment.length - lastSentenceEnd - 1 < 25 &&
    !/[.!?]$/.test(fragment)
  )
    fragment = fragment.slice(0, lastSentenceEnd + 1);
  return fragment.length >= MIN_SNAPPED_EXCERPT ? fragment : null;
}

/**
 * Model kadang menyambung kalimat tak berurutan atau mengubah satu-dua kata saat
 * mengutip. Kutipan seperti itu dipangkas ke bagian terpanjang yang persis ada
 * di sumber; kutipan tanpa bagian cocok yang memadai dibiarkan agar tetap ditolak.
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
    const snapped = snapToSource(excerpt, source);
    if (!snapped) return unit;
    trimmed.push(index + 1);
    return { ...unit, sourceExcerpt: snapped };
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
