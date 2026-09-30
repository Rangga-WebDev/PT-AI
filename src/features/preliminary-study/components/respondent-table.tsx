/** @format */

"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/states/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DIMENSION_LABEL, type CtDimension } from "@/lib/constants/stages";
import {
  categoryLevel,
  CT_DIMENSIONS,
  filterRespondents,
  formatDecimal,
  formatSkillScore,
  paginate,
  sortRespondents,
  type PreliminaryCategory,
  type PreliminaryRespondent,
  type RespondentSortKey,
  type SortDirection,
} from "@/lib/research/preliminary-study";
import { cn } from "@/lib/utils";

import { CategoryMark } from "./category-mark";
import { StudySection } from "./study-section";

const PAGE_SIZES = [10, 25, 50] as const;

const SKILL_ABBREVIATION: Record<CtDimension, string> = {
  interpretation: "Int",
  analysis: "Ana",
  evaluation: "Eva",
  inference: "Inf",
  explanation: "Eks",
  self_regulation: "Reg",
};

// Header tabel tidak terlihat di layar sempit, jadi urutan dipilih di sini.
const COMPACT_SORTS: { value: string; label: string }[] = [
  { value: "code:asc", label: "ID" },
  { value: "score:desc", label: "Nilai tertinggi" },
  { value: "score:asc", label: "Nilai terendah" },
  { value: "category:asc", label: "Kategori" },
];

const SELECT_CLASS =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

interface SortState {
  key: RespondentSortKey;
  direction: SortDirection;
}

function SortHeader({
  label,
  fullLabel,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  label: string;
  fullLabel?: string | undefined;
  sortKey: RespondentSortKey;
  sort: SortState;
  onSort: (key: RespondentSortKey) => void;
  align?: "left" | "right" | undefined;
}) {
  const active = sort.key === sortKey;
  const Icon = !active
    ? ChevronsUpDown
    : sort.direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <th
      scope="col"
      aria-sort={
        active
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
      className={cn("py-2 pr-4 font-medium", align === "right" && "text-right")}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 rounded font-mono text-xs tracking-wide uppercase transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
          active ? "text-foreground" : "text-subtle",
        )}
      >
        {fullLabel ? (
          <>
            <span aria-hidden="true">{label}</span>
            <span className="sr-only">{fullLabel}</span>
          </>
        ) : (
          label
        )}
        <Icon aria-hidden="true" className="size-3" />
      </button>
    </th>
  );
}

interface RespondentTableProps {
  respondents: PreliminaryRespondent[];
  categories: PreliminaryCategory[];
  maxTotal: number;
  category: string | null;
  onCategoryChange: (category: string | null) => void;
  onView: (respondent: PreliminaryRespondent) => void;
}

export function RespondentTable({
  respondents,
  categories,
  maxTotal,
  category,
  onCategoryChange,
  onView,
}: RespondentTableProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>({
    key: "code",
    direction: "asc",
  });
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZES[0]);

  // Halaman kembali ke 1 setiap kali saringan, urutan, atau ukuran berubah,
  // termasuk ketika kategori dipilih dari grafik di atas tabel.
  const signature = [
    category ?? "",
    query,
    sort.key,
    sort.direction,
    pageSize,
  ].join("|");
  const [pageState, setPageState] = useState({ page: 1, signature });
  const requestedPage = pageState.signature === signature ? pageState.page : 1;

  const order = useMemo(
    () => categories.map((item) => item.label),
    [categories],
  );
  const visible = useMemo(
    () =>
      sortRespondents(
        filterRespondents(respondents, { query, category }),
        sort.key,
        sort.direction,
        order,
      ),
    [respondents, query, category, sort, order],
  );
  const current = paginate(visible, requestedPage, pageSize);
  const goTo = (page: number) => setPageState({ page, signature });

  function toggleSort(key: RespondentSortKey) {
    setSort((previous) =>
      previous.key === key
        ? { key, direction: previous.direction === "asc" ? "desc" : "asc" }
        : {
            key,
            direction: key === "code" || key === "category" ? "asc" : "desc",
          },
    );
  }

  const compactSort = `${sort.key}:${sort.direction}`;

  return (
    <StudySection
      id="preliminary-respondents"
      title="Responden"
      description="Skor per kecakapan adalah rata-rata dua soal (0–4). Buka baris untuk membaca jawaban asli; setiap pembukaan tercatat pada log audit."
      className="border-t border-border pt-10"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5 md:w-64">
          <Label htmlFor="preliminary-search">Cari ID responden</Label>
          <Input
            id="preliminary-search"
            type="search"
            placeholder="mis. M07"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preliminary-category">Kategori</Label>
            <select
              id="preliminary-category"
              value={category ?? ""}
              onChange={(event) => onCategoryChange(event.target.value || null)}
              className={SELECT_CLASS}
            >
              <option value="">Semua kategori</option>
              {categories.map((item) => (
                <option key={item.label} value={item.label}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 lg:hidden">
            <Label htmlFor="preliminary-sort">Urutkan</Label>
            <select
              id="preliminary-sort"
              value={
                COMPACT_SORTS.some((item) => item.value === compactSort)
                  ? compactSort
                  : ""
              }
              onChange={(event) => {
                const [key, direction] = event.target.value.split(":");
                if (key && direction)
                  setSort({
                    key: key as RespondentSortKey,
                    direction: direction as SortDirection,
                  });
              }}
              className={SELECT_CLASS}
            >
              <option value="" disabled>
                Lainnya
              </option>
              {COMPACT_SORTS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preliminary-page-size">Baris per halaman</Label>
            <select
              id="preliminary-page-size"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className={SELECT_CLASS}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Tidak ada responden yang cocok"
          description="Ubah kata kunci pencarian atau tampilkan semua kategori."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                onCategoryChange(null);
              }}
            >
              Tampilkan semua
            </Button>
          }
        />
      ) : (
        <>
          <table
            data-slot="respondent-table"
            className="hidden w-full border-collapse text-sm lg:table"
          >
            <caption className="sr-only">
              Responden studi pendahuluan, nilai, dan skor per kecakapan
            </caption>
            <thead>
              <tr className="border-b border-border text-left">
                <SortHeader
                  label="ID"
                  sortKey="code"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Kategori"
                  sortKey="category"
                  sort={sort}
                  onSort={toggleSort}
                />
                <SortHeader
                  label="Nilai"
                  sortKey="score"
                  sort={sort}
                  onSort={toggleSort}
                  align="right"
                />
                {CT_DIMENSIONS.map((dimension) => (
                  <SortHeader
                    key={dimension}
                    label={SKILL_ABBREVIATION[dimension]}
                    fullLabel={DIMENSION_LABEL[dimension]}
                    sortKey={dimension}
                    sort={sort}
                    onSort={toggleSort}
                    align="right"
                  />
                ))}
                <th scope="col" className="py-2 text-right">
                  <span className="sr-only">Jawaban</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {current.rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="py-2.5 pr-4 font-mono text-sm text-foreground">
                    {row.code}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-2 text-foreground">
                      <CategoryMark
                        level={categoryLevel(categories, row.category)}
                      />
                      {row.category}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums">
                    <span className="text-foreground">
                      {formatDecimal(row.score)}
                    </span>
                    <span className="ml-2 text-xs text-subtle">
                      {row.total}/{maxTotal}
                    </span>
                  </td>
                  {CT_DIMENSIONS.map((dimension) => (
                    <td
                      key={dimension}
                      className="py-2.5 pr-4 text-right font-mono text-muted-foreground tabular-nums"
                    >
                      {formatSkillScore(row.skills[dimension])}
                    </td>
                  ))}
                  <td className="py-1.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Lihat jawaban ${row.code}`}
                      onClick={() => onView(row)}
                    >
                      Lihat
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Layar sempit: satu baris per responden, skor kecakapan ada di panel jawaban. */}
          <ul
            data-slot="respondent-list"
            className="flex flex-col divide-y divide-border border-y border-border lg:hidden"
          >
            {current.rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-mono text-sm text-foreground">
                    {row.code}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CategoryMark
                        level={categoryLevel(categories, row.category)}
                      />
                      {row.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatDecimal(row.score)} · {row.total}/{maxTotal}
                    </span>
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  aria-label={`Lihat jawaban ${row.code}`}
                  onClick={() => onView(row)}
                >
                  Lihat
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          data-slot="respondent-range"
          className="font-mono text-xs text-subtle"
        >
          {current.total === 0
            ? "0 responden"
            : `${current.start}–${current.end} dari ${current.total} responden`}
          {category ? ` · kategori ${category}` : ""}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={current.page <= 1}
            onClick={() => goTo(current.page - 1)}
          >
            Sebelumnya
          </Button>
          <span className="min-w-14 text-center font-mono text-xs text-subtle">
            {current.page} / {current.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={current.page >= current.pageCount}
            onClick={() => goTo(current.page + 1)}
          >
            Berikutnya
          </Button>
        </div>
      </div>
    </StudySection>
  );
}
