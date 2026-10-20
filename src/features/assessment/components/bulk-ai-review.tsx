/** @format */

"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

import { submitBulkAssessmentsAction } from "@/actions/assessment/scoring";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { streamAiReview, type ReviewStreamEvent } from "@/lib/ai/review-stream";
import {
  proposeOutcome,
  summarizeSuggestion,
  type SuggestedAssessment,
} from "@/lib/assessment/bulk-review";
import type { CtDimension } from "@/lib/constants/stages";
import type { MasteryOutcome } from "@/lib/mastery/access";
import type { PendingAssessmentRow } from "@/server/repositories/attempts";

import { OUTCOME_LABEL } from "./scoring-form";

type Meta = Extract<ReviewStreamEvent, { type: "meta" }>;
type RowStatus = "waiting" | "running" | "ready" | "manual" | "error" | "saved";

interface RowState {
  status: RowStatus;
  criteria: Meta["criteria"];
  summary: SuggestedAssessment | null;
  outcome: MasteryOutcome;
  outcomeTouched: boolean;
  comment: string;
  selected: boolean;
  message: string | null;
}

// Dua permintaan sekaligus: cukup cepat tanpa memancing batas laju penyedia.
const CONCURRENCY = 2;
const COMMENT_MAX = 2000;

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function initialRow(item: PendingAssessmentRow): RowState {
  return {
    status: item.hasRubric ? "waiting" : "manual",
    criteria: [],
    summary: null,
    outcome: "partially_met",
    outcomeTouched: false,
    comment: "",
    selected: false,
    message: item.hasRubric
      ? null
      : "Aktivitas ini belum memiliki rubrik. Nilai lewat halaman tinjau.",
  };
}

/**
 * Satu klik meminta usulan AI untuk semua respons yang belum dinilai. Yang
 * tersimpan tetap keputusan dosen: tidak ada nilai yang ditulis sebelum dosen
 * menekan simpan, dan setiap baris dapat diubah atau dikeluarkan.
 */
export function BulkAiReview({
  items,
  defaultThreshold = 75,
}: {
  items: PendingAssessmentRow[];
  defaultThreshold?: number;
}) {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(items.map((item) => [item.attemptId, initialRow(item)])),
  );
  const [threshold, setThreshold] = useState(defaultThreshold);
  const [running, setRunning] = useState(false);
  const [halted, setHalted] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const aborter = useRef<AbortController | null>(null);

  useEffect(() => () => aborter.current?.abort(), []);

  const visible = items.filter((item) => rows[item.attemptId]);
  const rowOf = (item: PendingAssessmentRow) => rows[item.attemptId]!;
  const thresholdFor = (item: PendingAssessmentRow) =>
    item.masteryThreshold ?? threshold;

  const runnable = visible.filter((item) =>
    ["waiting", "error"].includes(rowOf(item).status),
  );
  const finished = visible.filter((item) =>
    ["ready", "manual", "error", "saved"].includes(rowOf(item).status),
  ).length;
  const selected = visible.filter((item) => {
    const row = rowOf(item);
    return row.status === "ready" && row.selected;
  });

  function update(
    id: string,
    patch: Partial<RowState> | ((row: RowState) => Partial<RowState>),
  ) {
    setRows((current) => {
      const row = current[id];
      if (!row) return current;
      const next = typeof patch === "function" ? patch(row) : patch;
      return { ...current, [id]: { ...row, ...next } };
    });
  }

  async function reviewOne(
    item: PendingAssessmentRow,
    signal: AbortSignal,
  ): Promise<string | null> {
    const id = item.attemptId;
    let meta: Meta | null = null;
    let haltReason: string | null = null;

    update(id, { status: "running", message: null });

    await streamAiReview(
      id,
      (event) => {
        if (event.type === "meta") {
          meta = event;
        } else if (event.type === "done") {
          const criteria = meta?.criteria ?? [];
          const summary = summarizeSuggestion(
            criteria.map((criterion) => ({
              id: criterion.id,
              dimension: criterion.dimension as CtDimension,
              weight: criterion.weight,
              levels: criterion.levels,
            })),
            event.suggestion.criteria,
          );
          const score = summary.score;

          if (score === null) {
            update(id, {
              status: "manual",
              criteria,
              summary,
              message:
                "Menurut AI, bukti belum cukup untuk sebagian kriteria. Nilai lewat halaman tinjau.",
            });
            return;
          }

          update(id, (row) => ({
            status: "ready",
            criteria,
            summary,
            comment: event.suggestion.suggestedFeedback.slice(0, COMMENT_MAX),
            outcome: row.outcomeTouched
              ? row.outcome
              : proposeOutcome(score, thresholdFor(item)),
            selected: true,
          }));
        } else if (event.type === "error") {
          if (event.status === 429) {
            haltReason = event.error;
            update(id, { status: "waiting", message: null });
          } else if (event.status !== undefined && event.status < 500) {
            update(id, { status: "manual", message: event.error });
          } else {
            update(id, { status: "error", message: event.error });
          }
        }
      },
      signal,
    );

    return haltReason;
  }

  async function run(targets: PendingAssessmentRow[]) {
    aborter.current?.abort();
    const controller = new AbortController();
    aborter.current = controller;

    setRunning(true);
    setHalted(null);
    setSaveMessage(null);

    const queue = [...targets];
    let stop = false;

    const worker = async () => {
      while (!stop && !controller.signal.aborted) {
        const next = queue.shift();
        if (!next) return;
        const haltReason = await reviewOne(next, controller.signal);
        if (haltReason) {
          stop = true;
          setHalted(
            `${haltReason} Respons yang belum diperiksa tetap menunggu dan dapat dilanjutkan nanti.`,
          );
        }
      }
    };

    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (!controller.signal.aborted) setRunning(false);
  }

  function changeThreshold(value: number) {
    setThreshold(value);
    setRows((current) => {
      const next = { ...current };
      for (const item of items) {
        const row = next[item.attemptId];
        const score = row?.summary?.score;
        if (
          !row ||
          row.status !== "ready" ||
          row.outcomeTouched ||
          item.masteryThreshold !== null ||
          score === null ||
          score === undefined
        ) {
          continue;
        }
        next[item.attemptId] = {
          ...row,
          outcome: proposeOutcome(score, value),
        };
      }
      return next;
    });
  }

  function save() {
    const payload = selected.map((item) => {
      const row = rowOf(item);
      return {
        attemptId: item.attemptId,
        outcome: row.outcome,
        comment: row.comment,
        criteriaScores: Object.entries(row.summary?.selections ?? {}).map(
          ([criterionId, score]) => ({ criterionId, score }),
        ),
      };
    });
    if (payload.length === 0) return;

    setSaveMessage(null);
    startSaving(async () => {
      const result = await submitBulkAssessmentsAction(payload);
      if (result.error) {
        setSaveMessage(result.error);
        return;
      }
      for (const id of result.saved) {
        update(id, { status: "saved", selected: false, message: null });
      }
      for (const failure of result.failed) {
        update(failure.attemptId, { message: failure.error });
      }
      setSaveMessage(
        result.failed.length > 0
          ? `${result.saved.length} penilaian tersimpan, ${result.failed.length} gagal. Lihat catatan pada barisnya.`
          : `${result.saved.length} penilaian tersimpan.`,
      );
    });
  }

  return (
    <section
      aria-labelledby="bulk-review-heading"
      className="flex flex-col gap-5 border-b border-border pb-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-prose flex-col gap-1">
          <h2
            id="bulk-review-heading"
            className="font-heading text-h3 font-semibold text-foreground"
          >
            Periksa semua dengan AI
          </h2>
          <p className="text-sm text-muted-foreground">
            {visible.length} respons awal belum dinilai. AI menyusun usulan
            level rubrik dan catatan untuk masing-masing. Tidak ada nilai yang
            tersimpan sampai Anda menekan simpan. Setiap respons memakai satu
            kuota bantuan AI (60 per jam).
          </p>
        </div>
        <Button
          type="button"
          variant="ai"
          onClick={() => void run(runnable)}
          disabled={running || runnable.length === 0}
        >
          <Sparkles aria-hidden="true" />
          {running
            ? "Memeriksa…"
            : `Periksa semua dengan AI (${runnable.length})`}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bulk-threshold">Ambang ketuntasan bawaan</Label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="bulk-threshold"
            type="number"
            min={0}
            max={100}
            step={1}
            value={threshold}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isFinite(value)) {
                changeThreshold(Math.min(100, Math.max(0, value)));
              }
            }}
            className="w-24"
          />
          <p className="max-w-prose text-xs text-subtle">
            Dipakai bila aktivitas belum punya ambang sendiri. Nilai di atas
            ambang diusulkan Memenuhi, di atas setengahnya Sebagian memenuhi,
            selebihnya Belum memenuhi. Usulan ini dapat Anda ubah per baris.
          </p>
        </div>
      </div>

      <p role="status" className="text-sm text-subtle empty:hidden">
        {running
          ? `AI sudah memeriksa ${finished} dari ${visible.length} respons…`
          : ""}
      </p>

      {halted ? (
        <p
          role="alert"
          className="border-l-2 border-destructive pl-3 text-sm text-foreground"
        >
          {halted}
        </p>
      ) : null}

      <ul className="flex flex-col">
        {visible.map((item) => {
          const row = rowOf(item);
          return (
            <li
              key={item.attemptId}
              className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {item.studentName}
                  </span>
                  <span className="font-mono text-xs text-subtle">
                    {item.studentIdentifier} · {item.className} ·{" "}
                    {item.unitTitle} · {item.stageTitle}
                  </span>
                </div>
                <Link
                  href={`/app/lecturer/review/${item.attemptId}`}
                  className="text-sm text-foreground underline underline-offset-4"
                >
                  Tinjau
                </Link>
              </div>

              {row.status === "running" ? (
                <p className="text-sm text-subtle">
                  AI sedang menyusun usulan…
                </p>
              ) : null}

              {row.status === "saved" ? (
                <p className="text-sm text-foreground">Penilaian tersimpan.</p>
              ) : null}

              {row.status === "manual" && row.message ? (
                <p className="text-sm text-muted-foreground">{row.message}</p>
              ) : null}

              {row.status === "error" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm text-destructive">{row.message}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={running}
                    onClick={() => void run([item])}
                  >
                    Coba lagi
                  </Button>
                </div>
              ) : null}

              {row.status === "ready" && row.summary ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-foreground">
                    Nilai rubrik usulan{" "}
                    <span className="font-heading tabular-nums">
                      {row.summary.score}
                    </span>{" "}
                    / 100 · ambang {thresholdFor(item)}
                  </p>
                  <p className="font-mono text-xs text-subtle">
                    {row.criteria
                      .map((criterion) => {
                        const score = row.summary?.selections[criterion.id];
                        const level = criterion.levels.find(
                          (entry) => entry.score === score,
                        );
                        return `${criterion.code} ${score}${level ? ` ${level.label}` : ""}`;
                      })
                      .join(" · ")}
                  </p>
                  <div className="grid gap-3 md:grid-cols-[13rem_minmax(0,1fr)]">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`outcome-${item.attemptId}`}>
                        Hasil ketuntasan
                      </Label>
                      <select
                        id={`outcome-${item.attemptId}`}
                        className={selectClass}
                        value={row.outcome}
                        onChange={(event) =>
                          update(item.attemptId, {
                            outcome: event.target.value as MasteryOutcome,
                            outcomeTouched: true,
                          })
                        }
                      >
                        {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`comment-${item.attemptId}`}>
                        Catatan untuk mahasiswa
                      </Label>
                      <Textarea
                        id={`comment-${item.attemptId}`}
                        rows={3}
                        maxLength={COMMENT_MAX}
                        value={row.comment}
                        onChange={(event) =>
                          update(item.attemptId, {
                            comment: event.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={(event) =>
                        update(item.attemptId, {
                          selected: event.target.checked,
                        })
                      }
                      className="size-4 rounded border-input"
                    />
                    Sertakan saat menyimpan
                  </label>
                  {row.message ? (
                    <p className="text-sm text-destructive">{row.message}</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={save}
          disabled={saving || running || selected.length === 0}
        >
          {saving ? "Menyimpan…" : `Simpan ${selected.length} penilaian`}
        </Button>
        <span className="max-w-prose text-xs text-subtle">
          Nilai tersimpan sebagai keputusan Anda. Untuk mengubah level per
          kriteria, buka Tinjau pada barisnya.
        </span>
      </div>
      {saveMessage ? (
        <p role="status" className="text-sm text-foreground">
          {saveMessage}
        </p>
      ) : null}
    </section>
  );
}
