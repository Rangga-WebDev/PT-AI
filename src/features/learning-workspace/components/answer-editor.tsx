/** @format */

"use client";

import { CloudCheck, Save, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import {
  saveDraftAction,
  submitAttemptAction,
} from "@/actions/learning/attempts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MAX_ATTEMPT_LENGTH } from "@/lib/validation/attempts";

const AUTOSAVE_DELAY_MS = 1500;

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: string }
  | { kind: "error"; message: string };

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AnswerEditorProps {
  activityId: string;
  initialDraft: string;
  initialSavedAt: string | null;
  onSubmitted: () => void;
}

export function AnswerEditor({
  activityId,
  initialDraft,
  initialSavedAt,
  onSubmitted,
}: AnswerEditorProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [saveState, setSaveState] = useState<SaveState>(
    initialSavedAt ? { kind: "saved", at: initialSavedAt } : { kind: "idle" },
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();

  const lastSavedRef = useRef(initialDraft);
  // Penanda kiriman dibuat sekali per sesi agar percobaan ulang idempoten.
  const submissionIdRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (draft === lastSavedRef.current) return;

    const timer = setTimeout(() => {
      const snapshot = draft;
      setSaveState({ kind: "saving" });

      void saveDraftAction(activityId, snapshot).then((result) => {
        if (result.error) {
          setSaveState({ kind: "error", message: result.error });
          return;
        }
        lastSavedRef.current = snapshot;
        setSaveState({ kind: "saved", at: result.savedAt ?? "" });
      });
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [draft, activityId]);

  const handleSubmit = useCallback(() => {
    setSubmitError(null);
    startSubmit(async () => {
      const result = await submitAttemptAction(
        activityId,
        draft,
        submissionIdRef.current,
      );
      if (result.error) {
        setSubmitError(result.error);
        return;
      }
      onSubmitted();
    });
  }, [activityId, draft, onSubmitted]);

  const trimmedLength = draft.trim().length;
  const tooShort = trimmedLength < 20;

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor="attempt-answer">
        Tuliskan jawaban Anda sebelum membuka bantuan AI
      </Label>
      <Textarea
        id="attempt-answer"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={8}
        maxLength={MAX_ATTEMPT_LENGTH}
        placeholder="Uraikan penilaian Anda beserta bukti yang Anda gunakan…"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleSubmit}
            disabled={tooShort || isSubmitting}
            data-slot="submit-attempt"
          >
            <Save aria-hidden="true" />
            {isSubmitting ? "Mengirim…" : "Simpan respons awal"}
          </Button>
          <span className="font-mono text-xs text-subtle">
            {trimmedLength} karakter
          </span>
        </div>

        <span
          role="status"
          aria-live="polite"
          data-slot="autosave-status"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-subtle"
        >
          {saveState.kind === "saving" ? (
            <>
              <CloudCheck aria-hidden="true" className="size-3.5" />
              Menyimpan draf…
            </>
          ) : null}
          {saveState.kind === "saved" ? (
            <>
              <CloudCheck aria-hidden="true" className="size-3.5" />
              Draf tersimpan{saveState.at ? ` ${formatTime(saveState.at)}` : ""}
            </>
          ) : null}
          {saveState.kind === "error" ? (
            <span className="inline-flex items-center gap-1.5 text-destructive">
              <TriangleAlert aria-hidden="true" className="size-3.5" />
              {saveState.message}
            </span>
          ) : null}
        </span>
      </div>

      <p className="text-xs text-subtle">
        Draf tersimpan otomatis. Setelah dikirim, respons awal menjadi permanen
        dan tidak dapat diubah — revisi disimpan sebagai versi terpisah.
      </p>

      {tooShort && trimmedLength > 0 ? (
        <p className="text-sm text-muted-foreground">
          Tulis minimal 20 karakter agar respons dapat ditinjau.
        </p>
      ) : null}

      {submitError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {submitError}
        </p>
      ) : null}
    </div>
  );
}
