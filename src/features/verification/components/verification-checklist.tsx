/** @format */

"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VerificationCriterion } from "@/types/learning";

interface VerificationChecklistProps {
  criteria: VerificationCriterion[];
}

/** Mahasiswa menilai sumber pada enam kriteria (LOCK-PED-007). */
export function VerificationChecklist({
  criteria,
}: VerificationChecklistProps) {
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [note, setNote] = useState("");

  function toggle(id: string, checked: boolean) {
    setCheckedIds((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
  }

  const allChecked = checkedIds.length === criteria.length;

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
        <StatusBadge status={allChecked ? "verified" : "evidence"}>
          {checkedIds.length} dari {criteria.length} kriteria diperiksa
        </StatusBadge>
      </div>

      <ul className="flex flex-col gap-4">
        {criteria.map((criterion) => (
          <li key={criterion.id} className="flex items-start gap-3">
            <Checkbox
              id={`kriteria-${criterion.id}`}
              className="mt-1"
              checked={checkedIds.includes(criterion.id)}
              onCheckedChange={(checked) => toggle(criterion.id, checked)}
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor={`kriteria-${criterion.id}`}>
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
        <Label htmlFor="catatan-verifikasi">Catatan verifikasi Anda</Label>
        <Textarea
          id="catatan-verifikasi"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          placeholder="Apa yang membuat sumber ini layak atau tidak layak dipakai sebagai bukti?"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button disabled>Simpan verifikasi (PHASE 9)</Button>
        <span className="font-mono text-xs text-subtle">
          Hasil verifikasi belum disimpan pada prototipe visual.
        </span>
      </div>
    </section>
  );
}
