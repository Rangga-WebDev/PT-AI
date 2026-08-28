/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  overrideMasteryAction,
  submitMasteryAssessmentAction,
} from "@/actions/assessment/scoring";
import { recordBranchingDecisionAction } from "@/actions/assessment/branching";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DIMENSION_LABEL, type CtDimension } from "@/lib/constants/stages";
import { weightedRubricScore } from "@/lib/mastery/access";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const OUTCOME_LABEL = {
  not_met: "Belum memenuhi",
  partially_met: "Sebagian memenuhi",
  met: "Memenuhi",
} as const;

const ACTION_LABEL = {
  continue: "Lanjut ke tahap berikutnya",
  remedial: "Remedial",
  enrichment: "Pengayaan",
  hold: "Tahan sementara",
} as const;

interface Criterion {
  id: string;
  code: string;
  description: string;
  dimension: string;
  weight: number;
}

interface ScoringFormProps {
  attemptId: string;
  studentId: string;
  activityId: string;
  criteria: Criterion[];
  existingMastery: { id: string; outcome: string; isFinal: boolean } | null;
  errorCategories: { id: string; name: string }[];
}

export function ScoringForm({
  attemptId,
  studentId,
  activityId,
  criteria,
  existingMastery,
  errorCategories,
}: ScoringFormProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, number>>({});
  const [outcome, setOutcome] = useState<keyof typeof OUTCOME_LABEL>("met");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [action, setAction] = useState<keyof typeof ACTION_LABEL>("continue");
  const [reason, setReason] = useState("");
  const [errorCategoryId, setErrorCategoryId] = useState("");

  const [overrideOutcome, setOverrideOutcome] =
    useState<keyof typeof OUTCOME_LABEL>("met");
  const [overrideReason, setOverrideReason] = useState("");

  const preview =
    criteria.length > 0
      ? weightedRubricScore(
          criteria.map((criterion) => ({
            weight: criterion.weight,
            score: scores[criterion.id] ?? 0,
            maxScore: 100,
          })),
        )
      : null;

  function run(operation: () => Promise<{ ok?: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await operation();
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="penilaian-heading"
        data-slot="scoring-form"
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            id="penilaian-heading"
            className="font-heading text-h4 font-semibold"
          >
            Penilaian rubrik
          </h3>
          {preview !== null ? (
            <StatusBadge status="info" withDot={false}>
              Skor berbobot: {preview}
            </StatusBadge>
          ) : null}
        </div>

        {criteria.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aktivitas ini belum memiliki rubrik. Anda tetap dapat menetapkan
            hasil ketuntasan beserta catatannya.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {criteria.map((criterion) => (
              <li
                key={criterion.id}
                className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-sm text-foreground">
                    {criterion.code} · {criterion.description}
                  </span>
                  <span className="font-mono text-xs text-subtle">
                    {DIMENSION_LABEL[criterion.dimension as CtDimension] ??
                      criterion.dimension}{" "}
                    · bobot {criterion.weight}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor={`score-${criterion.id}`}>Skor (0–100)</Label>
                  <Input
                    id={`score-${criterion.id}`}
                    type="number"
                    min={0}
                    max={100}
                    className="w-28"
                    value={scores[criterion.id] ?? ""}
                    onChange={(event) =>
                      setScores((current) => ({
                        ...current,
                        [criterion.id]: Number(event.target.value),
                      }))
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="outcome">Hasil ketuntasan</Label>
          <select
            id="outcome"
            className={selectClass}
            value={outcome}
            onChange={(event) =>
              setOutcome(event.target.value as keyof typeof OUTCOME_LABEL)
            }
          >
            {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="comment">Catatan untuk mahasiswa</Label>
          <Textarea
            id="comment"
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Jelaskan kriteria mana yang sudah terpenuhi dan mana yang belum, beserta alasannya…"
          />
        </div>

        <div>
          <Button
            data-slot="submit-assessment"
            disabled={isPending || comment.trim().length < 10}
            onClick={() =>
              run(() =>
                submitMasteryAssessmentAction({
                  attemptId,
                  outcome,
                  comment,
                  criteriaScores: Object.entries(scores).map(
                    ([criterionId, score]) => ({ criterionId, score }),
                  ),
                }),
              )
            }
          >
            Simpan penilaian
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="branching-heading"
        data-slot="branching-decision"
        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
      >
        <h3
          id="branching-heading"
          className="font-heading text-h4 font-semibold"
        >
          Keputusan jalur belajar
        </h3>
        <p className="text-sm text-muted-foreground">
          Alasan yang Anda tulis akan dibaca mahasiswa. Keputusan tanpa alasan
          tidak dapat disimpan.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="branching-action">Tindakan</Label>
            <select
              id="branching-action"
              className={selectClass}
              value={action}
              onChange={(event) =>
                setAction(event.target.value as keyof typeof ACTION_LABEL)
              }
            >
              {Object.entries(ACTION_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="branching-category">
              Kategori kekeliruan (opsional)
            </Label>
            <select
              id="branching-category"
              className={selectClass}
              value={errorCategoryId}
              onChange={(event) => setErrorCategoryId(event.target.value)}
            >
              <option value="">Tidak ditentukan</option>
              {errorCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="branching-reason">Alasan keputusan</Label>
          <Textarea
            id="branching-reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        <div>
          <Button
            variant="outline"
            data-slot="submit-branching"
            disabled={isPending || reason.trim().length < 10}
            onClick={() =>
              run(() =>
                recordBranchingDecisionAction({
                  studentId,
                  activityId,
                  action,
                  reason,
                  errorCategoryId,
                }),
              )
            }
          >
            Simpan keputusan
          </Button>
        </div>
      </section>

      {existingMastery ? (
        <section
          aria-labelledby="override-heading"
          data-slot="mastery-override"
          className="flex flex-col gap-4 rounded-xl border border-evidence/40 bg-evidence/[0.05] p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3
              id="override-heading"
              className="font-heading text-h4 font-semibold"
            >
              Ubah hasil ketuntasan
            </h3>
            <StatusBadge status="evidence">
              Saat ini:{" "}
              {OUTCOME_LABEL[
                existingMastery.outcome as keyof typeof OUTCOME_LABEL
              ] ?? existingMastery.outcome}
            </StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">
            Nilai lama tidak dihapus. Perubahan tersimpan sebagai keputusan baru
            beserta alasannya.
          </p>

          <div className="flex flex-col gap-2">
            <Label htmlFor="override-outcome">Hasil baru</Label>
            <select
              id="override-outcome"
              className={selectClass}
              value={overrideOutcome}
              onChange={(event) =>
                setOverrideOutcome(
                  event.target.value as keyof typeof OUTCOME_LABEL,
                )
              }
            >
              {Object.entries(OUTCOME_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="override-reason">Alasan perubahan</Label>
            <Textarea
              id="override-reason"
              rows={3}
              value={overrideReason}
              onChange={(event) => setOverrideReason(event.target.value)}
            />
          </div>

          <div>
            <Button
              variant="outline"
              data-slot="submit-override"
              disabled={isPending || overrideReason.trim().length < 10}
              onClick={() =>
                run(() =>
                  overrideMasteryAction({
                    masteryResultId: existingMastery.id,
                    outcome: overrideOutcome,
                    reason: overrideReason,
                  }),
                )
              }
            >
              Simpan perubahan
            </Button>
          </div>
        </section>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
