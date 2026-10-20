/** @format */

"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  CONFIDENCE_LABEL,
  type CriterionSuggestion,
  type ReviewSuggestion,
} from "@/lib/ai/review-schema";
import { streamAiReview, type ReviewStreamEvent } from "@/lib/ai/review-stream";
import { DIMENSION_LABEL, type CtDimension } from "@/lib/constants/stages";

type Meta = Extract<ReviewStreamEvent, { type: "meta" }>;
type MetaCriterion = Meta["criteria"][number];

/** Saran AI selalu tampil sebagai level rubrik, bukan angka lepas. */
function levelLabel(
  criterion: MetaCriterion | undefined,
  score: number,
): string {
  const level = criterion?.levels.find((item) => item.score === score);
  return level ? ` — ${level.label}` : "";
}

/**
 * Asisten penilaian, bukan percakapan. Ia hanya berjalan ketika dosen
 * memintanya, dan usulannya tidak pernah tersimpan sebagai nilai — yang
 * menyimpan tetap formulir penilaian di bawahnya. Usulan tampil per kriteria
 * selagi AI menulis, tetapi baru dapat dipakai setelah seluruhnya lolos.
 */
export function AiReviewPanel({
  attemptId,
  hasRubric,
  applyScore,
  applyFeedback,
}: {
  attemptId: string;
  hasRubric: boolean;
  applyScore: (criterionId: string, score: number) => void;
  applyFeedback: (text: string) => void;
}) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [entries, setEntries] = useState<CriterionSuggestion[]>([]);
  const [final, setFinal] = useState<ReviewSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  function request() {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;

    setMeta(null);
    setEntries([]);
    setFinal(null);
    setError(null);
    setStreaming(true);

    void streamAiReview(
      attemptId,
      (event) => {
        if (current.signal.aborted) return;
        if (event.type === "meta") {
          setMeta(event);
        } else if (event.type === "criterion") {
          setEntries((list) => [...list, event.entry]);
        } else if (event.type === "done") {
          setFinal(event.suggestion);
          setStreaming(false);
        } else {
          // Satu butir yang ditolak membatalkan seluruh hasil, termasuk yang sudah tampil.
          setMeta(null);
          setEntries([]);
          setError(event.error);
          setStreaming(false);
        }
      },
      current.signal,
    );
  }

  const suggestions = new Map(
    (final?.criteria ?? entries).map((entry) => [entry.criterionId, entry]),
  );

  const artifactLabel = (id: string): string =>
    meta?.artifacts.find((item) => item.id === id)?.label ?? "Bukti";

  return (
    <section
      aria-labelledby="ai-review-heading"
      className="flex flex-col gap-4 border-l-2 border-ai/40 py-1 pl-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3
            id="ai-review-heading"
            className="font-heading text-h4 font-semibold text-foreground"
          >
            Bantuan penilaian AI
          </h3>
          <p className="max-w-prose text-sm text-muted-foreground">
            Usulan berdasarkan rubrik dan bukti yang tercatat, muncul per
            kriteria selagi AI menyusunnya. Keputusan nilai tetap milik Anda;
            tidak ada yang tersimpan sampai Anda menekan simpan.
          </p>
        </div>
        <Button
          type="button"
          variant="ai"
          size="sm"
          onClick={request}
          disabled={streaming || !hasRubric}
        >
          <Sparkles aria-hidden="true" />
          {streaming
            ? "Menganalisis…"
            : final
              ? "Minta ulang"
              : "Bantu review dengan AI"}
        </Button>
      </div>

      {!hasRubric ? (
        <p className="text-sm text-subtle">
          Aktivitas ini belum memiliki rubrik berkriteria, sehingga tidak ada
          dasar penilaian yang dapat dipakai AI.
        </p>
      ) : null}

      <p role="status" className="text-sm text-subtle empty:hidden">
        {streaming
          ? meta
            ? `AI sudah mengusulkan ${entries.length} dari ${meta.criteria.length} kriteria…`
            : "Menyiapkan bukti pekerjaan…"
          : ""}
      </p>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {meta ? (
        <div className="flex flex-col gap-6">
          <ul className="flex flex-col gap-5" aria-busy={streaming}>
            {meta.criteria.map((criterion) => {
              const entry = suggestions.get(criterion.id);

              return (
                <li
                  key={criterion.id}
                  className="flex flex-col gap-2 border-b border-border pb-5 last:border-b-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {criterion.code} ·{" "}
                      {DIMENSION_LABEL[criterion.dimension as CtDimension] ??
                        criterion.dimension}
                    </span>
                    {entry ? (
                      <span className="font-mono text-xs text-subtle">
                        {CONFIDENCE_LABEL[entry.confidence]}
                      </span>
                    ) : null}
                  </div>

                  {!entry ? (
                    <p className="text-sm text-subtle">
                      {streaming
                        ? "Menunggu usulan AI…"
                        : "AI tidak memberi usulan untuk kriteria ini."}
                    </p>
                  ) : entry.insufficientEvidence ||
                    entry.suggestedScore === null ? (
                    <StatusBadge status="evidence" withDot={false}>
                      Bukti belum cukup untuk menilai
                    </StatusBadge>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge status="ai" withDot={false}>
                        Saran AI: {entry.suggestedScore}
                        {levelLabel(criterion, entry.suggestedScore)}
                      </StatusBadge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!final}
                        onClick={() =>
                          applyScore(
                            entry.criterionId,
                            entry.suggestedScore as number,
                          )
                        }
                      >
                        Gunakan saran
                      </Button>
                    </div>
                  )}

                  {entry ? (
                    <p className="max-w-prose text-sm text-muted-foreground">
                      {entry.rationale}
                    </p>
                  ) : null}

                  {entry && entry.evidence.length > 0 ? (
                    <ul className="flex flex-col gap-1 border-l-2 border-ai/40 pl-3">
                      {entry.evidence.map((reference, index) => (
                        <li
                          key={`${reference.artifactId}-${index}`}
                          className="text-xs text-subtle"
                        >
                          <span className="text-muted-foreground">
                            {artifactLabel(reference.artifactId)}:
                          </span>{" "}
                          “{reference.excerpt}”
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {streaming && entries.length > 0 ? (
            <p className="text-xs text-subtle">
              “Gunakan saran” aktif setelah usulan untuk semua kriteria selesai
              dan tercatat.
            </p>
          ) : null}

          {final ? (
            <>
              {final.overallObservations.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-mono text-xs tracking-widest text-subtle uppercase">
                    Pengamatan menyeluruh
                  </h4>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {final.overallObservations.map((item, index) => (
                      <li key={index}>— {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <h4 className="font-mono text-xs tracking-widest text-subtle uppercase">
                  Saran umpan balik AI
                </h4>
                <p className="max-w-prose text-sm whitespace-pre-wrap text-muted-foreground">
                  {final.suggestedFeedback}
                </p>
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyFeedback(final.suggestedFeedback)}
                  >
                    Pakai sebagai draf catatan
                  </Button>
                </div>
              </div>

              {final.limitations.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <h4 className="font-mono text-xs tracking-widest text-subtle uppercase">
                    Keterbatasan yang disebut AI
                  </h4>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {final.limitations.map((item, index) => (
                      <li key={index}>— {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="font-mono text-xs text-subtle">
                {meta.model} · prompt v{meta.promptVersion}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
