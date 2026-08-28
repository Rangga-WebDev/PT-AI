/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitAiDisclosureAction } from "@/actions/ai/coach";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AI_FUNCTION_LABEL, type AiFunction } from "@/lib/constants/stages";

interface AiDisclosureFormProps {
  activityId: string;
  attemptId: string;
  usedFunctions: AiFunction[];
  existing: { statement: string; functionsUsed: string[] } | null;
}

/** Mahasiswa menyatakan sendiri bantuan AI yang dipakainya (LOCK-PED-011). */
export function AiDisclosureForm({
  activityId,
  attemptId,
  usedFunctions,
  existing,
}: AiDisclosureFormProps) {
  const router = useRouter();
  const [statement, setStatement] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (existing) {
    return (
      <section
        aria-labelledby="disclosure-heading"
        data-slot="ai-disclosure"
        className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            id="disclosure-heading"
            className="font-heading text-h4 font-semibold"
          >
            Pernyataan penggunaan AI
          </h3>
          <StatusBadge status="verified">Sudah dinyatakan</StatusBadge>
        </div>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
          {existing.statement}
        </p>
        <p className="font-mono text-xs text-subtle">
          {existing.functionsUsed.length === 0
            ? "Tidak ada fungsi AI yang dinyatakan."
            : existing.functionsUsed
                .map((fn) => AI_FUNCTION_LABEL[fn] ?? fn)
                .join(", ")}
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="disclosure-heading"
      data-slot="ai-disclosure"
      className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
    >
      <h3
        id="disclosure-heading"
        className="font-heading text-h4 font-semibold"
      >
        Pernyataan penggunaan AI
      </h3>
      <p className="text-sm text-muted-foreground">
        Nyatakan bantuan AI yang Anda pakai dan bagaimana Anda menyikapinya.
        Pernyataan ini menjadi bagian dari jejak belajar Anda.
      </p>

      {usedFunctions.length > 0 ? (
        <p className="font-mono text-xs text-subtle">
          Tercatat dipakai:{" "}
          {usedFunctions.map((fn) => AI_FUNCTION_LABEL[fn] ?? fn).join(", ")}
        </p>
      ) : null}

      <Label htmlFor="disclosure-statement">Pernyataan Anda</Label>
      <Textarea
        id="disclosure-statement"
        rows={3}
        value={statement}
        onChange={(event) => setStatement(event.target.value)}
        placeholder="Mis. saya memakai pertanyaan penuntun untuk memeriksa ulang bukti, lalu menolak satu saran karena kutipannya tidak terlacak…"
      />

      <div>
        <Button
          size="sm"
          data-slot="submit-disclosure"
          disabled={isPending || statement.trim().length < 10}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await submitAiDisclosureAction({
                activityId,
                attemptId,
                statement,
                functionsUsed: usedFunctions,
              });
              if (result.error) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
        >
          Simpan pernyataan
        </Button>
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
