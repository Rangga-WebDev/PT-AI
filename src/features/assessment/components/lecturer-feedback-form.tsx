/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitLecturerFeedbackAction } from "@/actions/assessment/feedback";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface LecturerFeedbackFormProps {
  revisionId: string;
  revisionNumber: number;
}

export function LecturerFeedbackForm({
  revisionId,
  revisionNumber,
}: LecturerFeedbackFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitLecturerFeedbackAction({
        revisionId,
        content,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setContent("");
      router.refresh();
    });
  }

  return (
    <div data-slot="lecturer-feedback-form" className="flex flex-col gap-2">
      <Label htmlFor={`feedback-${revisionId}`}>
        Umpan balik untuk revisi {revisionNumber}
      </Label>
      <Textarea
        id={`feedback-${revisionId}`}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={3}
        placeholder="Minimal 10 karakter. Catatan ini tersimpan permanen."
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div>
        <Button
          data-slot="submit-feedback"
          variant="outline"
          size="sm"
          onClick={submit}
          disabled={content.trim().length < 10 || isPending}
        >
          {isPending ? "Menyimpan…" : "Kirim umpan balik"}
        </Button>
      </div>
    </div>
  );
}
