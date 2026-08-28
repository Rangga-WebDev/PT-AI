/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitVerificationAction } from "@/actions/sources/verification";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  VERDICT_LABEL,
  VERIFICATION_CRITERIA,
  type VerificationVerdict,
} from "@/lib/constants/verification";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

interface VerificationChecklistProps {
  sourceId: string;
  sourceVersionId: string | null;
  activityId: string;
}

/**
 * Mahasiswa menilai sumber pada enam kriteria (LOCK-PED-007). Penilaian
 * tersimpan sebagai baris baru; penilaian lama tidak dihapus.
 */
export function VerificationChecklist({
  sourceId,
  sourceVersionId,
  activityId,
}: VerificationChecklistProps) {
  const router = useRouter();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [verdict, setVerdict] = useState<VerificationVerdict>("questionable");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  const answered = VERIFICATION_CRITERIA.filter(
    (criterion) => criterion.key in checked,
  ).length;
  const complete = answered === VERIFICATION_CRITERIA.length;
  const noteTooShort = note.trim().length < 10;

  function handleSubmit() {
    setError(null);
    startSaving(async () => {
      const result = await submitVerificationAction({
        sourceId,
        sourceVersionId: sourceVersionId ?? "",
        activityId,
        verdict,
        checklist: checked,
        note,
      });

      if (result.error) {
        setError(result.error);
        return;
      }
      setNote("");
      setChecked({});
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="verifikasi-heading"
      data-slot="verification-checklist"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="verifikasi-heading"
          className="font-heading text-h4 font-semibold"
        >
          Checklist verifikasi
        </h3>
        <StatusBadge status={complete ? "verified" : "evidence"}>
          {answered} dari {VERIFICATION_CRITERIA.length} kriteria dinilai
        </StatusBadge>
      </div>

      <ul className="flex flex-col gap-4">
        {VERIFICATION_CRITERIA.map((criterion) => (
          <li key={criterion.key} className="flex items-start gap-3">
            <Checkbox
              id={`kriteria-${criterion.key}`}
              className="mt-1"
              checked={checked[criterion.key] === true}
              onCheckedChange={(value) =>
                setChecked((current) => ({
                  ...current,
                  [criterion.key]: value === true,
                }))
              }
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor={`kriteria-${criterion.key}`}>
                {criterion.label}
              </Label>
              <p className="text-sm text-muted-foreground">
                {criterion.question}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2">
        <Label htmlFor="verdict">Kesimpulan Anda</Label>
        <select
          id="verdict"
          className={selectClass}
          value={verdict}
          onChange={(event) =>
            setVerdict(event.target.value as VerificationVerdict)
          }
        >
          {Object.entries(VERDICT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="verification-note">Alasan penilaian</Label>
        <Textarea
          id="verification-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          placeholder="Jelaskan dasar penilaian Anda, termasuk keterbatasan sumber ini…"
        />
        <p className="text-xs text-subtle">
          Centang berarti kriteria terpenuhi. Kriteria yang tidak terpenuhi tetap
          harus dinilai — biarkan kosong lalu jelaskan alasannya di sini.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!complete || noteTooShort || isSaving}
          data-slot="submit-verification"
        >
          {isSaving ? "Menyimpan…" : "Simpan verifikasi"}
        </Button>
        {!complete ? (
          <span className="text-xs text-subtle">
            Nilai keenam kriteria terlebih dahulu.
          </span>
        ) : null}
        {complete && noteTooShort ? (
          <span className="text-xs text-subtle">
            Alasan penilaian minimal 10 karakter.
          </span>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
