/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitRevisionAction } from "@/actions/learning/revisions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  REVISION_REASON_LABEL,
  REVISION_REASON_TYPES,
  type RevisionReasonType,
} from "@/lib/validation/revision";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

interface AiSuggestion {
  id: string;
  title: string;
}

interface RevisionFormProps {
  attemptId: string;
  aiSuggestions: AiSuggestion[];
}

/**
 * Revisi selalu menjadi versi baru; respons awal tidak pernah ditimpa
 * (LOCK-PED-004). Alasannya wajib supaya perubahan berpikir dapat dilacak,
 * termasuk saran AI mana yang diterima atau ditolak (LOCK-PED-006).
 */
export function RevisionForm({ attemptId, aiSuggestions }: RevisionFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [reasonType, setReasonType] =
    useState<RevisionReasonType>("self_review");
  const [detail, setDetail] = useState("");
  const [aiFeedbackId, setAiFeedbackId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const needsSuggestion = reasonType.startsWith("ai_suggestion");
  const canSubmit =
    content.trim().length >= 20 &&
    detail.trim().length >= 10 &&
    (!needsSuggestion || aiFeedbackId.length > 0);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitRevisionAction({
        attemptId,
        content,
        clientSubmissionId: crypto.randomUUID(),
        reason: { reasonType, detail, aiFeedbackId },
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setContent("");
      setDetail("");
      setAiFeedbackId("");
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="revision-heading"
      data-slot="revision-form"
      className="flex flex-col gap-3"
    >
      <h3 id="revision-heading" className="font-heading text-h4 font-semibold">
        Revisi
      </h3>
      <p className="text-sm text-muted-foreground">
        Revisi disimpan sebagai versi baru; respons awal Anda tetap utuh agar
        perubahan berpikir dapat ditelusuri.
      </p>

      <Label htmlFor="revision-answer">Tulis revisi Anda</Label>
      <Textarea
        id="revision-answer"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={6}
        placeholder="Apa yang Anda ubah, dan bukti apa yang mendasarinya?"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="revision-reason-type">Alasan revisi</Label>
          <select
            id="revision-reason-type"
            className={selectClass}
            value={reasonType}
            onChange={(event) => {
              setReasonType(event.target.value as RevisionReasonType);
              setAiFeedbackId("");
            }}
          >
            {REVISION_REASON_TYPES.map((type) => (
              <option key={type} value={type}>
                {REVISION_REASON_LABEL[type]}
              </option>
            ))}
          </select>
        </div>

        {needsSuggestion ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="revision-ai-feedback">Saran AI terkait</Label>
            <select
              id="revision-ai-feedback"
              className={selectClass}
              value={aiFeedbackId}
              onChange={(event) => setAiFeedbackId(event.target.value)}
            >
              <option value="">Pilih saran AI</option>
              {aiSuggestions.map((suggestion) => (
                <option key={suggestion.id} value={suggestion.id}>
                  {suggestion.title}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <Label htmlFor="revision-detail">Jelaskan alasannya</Label>
      <Textarea
        id="revision-detail"
        value={detail}
        onChange={(event) => setDetail(event.target.value)}
        rows={3}
        placeholder="Minimal 10 karakter. Sebutkan apa yang berubah dan mengapa."
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button
          data-slot="submit-revision"
          onClick={submit}
          disabled={!canSubmit || isPending}
        >
          {isPending ? "Menyimpan…" : "Simpan revisi"}
        </Button>
      </div>
    </section>
  );
}
