/** @format */

import { z } from "zod";

import type { CtDimension } from "@/lib/constants/stages";

// Kontrak data studi pendahuluan (RPC migrasi 0038) dan pengolahan tampilan
// yang murni. Seluruh angka berasal dari kueri basis data; modul ini hanya
// memvalidasi, memformat, menyaring, mengurutkan, dan mengelompokkan.

export const CT_DIMENSIONS = [
  "interpretation",
  "analysis",
  "evaluation",
  "inference",
  "explanation",
  "self_regulation",
] as const satisfies readonly CtDimension[];

const dimensionSchema = z.enum(CT_DIMENSIONS);

const categoryBandSchema = z.object({
  label: z.string().min(1),
  min: z.number(),
  max: z.number(),
});

export const preliminaryOverviewSchema = z.object({
  dataset: z.object({
    id: z.uuid(),
    title: z.string(),
    itemCount: z.number().int().positive(),
    maxItemScore: z.number().int().positive(),
    respondentCount: z.number().int(),
    sourceFile: z.string(),
    sourceSheet: z.string(),
    importedAt: z.string(),
  }),
  summary: z.object({
    respondents: z.number().int(),
    average: z.number().nullable(),
    lowest: z.number().nullable(),
    highest: z.number().nullable(),
  }),
  categories: z.array(
    categoryBandSchema.extend({
      count: z.number().int(),
      percent: z.number().nullable(),
    }),
  ),
  skills: z.array(
    z.object({ dimension: dimensionSchema, average: z.number() }),
  ),
  items: z.array(
    z.object({
      itemNumber: z.number().int(),
      dimension: dimensionSchema,
      average: z.number(),
    }),
  ),
  scores: z.array(z.object({ score: z.number(), category: z.string() })),
});

export const preliminaryRespondentSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  category: z.string(),
  total: z.number(),
  score: z.number(),
  skills: z.partialRecord(dimensionSchema, z.number()),
});

export const preliminaryRespondentListSchema = z.array(
  preliminaryRespondentSchema,
);

export const preliminaryRespondentDetailSchema = z.object({
  id: z.uuid(),
  datasetId: z.uuid(),
  code: z.string(),
  category: z.string(),
  total: z.number(),
  maxTotal: z.number(),
  maxItemScore: z.number(),
  score: z.number(),
  sourceFile: z.string(),
  sourceSheet: z.string(),
  sourceRow: z.number().int(),
  answers: z.array(
    z.object({
      itemNumber: z.number().int(),
      dimension: dimensionSchema,
      score: z.number().int(),
      answer: z.string(),
    }),
  ),
});

export type PreliminaryOverview = z.infer<typeof preliminaryOverviewSchema>;
export type PreliminaryCategory = PreliminaryOverview["categories"][number];
export type PreliminarySkill = PreliminaryOverview["skills"][number];
export type PreliminaryItem = PreliminaryOverview["items"][number];
export type PreliminaryScore = PreliminaryOverview["scores"][number];
export type PreliminaryRespondent = z.infer<typeof preliminaryRespondentSchema>;
export type PreliminaryRespondentDetail = z.infer<
  typeof preliminaryRespondentDetailSchema
>;
export type PreliminaryAnswer = PreliminaryRespondentDetail["answers"][number];

// === Format =================================================================

const twoDecimals = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const oneDecimal = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const upToTwo = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });
const upToOne = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const importedDate = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "Asia/Makassar",
});

/** Nilai 0–100 dan rata-rata 0–4 memakai dua desimal, seperti berkas sumber. */
export function formatDecimal(value: number | null): string {
  return value === null ? "–" : twoDecimals.format(value);
}

/** Skor kecakapan satu responden: rata-rata dua soal, jadi selalu x,0 atau x,5. */
export function formatSkillScore(value: number | undefined): string {
  return value === undefined ? "–" : oneDecimal.format(value);
}

export function formatPercent(value: number | null): string {
  return value === null ? "–" : `${upToOne.format(value)}%`;
}

export function formatImportedAt(value: string): string {
  return importedDate.format(new Date(value));
}

/** "< 60", "60–79,99", "≥ 80": batas atas eksklusif kecuali rentang terakhir. */
export function categoryRangeLabel(
  categories: readonly { min: number; max: number }[],
  index: number,
): string {
  const band = categories[index];
  if (!band) return "";
  if (categories.length === 1) {
    return `${upToTwo.format(band.min)}–${upToTwo.format(band.max)}`;
  }
  if (index === 0) return `< ${upToTwo.format(band.max)}`;
  if (index === categories.length - 1) return `≥ ${upToTwo.format(band.min)}`;
  return `${upToTwo.format(band.min)}–${upToTwo.format(band.max - 0.01)}`;
}

/** Posisi ordinal kategori (0 = terendah) pada tiga tingkat intensitas. */
export function categoryLevel(
  categories: readonly { label: string }[],
  label: string,
): 0 | 1 | 2 {
  const index = categories.findIndex((item) => item.label === label);
  if (index <= 0 || categories.length <= 1) return 0;
  if (index >= categories.length - 1) return 2;
  return 1;
}

export function itemRangeLabel(numbers: readonly number[]): string {
  const sorted = [...numbers].sort((left, right) => left - right);
  const first = sorted[0];
  const last = sorted.at(-1);
  if (first === undefined || last === undefined) return "";
  const consecutive = sorted.every((value, index) => value === first + index);
  if (sorted.length === 1) return `Soal ${first}`;
  return consecutive ? `Soal ${first}–${last}` : `Soal ${sorted.join(", ")}`;
}

export function itemsByDimension(
  items: readonly PreliminaryItem[],
): Map<CtDimension, number[]> {
  const grouped = new Map<CtDimension, number[]>();
  for (const item of items) {
    grouped.set(item.dimension, [
      ...(grouped.get(item.dimension) ?? []),
      item.itemNumber,
    ]);
  }
  return grouped;
}

/** Kecakapan terendah dan tertinggi; null bila semuanya sama. */
export function skillExtremes(
  skills: readonly PreliminarySkill[],
): { lowest: PreliminarySkill; highest: PreliminarySkill } | null {
  if (skills.length < 2) return null;
  let lowest = skills[0] as PreliminarySkill;
  let highest = lowest;
  for (const skill of skills) {
    if (skill.average < lowest.average) lowest = skill;
    if (skill.average > highest.average) highest = skill;
  }
  return lowest.average === highest.average ? null : { lowest, highest };
}

// === Sebaran nilai ==========================================================

export interface HistogramBin {
  from: number;
  to: number;
  entries: PreliminaryScore[];
}

/** Rentang 0–100 dibagi rata; nilai 100 masuk rentang terakhir. */
export function scoreHistogram(
  scores: readonly PreliminaryScore[],
  binSize = 5,
): HistogramBin[] {
  const count = Math.ceil(100 / binSize);
  const bins: HistogramBin[] = Array.from({ length: count }, (_, index) => ({
    from: index * binSize,
    to: Math.min(100, (index + 1) * binSize),
    entries: [],
  }));
  for (const entry of scores) {
    const index = Math.min(
      count - 1,
      Math.max(0, Math.floor(entry.score / binSize)),
    );
    bins[index]?.entries.push(entry);
  }
  return bins;
}

// === Tabel responden ========================================================

export type RespondentSortKey = "code" | "category" | "score" | CtDimension;
export type SortDirection = "asc" | "desc";

export function filterRespondents(
  rows: readonly PreliminaryRespondent[],
  { query, category }: { query: string; category: string | null },
): PreliminaryRespondent[] {
  const needle = query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      (category === null || row.category === category) &&
      (needle === "" || row.code.toLowerCase().includes(needle)),
  );
}

const codeCollator = new Intl.Collator("id-ID", { numeric: true });

export function sortRespondents(
  rows: readonly PreliminaryRespondent[],
  key: RespondentSortKey,
  direction: SortDirection,
  categoryOrder: readonly string[],
): PreliminaryRespondent[] {
  const sign = direction === "asc" ? 1 : -1;
  const compare = (
    left: PreliminaryRespondent,
    right: PreliminaryRespondent,
  ): number => {
    switch (key) {
      case "code":
        return codeCollator.compare(left.code, right.code);
      case "score":
        return left.score - right.score;
      case "category":
        return (
          categoryOrder.indexOf(left.category) -
            categoryOrder.indexOf(right.category) || left.score - right.score
        );
      default:
        return (left.skills[key] ?? -1) - (right.skills[key] ?? -1);
    }
  };
  return [...rows].sort(
    (left, right) =>
      compare(left, right) * sign ||
      codeCollator.compare(left.code, right.code),
  );
}

export interface Page<T> {
  rows: T[];
  page: number;
  pageCount: number;
  start: number;
  end: number;
  total: number;
}

export function paginate<T>(
  rows: readonly T[],
  page: number,
  pageSize: number,
): Page<T> {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const offset = (current - 1) * pageSize;
  return {
    rows: rows.slice(offset, offset + pageSize),
    page: current,
    pageCount,
    start: total === 0 ? 0 : offset + 1,
    end: Math.min(total, offset + pageSize),
    total,
  };
}

// === Jawaban responden ======================================================

export interface SkillAnswers {
  dimension: CtDimension;
  average: number;
  answers: PreliminaryAnswer[];
}

export function groupAnswersBySkill(
  answers: readonly PreliminaryAnswer[],
): SkillAnswers[] {
  return CT_DIMENSIONS.flatMap((dimension) => {
    const group = answers
      .filter((answer) => answer.dimension === dimension)
      .sort((left, right) => left.itemNumber - right.itemNumber);
    if (group.length === 0) return [];
    const average =
      group.reduce((sum, answer) => sum + answer.score, 0) / group.length;
    return [{ dimension, average, answers: group }];
  });
}
