/** @format */

"use client";

import { CloudCheck, Lock, Save } from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { AIFeedbackPanel } from "@/features/ai-coach/components/ai-feedback-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AIFeedbackItem } from "@/types/learning";

interface AttemptGateProps {
  prompt: string;
  aiFeedback: AIFeedbackItem[];
}

/**
 * Attempt-first (LOCK-PED-004): bantuan AI substantif terkunci sampai
 * respons awal disimpan, dan baseline tidak dapat ditimpa setelah tersimpan.
 * Pada PHASE 3 penyimpanan hanya simulasi state lokal.
 */
export function AttemptGate({ prompt, aiFeedback }: AttemptGateProps) {
  const [draft, setDraft] = useState("");
  const [baseline, setBaseline] = useState<string | null>(null);
  const [revision, setRevision] = useState("");

  const hasAttempt = baseline !== null;

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-labelledby="attempt-heading"
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3
            id="attempt-heading"
            className="font-heading text-h4 font-semibold"
          >
            Respons awal Anda
          </h3>
          <StatusBadge status={hasAttempt ? "verified" : "in-progress"}>
            {hasAttempt ? "Baseline tersimpan" : "Belum tersimpan"}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">{prompt}</p>

        {hasAttempt ? (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs tracking-widest text-subtle uppercase">
              Baseline — tidak dapat diubah
            </p>
            <blockquote className="rounded-lg border border-border bg-surface-active/50 p-4 text-sm whitespace-pre-wrap text-muted-foreground">
              {baseline}
            </blockquote>
          </div>
        ) : (
          <>
            <Label htmlFor="attempt-answer">
              Tuliskan jawaban Anda sebelum membuka bantuan AI
            </Label>
            <Textarea
              id="attempt-answer"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={6}
              placeholder="Uraikan penilaian Anda beserta bukti yang Anda gunakan…"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setBaseline(draft.trim())}
                disabled={draft.trim().length === 0}
              >
                <Save aria-hidden="true" />
                Simpan respons awal
              </Button>
              <span className="inline-flex items-center gap-1.5 font-mono text-xs text-subtle">
                <CloudCheck aria-hidden="true" className="size-3.5" />
                Autosave dibangun pada PHASE 8
              </span>
            </div>
          </>
        )}
      </section>

      {hasAttempt ? (
        <>
          <AIFeedbackPanel items={aiFeedback} />
          <section
            aria-labelledby="revision-heading"
            className="flex flex-col gap-3"
          >
            <h3
              id="revision-heading"
              className="font-heading text-h4 font-semibold"
            >
              Revisi
            </h3>
            <p className="text-sm text-muted-foreground">
              Revisi disimpan sebagai versi baru; respons awal Anda tetap utuh
              agar perubahan berpikir dapat ditelusuri.
            </p>
            <Label htmlFor="revision-answer">Tulis revisi Anda</Label>
            <Textarea
              id="revision-answer"
              value={revision}
              onChange={(event) => setRevision(event.target.value)}
              rows={5}
              placeholder="Apa yang Anda ubah, dan bukti apa yang mendasarinya?"
            />
            <Button variant="outline" disabled>
              Simpan revisi (PHASE 12)
            </Button>
          </section>
        </>
      ) : (
        <section
          data-slot="ai-locked"
          aria-labelledby="ai-locked-heading"
          className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-ai/40 bg-ai/[0.05] p-6"
        >
          <span className="inline-flex items-center gap-2 font-mono text-xs tracking-widest text-ai uppercase">
            <Lock aria-hidden="true" className="size-3.5" />
            Bantuan AI terkunci
          </span>
          <h3
            id="ai-locked-heading"
            className="font-heading text-h4 font-semibold"
          >
            Simpan respons awal untuk membuka umpan balik AI
          </h3>
          <p className="max-w-prose text-sm text-muted-foreground">
            Anda berpikir lebih dahulu, AI menanggapi kemudian. Aturan ini
            menjaga agar umpan balik menilai penalaran Anda sendiri, bukan
            menggantikannya.
          </p>
        </section>
      )}
    </div>
  );
}
