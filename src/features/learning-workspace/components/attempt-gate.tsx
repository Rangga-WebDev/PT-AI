/** @format */

"use client";

import { useRouter } from "next/navigation";

import { StatusBadge } from "@/components/shared/status-badge";
import { AiDisclosureForm } from "@/features/ai-coach/components/ai-disclosure-form";
import { AIFeedbackPanel } from "@/features/ai-coach/components/ai-feedback-panel";
import { AnswerEditor } from "@/features/learning-workspace/components/answer-editor";
import { CerAttemptForm } from "@/features/learning-workspace/components/cer-attempt-form";
import { ReflectionForm } from "@/features/learning-workspace/components/reflection-form";
import { RevisionForm } from "@/features/learning-workspace/components/revision-form";
import { RevisionHistory } from "@/features/learning-workspace/components/revision-history";
import type { AiFunction } from "@/lib/constants/stages";
import type { StoredFeedback } from "@/server/repositories/ai";
import type {
  ReflectionView,
  RevisionView,
} from "@/server/repositories/revisions";

interface AttemptGateProps {
  activityId: string;
  classId: string;
  prompt: string;
  responseSchema: string;
  initialDraft: string;
  initialSavedAt: string | null;
  baseline: { id: string; content: string; submittedAt: string } | null;
  allowsAi: boolean;
  allowedFunctions: AiFunction[];
  feedbackItems: StoredFeedback[];
  disclosure: { statement: string; functionsUsed: string[] } | null;
  revisions: RevisionView[];
  reflection: ReflectionView | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Attempt-first (LOCK-PED-004): bantuan AI substantif terkunci sampai respons
 * awal tersimpan. Baseline bersifat append-only di database — UI hanya
 * mencerminkan aturan itu, bukan menegakkannya.
 */
export function AttemptGate({
  activityId,
  classId,
  prompt,
  responseSchema,
  initialDraft,
  initialSavedAt,
  baseline,
  allowsAi,
  allowedFunctions,
  feedbackItems,
  disclosure,
  revisions,
  reflection,
}: AttemptGateProps) {
  const router = useRouter();

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

        {baseline ? (
          <div className="flex flex-col gap-2">
            <p className="font-mono text-xs tracking-widest text-subtle uppercase">
              Baseline — tidak dapat diubah · dikirim{" "}
              {formatDateTime(baseline.submittedAt)}
            </p>
            <blockquote className="rounded-lg border border-border bg-surface-active/50 p-4 text-sm whitespace-pre-wrap text-muted-foreground">
              {baseline.content}
            </blockquote>
          </div>
        ) : responseSchema === "cer" ? (
          <CerAttemptForm
            activityId={activityId}
            onSubmitted={() => router.refresh()}
          />
        ) : (
          <AnswerEditor
            activityId={activityId}
            initialDraft={initialDraft}
            initialSavedAt={initialSavedAt}
            onSubmitted={() => router.refresh()}
          />
        )}
      </section>

      {hasAttempt ? (
        <>
          {allowsAi ? (
            <AIFeedbackPanel
              activityId={activityId}
              attemptId={baseline.id}
              classId={classId}
              allowedFunctions={allowedFunctions}
              items={feedbackItems}
            />
          ) : (
            <section
              data-slot="ai-disabled"
              className="rounded-xl border border-dashed border-border p-5"
            >
              <p className="text-sm text-muted-foreground">
                Dosen tidak mengaktifkan bantuan AI pada aktivitas ini.
              </p>
            </section>
          )}

          <AiDisclosureForm
            activityId={activityId}
            attemptId={baseline.id}
            usedFunctions={[
              ...new Set(feedbackItems.map((item) => item.function)),
            ]}
            existing={disclosure}
          />

          <RevisionForm
            attemptId={baseline.id}
            aiSuggestions={feedbackItems.map((item) => ({
              id: item.id,
              title: item.title,
            }))}
          />

          {revisions.length > 0 ? (
            <RevisionHistory
              baseline={{
                content: baseline.content,
                submittedAt: baseline.submittedAt,
              }}
              revisions={revisions}
            />
          ) : null}

          <ReflectionForm
            activityId={activityId}
            attemptId={baseline.id}
            latestRevisionId={revisions[revisions.length - 1]?.id ?? null}
            existing={reflection}
          />
        </>
      ) : (
        <section
          data-slot="ai-locked"
          aria-labelledby="ai-locked-heading"
          className="flex flex-col items-start gap-2 border-l-2 border-ai/40 py-1 pl-4"
        >
          <span className="font-mono text-xs tracking-widest text-ai uppercase">
            Bantuan AI
          </span>
          <h3
            id="ai-locked-heading"
            className="font-heading text-h4 font-semibold"
          >
            Menyusul setelah respons awal Anda
          </h3>
          <p className="max-w-prose text-sm text-muted-foreground">
            Simpan respons awal Anda terlebih dahulu. Setelah itu, bantuan AI
            dapat membantu Anda meninjau pemikiran yang sudah Anda bangun.
          </p>
        </section>
      )}
    </div>
  );
}
