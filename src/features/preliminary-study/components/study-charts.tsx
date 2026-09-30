/** @format */

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DIMENSION_LABEL } from "@/lib/constants/stages";
import {
  categoryLevel,
  CT_DIMENSIONS,
  formatDecimal,
  itemRangeLabel,
  itemsByDimension,
  scoreHistogram,
  skillExtremes,
  type PreliminaryCategory,
  type PreliminaryItem,
  type PreliminaryScore,
  type PreliminarySkill,
} from "@/lib/research/preliminary-study";
import { cn } from "@/lib/utils";

import { CATEGORY_TONE } from "./category-mark";
import { StudySection } from "./study-section";

// Grafik dibuat dengan elemen HTML biasa, tanpa pustaka chart. Bagian visual
// disembunyikan dari pembaca layar; setiap grafik membawa tabel sr-only yang
// memuat angka yang sama.

function percentOf(value: number, max: number): string {
  return `${Math.min(100, Math.max(0, (value / max) * 100))}%`;
}

export function SkillProfile({
  skills,
  items,
  maxItemScore,
}: {
  skills: PreliminarySkill[];
  items: PreliminaryItem[];
  maxItemScore: number;
}) {
  const extremes = skillExtremes(skills);
  const numbers = itemsByDimension(items);
  const ticks = Array.from({ length: maxItemScore + 1 }, (_, value) => value);

  return (
    <StudySection
      id="preliminary-skills"
      title="Enam kecakapan"
      description={`Rata-rata skor per soal pada skala 0–${maxItemScore}.`}
    >
      {extremes ? (
        <p className="text-sm text-muted-foreground">
          Terendah pada{" "}
          <span className="font-medium text-foreground">
            {DIMENSION_LABEL[extremes.lowest.dimension]}
          </span>{" "}
          ({formatDecimal(extremes.lowest.average)}), tertinggi pada{" "}
          <span className="font-medium text-foreground">
            {DIMENSION_LABEL[extremes.highest.dimension]}
          </span>{" "}
          ({formatDecimal(extremes.highest.average)}).
        </p>
      ) : null}

      <ul data-slot="skill-profile" className="flex flex-col gap-4">
        {skills.map((skill) => (
          <li
            key={skill.dimension}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1.5"
          >
            <span className="text-sm text-foreground">
              {DIMENSION_LABEL[skill.dimension]}
              <span className="ml-2 font-mono text-xs text-subtle">
                {itemRangeLabel(numbers.get(skill.dimension) ?? [])}
              </span>
            </span>
            <span className="font-mono text-sm text-foreground tabular-nums">
              {formatDecimal(skill.average)}
            </span>
            <span
              aria-hidden="true"
              className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-active"
            >
              <span
                className="block h-full rounded-full bg-chart-5"
                style={{ width: percentOf(skill.average, maxItemScore) }}
              />
            </span>
          </li>
        ))}
      </ul>

      <div
        aria-hidden="true"
        className="flex justify-between font-mono text-xs text-subtle"
      >
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
    </StudySection>
  );
}

const UNIT_PX = 12;
const SCORE_TICKS = [0, 20, 40, 60, 80, 100];

export function ScoreDistribution({
  scores,
  categories,
}: {
  scores: PreliminaryScore[];
  categories: PreliminaryCategory[];
}) {
  const bins = scoreHistogram(scores);
  const tallest = Math.max(1, ...bins.map((bin) => bin.entries.length));
  const boundaries = categories.slice(1).map((category) => category.min);

  return (
    <StudySection
      id="preliminary-distribution"
      title="Sebaran nilai"
      description="Satu kotak mewakili satu mahasiswa, dikelompokkan per rentang 5 poin. Garis putus-putus menandai batas kategori."
    >
      <div
        aria-hidden="true"
        data-slot="score-distribution"
        className="flex flex-col gap-2"
      >
        <div className="relative h-4 font-mono text-xs text-subtle">
          {categories.map((category) => (
            <span
              key={category.label}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${(category.min + category.max) / 2}%` }}
            >
              {category.label}
            </span>
          ))}
        </div>
        <div
          className="relative flex items-end border-b border-border"
          style={{ height: tallest * UNIT_PX + 4 }}
        >
          {boundaries.map((boundary) => (
            <span
              key={boundary}
              className="absolute inset-y-0 border-l border-dashed border-border"
              style={{ left: `${boundary}%` }}
            />
          ))}
          {bins.map((bin) => (
            <div
              key={bin.from}
              className="flex h-full flex-1 flex-col-reverse items-center gap-0.5 pb-0.5"
            >
              {bin.entries.map((entry, index) => (
                <span
                  key={index}
                  className={cn(
                    "size-2.5 rounded-[2px]",
                    CATEGORY_TONE[categoryLevel(categories, entry.category)],
                  )}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="relative h-4 font-mono text-xs text-subtle">
          {SCORE_TICKS.map((tick) => (
            <span
              key={tick}
              className={cn(
                "absolute",
                tick === 100
                  ? "-translate-x-full"
                  : tick > 0 && "-translate-x-1/2",
              )}
              style={{ left: `${tick}%` }}
            >
              {tick}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Jumlah mahasiswa per rentang nilai</caption>
        <thead>
          <tr>
            <th scope="col">Rentang nilai</th>
            <th scope="col">Mahasiswa</th>
          </tr>
        </thead>
        <tbody>
          {bins
            .filter((bin) => bin.entries.length > 0)
            .map((bin) => (
              <tr key={bin.from}>
                <td>
                  {bin.from}–{bin.to}
                </td>
                <td>{bin.entries.length}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </StudySection>
  );
}

function groupItems(items: PreliminaryItem[]) {
  return CT_DIMENSIONS.map((dimension) => ({
    dimension,
    items: items
      .filter((item) => item.dimension === dimension)
      .sort((left, right) => left.itemNumber - right.itemNumber),
  })).filter((group) => group.items.length > 0);
}

export function ItemAnalysis({
  items,
  maxItemScore,
}: {
  items: PreliminaryItem[];
  maxItemScore: number;
}) {
  const groups = groupItems(items);
  const levels = Array.from({ length: maxItemScore + 1 }, (_, value) => value);

  return (
    <StudySection
      id="preliminary-items"
      title="Analisis butir"
      description={`Rata-rata skor setiap soal (0–${maxItemScore}), dikelompokkan menurut kecakapan pada kisi-kisi.`}
    >
      {/* Layar lebar: kolom per soal, arahkan kursor untuk rincian. */}
      <div
        aria-hidden="true"
        data-slot="item-analysis"
        className="hidden md:block"
      >
        <div className="mt-6 flex">
          <div className="relative h-56 w-8 shrink-0 font-mono text-xs text-subtle">
            {levels.map((level) => (
              <span
                key={level}
                className="absolute right-3 translate-y-1/2"
                style={{ bottom: percentOf(level, maxItemScore) }}
              >
                {level}
              </span>
            ))}
          </div>
          <div className="relative h-56 flex-1 border-b border-border">
            {levels.slice(1).map((level) => (
              <span
                key={level}
                className="absolute inset-x-0 border-t border-border/50"
                style={{ bottom: percentOf(level, maxItemScore) }}
              />
            ))}
            <div className="absolute inset-0 flex gap-6 px-2">
              {groups.map((group) => (
                <div
                  key={group.dimension}
                  className="flex flex-1 items-end justify-center gap-2"
                >
                  {group.items.map((item) => (
                    <Tooltip key={item.itemNumber}>
                      <TooltipTrigger
                        render={
                          <div
                            data-slot="item-bar"
                            className="relative flex h-full w-full max-w-9 items-end"
                          />
                        }
                      >
                        <span
                          className="relative w-full rounded-t-[3px] bg-chart-5 transition-opacity hover:opacity-80"
                          style={{
                            height: percentOf(item.average, maxItemScore),
                          }}
                        >
                          <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 font-mono text-xs text-muted-foreground tabular-nums">
                            {formatDecimal(item.average)}
                          </span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span className="flex flex-col gap-0.5">
                          <span className="font-semibold">
                            Soal {item.itemNumber}
                          </span>
                          <span>
                            Kecakapan: {DIMENSION_LABEL[item.dimension]}
                          </span>
                          <span>
                            Rata-rata: {formatDecimal(item.average)} /{" "}
                            {maxItemScore}
                          </span>
                        </span>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="ml-8 flex gap-6 px-2 pt-2">
          {groups.map((group) => (
            <div
              key={group.dimension}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="flex w-full justify-center gap-2 font-mono text-xs text-subtle">
                {group.items.map((item) => (
                  <span
                    key={item.itemNumber}
                    className="w-full max-w-9 text-center"
                  >
                    {item.itemNumber}
                  </span>
                ))}
              </div>
              <span className="text-center text-xs text-muted-foreground">
                {DIMENSION_LABEL[group.dimension]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Layar sempit: tidak ada kursor, jadi angka ditulis langsung. */}
      <div aria-hidden="true" className="flex flex-col gap-5 md:hidden">
        {groups.map((group) => (
          <div key={group.dimension} className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {DIMENSION_LABEL[group.dimension]}
            </p>
            {group.items.map((item) => (
              <div
                key={item.itemNumber}
                className="grid grid-cols-[4rem_minmax(0,1fr)_2.75rem] items-center gap-3"
              >
                <span className="font-mono text-xs text-subtle">
                  Soal {item.itemNumber}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-surface-active">
                  <span
                    className="block h-full rounded-full bg-chart-5"
                    style={{ width: percentOf(item.average, maxItemScore) }}
                  />
                </span>
                <span className="text-right font-mono text-sm text-foreground tabular-nums">
                  {formatDecimal(item.average)}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <table className="sr-only">
        <caption>Rata-rata skor setiap soal</caption>
        <thead>
          <tr>
            <th scope="col">Soal</th>
            <th scope="col">Kecakapan</th>
            <th scope="col">Rata-rata (0–{maxItemScore})</th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((group) =>
            group.items.map((item) => (
              <tr key={item.itemNumber}>
                <td>Soal {item.itemNumber}</td>
                <td>{DIMENSION_LABEL[item.dimension]}</td>
                <td>{formatDecimal(item.average)}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </StudySection>
  );
}
