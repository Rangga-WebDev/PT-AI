/** @format */

"use client";

import {
  Flag,
  Link2Off,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  markFeedbackAction,
  reportAiIncidentAction,
  requestAiFeedbackAction,
  verifyCitationAction,
} from "@/actions/ai/coach";
import { StatusBadge } from "@/components/shared/status-badge";
import { AIBoundaryNotice } from "@/features/ai-coach/components/ai-boundary-notice";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AI_FUNCTION_LABEL, type AiFunction } from "@/lib/constants/stages";
import type { StoredFeedback } from "@/server/repositories/ai";

const KIND_LABEL: Record<string, string> = {
  guiding_question: "Pertanyaan penuntun",
  strength: "Kekuatan",
  gap: "Kesenjangan",
  counter_argument: "Kontraargumen",
  hint: "Petunjuk",
  recommendation: "Rekomendasi",
};

const ACTION_LABEL: Record<string, string> = {
  pending: "Belum ditanggapi",
  accepted: "Diterima",
  ignored: "Diabaikan",
  reported: "Dilaporkan",
};

interface AIFeedbackPanelProps {
  activityId: string;
  attemptId: string;
  classId: string;
  allowedFunctions: AiFunction[];
  items: StoredFeedback[];
}

export function AIFeedbackPanel({
  activityId,
  attemptId,
  classId,
  allowedFunctions,
  items,
}: AIFeedbackPanelProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

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
    <section
      aria-labelledby="ai-panel-heading"
      data-slot="ai-feedback-panel"
      className="flex flex-col gap-4"
    >
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden="true" className="size-4 text-ai" />
        <h3 id="ai-panel-heading" className="font-heading text-h4 font-semibold">
          Umpan balik AI
        </h3>
      </div>

      <AIBoundaryNotice />

      <div className="flex flex-wrap gap-2">
        {allowedFunctions.map((fn) => (
          <Button
            key={fn}
            variant="ai"
            size="sm"
            disabled={isPending}
            data-slot={`ai-request-${fn}`}
            onClick={() =>
              run(() =>
                requestAiFeedbackAction({
                  activityId,
                  attemptId,
                  aiFunction: fn,
                }),
              )
            }
          >
            <Sparkles aria-hidden="true" />
            {AI_FUNCTION_LABEL[fn] ?? fn}
          </Button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Belum ada umpan balik. Pilih salah satu bantuan di atas; AI menanggapi
          respons awal Anda, bukan menggantikannya.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-xl border border-ai/30 bg-ai/[0.04] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs tracking-widest text-ai uppercase">
                  {KIND_LABEL[item.kind] ?? item.kind}
                </span>
                <StatusBadge
                  status={
                    item.studentAction === "accepted"
                      ? "verified"
                      : item.studentAction === "reported"
                        ? "danger"
                        : "info"
                  }
                >
                  {ACTION_LABEL[item.studentAction] ?? item.studentAction}
                </StatusBadge>
              </div>

              <div className="flex flex-col gap-1">
                <p className="font-medium text-foreground">{item.title}</p>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {item.body}
                </p>
              </div>

              {item.citations.length > 0 ? (
                <ul className="flex flex-col gap-2">
                  {item.citations.map((citation) => (
                    <li
                      key={citation.id}
                      className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        {citation.isTraceable ? (
                          <StatusBadge status="evidence">
                            {citation.sourceTitle ?? "Sumber terlampir"}
                          </StatusBadge>
                        ) : (
                          <StatusBadge status="danger">
                            <Link2Off aria-hidden="true" className="size-3" />
                            Kutipan tidak dapat ditelusuri
                          </StatusBadge>
                        )}
                        {citation.verifiedByStudent ? (
                          <StatusBadge status="verified">
                            <ShieldCheck aria-hidden="true" className="size-3" />
                            Sudah Anda periksa
                          </StatusBadge>
                        ) : null}
                      </div>
                      <blockquote className="text-sm text-muted-foreground italic">
                        {citation.quotedText}
                      </blockquote>
                      {!citation.verifiedByStudent ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() =>
                            run(() => verifyCitationAction(citation.id, true))
                          }
                        >
                          Saya sudah memeriksa kutipan ini
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ai"
                  size="sm"
                  disabled={isPending}
                  onClick={() => run(() => markFeedbackAction(item.id, "accepted"))}
                >
                  <ThumbsUp aria-hidden="true" />
                  Terima
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => run(() => markFeedbackAction(item.id, "ignored"))}
                >
                  <X aria-hidden="true" />
                  Abaikan
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    setReportingId(reportingId === item.id ? null : item.id)
                  }
                >
                  <Flag aria-hidden="true" />
                  Laporkan
                </Button>
              </div>

              {reportingId === item.id ? (
                <div className="flex flex-col gap-2">
                  <Label htmlFor={`report-${item.id}`}>
                    Apa yang bermasalah dari saran ini?
                  </Label>
                  <Textarea
                    id={`report-${item.id}`}
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Mis. saran ini mengarahkan jawaban, atau kutipannya tidak ada di sumber…"
                  />
                  <div>
                    <Button
                      size="sm"
                      disabled={isPending || reason.trim().length < 10}
                      onClick={() =>
                        run(async () => {
                          const result = await reportAiIncidentAction({
                            feedbackId: item.id,
                            classId,
                            reason,
                          });
                          if (result.ok) {
                            setReportingId(null);
                            setReason("");
                          }
                          return result;
                        })
                      }
                    >
                      Kirim laporan
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

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
