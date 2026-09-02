/** @format */

"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import {
  requestAiReviewAction,
  type ReviewSuggestionState,
} from "@/actions/assessment/ai-review";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { CONFIDENCE_LABEL } from "@/lib/ai/review-schema";
import { DIMENSION_LABEL, type CtDimension } from "@/lib/constants/stages";

type Loaded = Extract<ReviewSuggestionState, { ok: true }>;
type LoadedCriterion = Loaded["criteria"][number];

/** Saran AI selalu tampil sebagai level rubrik, bukan angka lepas. */
function levelLabel(
  criterion: LoadedCriterion | undefined,
  score: number,
): string {
  const level = criterion?.levels.find((item) => item.score === score);
  return level ? ` — ${level.label}` : "";
}

/**
 * Asisten penilaian, bukan percakapan. Ia hanya berjalan ketika dosen
 * memintanya, dan usulannya tidak pernah tersimpan sebagai nilai — yang
 * menyimpan tetap formulir penilaian di bawahnya.
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
  const [state, setState] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function request() {
    setError(null);
    startTransition(async () => {
      const result = await requestAiReviewAction(attemptId);
      if (result.ok) setState(result);
      else setError(result.error);
    });
  }

  const artifactLabel = (id: string): string =>
    state?.artifacts.find((item) => item.id === id)?.label ?? "Bukti";

  return (
    <section
      aria-labelledby="ai-review-heading"
      className="flex flex-col gap-4 rounded-xl border border-ai/35 bg-ai/6 p-5"
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
            Usulan berdasarkan rubrik dan bukti yang tercatat. Keputusan nilai
            tetap milik Anda; tidak ada yang tersimpan sampai Anda menekan
            simpan.
          </p>
        </div>
        <Button
          type="button"
          variant="ai"
          size="sm"
          onClick={request}
          disabled={pending || !hasRubric}
        >
          <Sparkles aria-hidden="true" />
          {pending
            ? "Menganalisis…"
            : state
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

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {state ? (
        <div className="flex flex-col gap-6">
          <ul className="flex flex-col gap-5">
            {state.suggestion.criteria.map((entry) => {
              const criterion = state.criteria.find(
                (item) => item.id === entry.criterionId,
              );

              return (
                <li
                  key={entry.criterionId}
                  className="flex flex-col gap-2 border-b border-border pb-5 last:border-b-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {criterion?.code} ·{" "}
                      {DIMENSION_LABEL[criterion?.dimension as CtDimension] ??
                        criterion?.dimension}
                    </span>
                    <span className="font-mono text-xs text-subtle">
                      {CONFIDENCE_LABEL[entry.confidence]}
                    </span>
                  </div>

                  {entry.insufficientEvidence ||
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

                  <p className="max-w-prose text-sm text-muted-foreground">
                    {entry.rationale}
                  </p>

                  {entry.evidence.length > 0 ? (
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

          {state.suggestion.overallObservations.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <h4 className="font-mono text-xs tracking-widest text-subtle uppercase">
                Pengamatan menyeluruh
              </h4>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {state.suggestion.overallObservations.map((item, index) => (
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
              {state.suggestion.suggestedFeedback}
            </p>
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  applyFeedback(state.suggestion.suggestedFeedback)
                }
              >
                Pakai sebagai draf catatan
              </Button>
            </div>
          </div>

          {state.suggestion.limitations.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <h4 className="font-mono text-xs tracking-widest text-subtle uppercase">
                Keterbatasan yang disebut AI
              </h4>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {state.suggestion.limitations.map((item, index) => (
                  <li key={index}>— {item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="font-mono text-xs text-subtle">
            {state.model} · prompt v{state.promptVersion}
          </p>
        </div>
      ) : null}
    </section>
  );
}
