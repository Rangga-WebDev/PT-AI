/** @format */

import {
  categoryLevel,
  categoryRangeLabel,
  formatDecimal,
  formatPercent,
  type PreliminaryCategory,
  type PreliminaryOverview,
} from "@/lib/research/preliminary-study";
import { cn } from "@/lib/utils";

import { CategoryMark, CATEGORY_TONE } from "./category-mark";
import { StudySection } from "./study-section";

export function StudySummary({
  summary,
}: {
  summary: PreliminaryOverview["summary"];
}) {
  const items = [
    { label: "Responden", value: String(summary.respondents) },
    { label: "Rata-rata nilai", value: formatDecimal(summary.average) },
    { label: "Nilai terendah", value: formatDecimal(summary.lowest) },
    { label: "Nilai tertinggi", value: formatDecimal(summary.highest) },
  ];

  return (
    <dl
      data-slot="preliminary-summary"
      className="grid grid-cols-2 border-y border-border md:grid-cols-4"
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col gap-1 py-5 md:px-6 md:first:pl-0",
            index % 2 === 0 ? "pr-4" : "border-l border-border pl-4",
            index >= 2 && "border-t border-border md:border-t-0",
            index > 0 && "md:border-l",
          )}
        >
          <dt className="font-mono text-xs tracking-widest text-subtle uppercase">
            {item.label}
          </dt>
          <dd className="font-heading text-h2 font-semibold text-foreground tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

const ROW =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 sm:grid-cols-[13rem_minmax(0,1fr)_7rem]";

interface CategoryDistributionProps {
  categories: PreliminaryCategory[];
  selected?: string | null | undefined;
  /** Hanya admin: memilih kategori menyaring daftar responden. */
  onSelect?: ((label: string) => void) | undefined;
}

export function CategoryDistribution({
  categories,
  selected = null,
  onSelect,
}: CategoryDistributionProps) {
  return (
    <StudySection
      id="preliminary-categories"
      title="Kategori"
      description={
        onSelect
          ? "Pilih kategori untuk menyaring daftar responden. Rentang mengikuti pedoman kategori penelitian."
          : "Rentang nilai mengikuti pedoman kategori penelitian."
      }
    >
      {/* Baris yang dapat dipilih melebar 12px ke kiri-kanan untuk area tekan,
          sementara garis pemisahnya tetap sejajar dengan isi halaman. */}
      <ul
        data-slot="category-distribution"
        className={cn("flex flex-col", onSelect && "-mx-3")}
      >
        {categories.map((category, index) => {
          const level = categoryLevel(categories, category.label);
          const isSelected = selected === category.label;
          const body = (
            <>
              <span className="flex min-w-0 items-baseline gap-2.5">
                <CategoryMark level={level} className="self-center" />
                <span className="text-sm font-medium text-foreground">
                  {category.label}
                </span>
                <span className="font-mono text-xs text-subtle">
                  {categoryRangeLabel(categories, index)}
                </span>
              </span>
              <span
                aria-hidden="true"
                className="col-span-2 row-start-2 h-2 overflow-hidden rounded-full bg-surface-active sm:col-span-1 sm:row-start-auto"
              >
                <span
                  className={cn(
                    "block h-full rounded-full",
                    CATEGORY_TONE[level],
                  )}
                  style={{ width: `${category.percent ?? 0}%` }}
                />
              </span>
              <span className="flex items-baseline justify-end gap-3 font-mono text-sm tabular-nums">
                <span className="text-foreground">
                  {category.count}
                  <span className="sr-only"> mahasiswa</span>
                </span>
                <span className="w-12 text-right text-subtle">
                  {formatPercent(category.percent)}
                </span>
              </span>
            </>
          );

          return (
            <li
              key={category.label}
              className={cn(
                "relative not-first:before:pointer-events-none not-first:before:absolute not-first:before:top-0 not-first:before:border-t not-first:before:border-border",
                onSelect
                  ? "not-first:before:inset-x-3"
                  : "not-first:before:inset-x-0",
              )}
            >
              {onSelect ? (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect(category.label)}
                  className={cn(
                    ROW,
                    "w-full px-3 text-left transition-colors outline-none hover:bg-surface-active/50 focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset",
                    isSelected &&
                      "bg-surface-active shadow-[inset_2px_0_0_0_var(--primary)] hover:bg-surface-active",
                  )}
                >
                  {body}
                </button>
              ) : (
                <div className={ROW}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </StudySection>
  );
}
