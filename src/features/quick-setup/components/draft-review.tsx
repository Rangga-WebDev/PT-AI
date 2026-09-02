/** @format */

"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { updateQuickSetupDraftAction } from "@/actions/courses/quick-setup";
import {
  approveQuickSetupDraftAction,
  discardQuickSetupDraftAction,
} from "@/actions/courses/quick-setup";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CT_DIMENSION_LABEL,
  DOCUMENT_TYPE_LABEL,
  type QuickSetupDraft,
} from "@/lib/ai/quick-setup-schema";
import type { FormState } from "@/actions/administration/accounts";
import type { QuickSetupDraftView } from "@/server/repositories/ai-drafts";

import { ApplyPanel } from "./apply-panel";

const DRAFT_STATUS_LABEL = {
  draft: "Draf — belum diterapkan ke kelas",
  approved: "Disetujui — belum diterapkan ke kelas",
  discarded: "Dibuang",
} as const;

function lines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function SectionHeading({
  children,
  origin,
}: {
  children: React.ReactNode;
  origin: "document" | "ai";
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-border pb-2">
      <h2 className="font-heading text-h3 font-semibold text-foreground">
        {children}
      </h2>
      <StatusBadge status={origin === "document" ? "evidence" : "ai"}>
        {origin === "document" ? "Dari dokumen" : "Saran AI"}
      </StatusBadge>
    </div>
  );
}

function StatusForm({
  action,
  draftId,
  classId,
  label,
  variant,
  confirmMessage,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  draftId: string;
  classId: string;
  label: string;
  variant: "primary" | "outline" | "ghost";
  confirmMessage?: string | undefined;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="draftId" value={draftId} />
      <input type="hidden" name="classId" value={classId} />
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
      {state.error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function DraftReview({
  view,
  classId,
}: {
  view: QuickSetupDraftView;
  classId: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<QuickSetupDraft>(view.draft);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const editable = view.status === "draft";

  function patchMeeting(
    index: number,
    patch: Partial<QuickSetupDraft["meetings"][number]>,
  ) {
    setDraft((current) => ({
      ...current,
      meetings: current.meetings.map((meeting, position) =>
        position === index ? { ...meeting, ...patch } : meeting,
      ),
    }));
  }

  function patchOutcome(
    index: number,
    patch: Partial<QuickSetupDraft["learningOutcomes"][number]>,
  ) {
    setDraft((current) => ({
      ...current,
      learningOutcomes: current.learningOutcomes.map((outcome, position) =>
        position === index ? { ...outcome, ...patch } : outcome,
      ),
    }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const result = await updateQuickSetupDraftAction({
      draftId: view.id,
      classId,
      draft,
    });
    setSaving(false);
    setMessage(result.ok ? "Perubahan tersimpan." : result.error);
    if (result.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <StatusBadge status={view.status === "approved" ? "verified" : "draft"}>
          {DRAFT_STATUS_LABEL[view.status]}
        </StatusBadge>

        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-subtle">Dokumen sumber</dt>
            <dd className="text-right text-foreground">
              {view.provenance.resourceTitle ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-subtle">Jenis dokumen</dt>
            <dd className="text-right text-foreground">
              {view.provenance.documentType
                ? DOCUMENT_TYPE_LABEL[view.provenance.documentType]
                : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-subtle">Sidik isi dokumen</dt>
            <dd className="text-right font-mono text-xs text-muted-foreground">
              {view.provenance.checksum?.slice(0, 16) ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-border/60 py-1">
            <dt className="text-subtle">Model</dt>
            <dd className="text-right font-mono text-xs text-muted-foreground">
              {view.model} · v{view.promptVersion}
            </dd>
          </div>
        </dl>

        {view.provenance.truncated ? (
          <p className="text-xs text-evidence">
            Dokumen dipotong sebelum dibaca AI; bagian akhirnya tidak ikut
            terstruktur.
          </p>
        ) : null}
      </section>

      {draft.warnings.length > 0 || draft.ambiguities.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeading origin="ai">Yang perlu Anda periksa</SectionHeading>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {[...draft.warnings, ...draft.ambiguities].map((note, index) => (
              <li key={index}>— {note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <SectionHeading origin="document">Informasi mata kuliah</SectionHeading>
        <div className="flex max-w-2xl flex-col gap-2">
          <Label htmlFor="draft-course-title">Judul</Label>
          <Input
            id="draft-course-title"
            value={draft.course?.title ?? ""}
            disabled={!editable}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                course: { ...current.course, title: event.target.value },
              }))
            }
          />
        </div>
        {draft.course?.description ? (
          <p className="max-w-prose text-sm text-muted-foreground">
            {draft.course.description}
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading origin="document">CPMK / Sub-CPMK</SectionHeading>
        {draft.learningOutcomes.length === 0 ? (
          <p className="text-sm text-subtle">
            Dokumen tidak menyebutkan capaian pembelajaran, sehingga tidak ada
            yang dapat distrukturkan.
          </p>
        ) : (
          <ol className="flex flex-col gap-4">
            {draft.learningOutcomes.map((outcome, index) => (
              <li
                key={index}
                className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-subtle">
                    {outcome.code ?? `#${index + 1}`}
                  </span>
                  {outcome.type ? (
                    <span className="font-mono text-xs text-subtle">
                      · {outcome.type}
                    </span>
                  ) : null}
                </div>
                <Label htmlFor={`outcome-${index}`} className="sr-only">
                  Capaian {index + 1}
                </Label>
                <Input
                  id={`outcome-${index}`}
                  value={outcome.title}
                  disabled={!editable}
                  onChange={(event) =>
                    patchOutcome(index, { title: event.target.value })
                  }
                />
                {outcome.description ? (
                  <p className="text-sm text-muted-foreground">
                    {outcome.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading origin="document">Struktur pertemuan</SectionHeading>
        {draft.meetings.length === 0 ? (
          <p className="text-sm text-subtle">
            Dokumen tidak menyebutkan susunan pertemuan.
          </p>
        ) : (
          <ol className="flex flex-col gap-8">
            {draft.meetings.map((meeting, index) => (
              <li
                key={index}
                className="flex flex-col gap-4 border-b border-border pb-6 last:border-b-0"
              >
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-xs tracking-widest text-subtle uppercase">
                    Pertemuan {meeting.sequence}
                  </span>
                  <Label htmlFor={`meeting-${index}-title`} className="sr-only">
                    Judul pertemuan {meeting.sequence}
                  </Label>
                  <Input
                    id={`meeting-${index}-title`}
                    value={meeting.title}
                    disabled={!editable}
                    onChange={(event) =>
                      patchMeeting(index, { title: event.target.value })
                    }
                  />
                  {meeting.topic ? (
                    <p className="text-sm text-muted-foreground">
                      {meeting.topic}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={`meeting-${index}-objectives`}>
                    Tujuan (dari dokumen)
                  </Label>
                  <Textarea
                    id={`meeting-${index}-objectives`}
                    rows={Math.min(6, Math.max(2, meeting.objectives.length))}
                    value={meeting.objectives.join("\n")}
                    disabled={!editable}
                    onChange={(event) =>
                      patchMeeting(index, {
                        objectives: lines(event.target.value),
                      })
                    }
                  />
                </div>

                {meeting.suggestedMaterials.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-subtle">
                      Materi disebut dokumen
                    </span>
                    <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                      {meeting.suggestedMaterials.map((item, position) => (
                        <li key={position}>— {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 border-l-2 border-ai/40 pl-4">
                  <div className="flex items-center gap-2">
                    <StatusBadge status="ai">Saran AI</StatusBadge>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`meeting-${index}-activities`}>
                      Usulan aktivitas
                    </Label>
                    <Textarea
                      id={`meeting-${index}-activities`}
                      rows={Math.min(
                        6,
                        Math.max(2, meeting.suggestedActivities.length),
                      )}
                      value={meeting.suggestedActivities.join("\n")}
                      disabled={!editable}
                      onChange={(event) =>
                        patchMeeting(index, {
                          suggestedActivities: lines(event.target.value),
                        })
                      }
                    />
                  </div>

                  {meeting.assessmentSuggestions.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-subtle">
                        Usulan asesmen
                      </span>
                      <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                        {meeting.assessmentSuggestions.map((item, position) => (
                          <li key={position}>— {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {meeting.criticalThinkingDimensions.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Dimensi:{" "}
                      {meeting.criticalThinkingDimensions
                        .map((dimension) => CT_DIMENSION_LABEL[dimension])
                        .join(", ")}
                    </p>
                  ) : null}

                  <label className="flex items-start gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={meeting.ptaiCandidate}
                      disabled={!editable}
                      onChange={(event) =>
                        patchMeeting(index, {
                          ptaiCandidate: event.target.checked,
                        })
                      }
                      className="mt-1 size-4 accent-[var(--color-primary)]"
                    />
                    <span>
                      Cocok untuk aktivitas PT-AI
                      {meeting.ptaiRationale ? (
                        <span className="block text-xs text-subtle">
                          {meeting.ptaiRationale}
                        </span>
                      ) : null}
                    </span>
                  </label>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {draft.references.length > 0 ? (
        <section className="flex flex-col gap-3">
          <SectionHeading origin="document">Referensi</SectionHeading>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {draft.references.map((reference, index) => (
              <li key={index}>
                — {reference.title}
                {reference.note ? (
                  <span className="text-subtle"> ({reference.note})</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        {message ? (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {editable ? (
            <>
              <Button type="button" onClick={save} disabled={saving}>
                {saving ? "Menyimpan…" : "Simpan perubahan"}
              </Button>
              <StatusForm
                action={approveQuickSetupDraftAction}
                draftId={view.id}
                classId={classId}
                label="Setujui draf"
                variant="outline"
                confirmMessage="Draf yang disetujui tidak dapat diubah lagi. Lanjutkan?"
              />
              <StatusForm
                action={discardQuickSetupDraftAction}
                draftId={view.id}
                classId={classId}
                label="Buang draf"
                variant="ghost"
                confirmMessage="Buang draf ini? Tindakan ini tidak dapat dibatalkan."
              />
            </>
          ) : view.status === "approved" ? (
            <ApplyPanel draftId={view.id} classId={classId} />
          ) : (
            <p className="text-sm text-subtle">Draf ini sudah dibuang.</p>
          )}
        </div>

        <p className="text-xs text-subtle">
          {editable
            ? "Menyetujui draf belum membuat pertemuan, unit, maupun aktivitas apa pun di kelas."
            : "Penerapan hanya menambahkan pertemuan yang belum ada. Isi yang sudah Anda buat tidak pernah ditimpa."}
        </p>
      </div>
    </div>
  );
}
