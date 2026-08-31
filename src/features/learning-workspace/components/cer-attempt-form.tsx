/** @format */

"use client";

import { useState, useTransition } from "react";

import { submitCerAttemptAction } from "@/actions/learning/attempts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CER_ELEMENTS,
  CER_HINT,
  CER_LABEL,
  CER_REQUIRED,
  emptyCerElements,
  type CerElement,
  type CerElements,
} from "@/lib/validation/cer";

const MIN_REQUIRED = 20;

/**
 * Unsur argumen ditulis terpisah agar dapat dinilai dan dianalisis per bagian.
 * Yang tersimpan sebagai respons awal tetap satu narasi utuh hasil gabungan,
 * sehingga aturan attempt-first dan alur revisi tidak berubah.
 */
export function CerAttemptForm({
  activityId,
  onSubmitted,
}: {
  activityId: string;
  onSubmitted: () => void;
}) {
  const [elements, setElements] = useState<CerElements>(emptyCerElements);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isComplete = CER_REQUIRED.every(
    (key) => elements[key].trim().length >= MIN_REQUIRED,
  );

  function update(key: CerElement, value: string) {
    setElements((current) => ({ ...current, [key]: value }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitCerAttemptAction({
        activityId,
        clientSubmissionId: crypto.randomUUID(),
        elements,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      onSubmitted();
    });
  }

  return (
    <div data-slot="cer-attempt-form" className="flex flex-col gap-5">
      {CER_ELEMENTS.map((key) => {
        const required = CER_REQUIRED.includes(key);
        return (
          <div key={key} className="flex flex-col gap-1.5">
            <Label htmlFor={`cer-${key}`}>
              {CER_LABEL[key]}
              {required ? null : (
                <span className="ml-2 font-normal text-subtle">opsional</span>
              )}
            </Label>
            <p className="text-sm text-muted-foreground">{CER_HINT[key]}</p>
            <textarea
              id={`cer-${key}`}
              value={elements[key]}
              onChange={(event) => update(key, event.target.value)}
              rows={required ? 4 : 3}
              className="w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        );
      })}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          data-slot="submit-cer"
          onClick={submit}
          disabled={!isComplete || isPending}
        >
          {isPending ? "Mengirim…" : "Kirim respons awal"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Klaim, bukti, dan penalaran wajib diisi. Setelah dikirim, respons awal
          tidak dapat diubah.
        </p>
      </div>
    </div>
  );
}
