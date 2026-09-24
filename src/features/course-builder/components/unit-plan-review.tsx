/** @format */

"use client";

import Link from "next/link";
import { Check, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  applyUnitPlanAction,
  saveUnitPlanAction,
} from "@/actions/courses/unit-plan";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { UnitPlan, UnitPlanDraftView } from "@/lib/ai/unit-plan";
import { STAGE_LABEL } from "@/lib/constants/stages";

export function UnitPlanReview({
  classId,
  draft,
}: {
  classId: string;
  draft: UnitPlanDraftView;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState(draft.plan);
  const [savedPlan, setSavedPlan] = useState(draft.plan);
  const [updatedAt, setUpdatedAt] = useState(draft.updatedAt);
  const [reviewed, setReviewed] = useState(false);
  const [applied, setApplied] = useState(draft.status === "approved");
  const [unitIds, setUnitIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(plan) !== JSON.stringify(savedPlan);
  const editable = draft.status === "draft" && !applied;

  function editUnit(
    index: number,
    update: (unit: UnitPlan["units"][number]) => UnitPlan["units"][number],
  ) {
    setPlan((current) => ({
      ...current,
      units: current.units.map((unit, position) =>
        position === index ? update(unit) : unit,
      ),
    }));
    setReviewed(false);
    setMessage("");
    setError("");
  }

  function run(mode: "save" | "apply") {
    setError("");
    setMessage("");
    startTransition(async () => {
      try {
        const identity = {
          classId,
          draftId: draft.id,
          expectedUpdatedAt: updatedAt,
        };
        if (mode === "save") {
          const result = await saveUnitPlanAction({ ...identity, plan });
          if ("error" in result) {
            setError(result.error);
            return;
          }
          setSavedPlan(plan);
          setUpdatedAt(result.updatedAt);
          setMessage("Perubahan draf tersimpan.");
        } else {
          if (dirty || !reviewed || !editable) return;
          const result = await applyUnitPlanAction(identity);
          if ("error" in result) {
            setError(result.error);
            return;
          }
          setApplied(true);
          setUnitIds(result.unitIds);
          setMessage(
            result.alreadyApplied
              ? "Enam unit dari draf ini sudah dibuat sebelumnya."
              : "Enam unit dibuat sebagai draf, beserta enam kasus dan 36 aktivitas.",
          );
          router.refresh();
        }
      } catch {
        setError(
          "Koneksi terputus. Muat ulang halaman untuk memeriksa status sebelum mencoba lagi.",
        );
      }
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <dl className="grid gap-3 border-y border-border py-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Pertemuan tujuan</dt>
          <dd className="wrap-break-word font-medium">
            {draft.meta.moduleTitle}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Materi sumber</dt>
          <dd className="wrap-break-word font-medium">
            {draft.meta.resourceTitle}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd>
            {applied
              ? "Disetujui; unit berstatus draf"
              : draft.status === "discarded"
                ? "Dibuang"
                : "Draf untuk ditinjau"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Provenance AI</dt>
          <dd className="wrap-break-word">
            {draft.model} · prompt {draft.promptVersion}
          </dd>
        </div>
      </dl>
      {draft.meta.truncated ? (
        <p role="status" className="text-sm text-evidence">
          Dokumen terlalu panjang; AI hanya membaca bagian awal.
        </p>
      ) : null}
      {plan.warnings.length > 0 ? (
        <ul
          aria-label="Catatan AI"
          className="list-disc space-y-1 pl-5 text-sm text-evidence"
        >
          {plan.warnings.map((warning, index) => (
            <li key={index} className="wrap-break-word">
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
      <fieldset disabled={!editable || pending} className="min-w-0">
        <legend className="mb-3 font-heading text-h4 font-semibold">
          Rancangan 6 unit
        </legend>
        <ol className="divide-y divide-border">
          {plan.units.map((unit, index) => (
            <li key={index} className="py-3">
              <details open={index === 0} className="min-w-0">
                <summary className="cursor-pointer py-2 text-sm font-semibold wrap-break-word">
                  {index + 1}. {unit.title}
                </summary>
                <div className="flex min-w-0 flex-col gap-4 pb-4 pt-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`unit-${index}-title`}>
                      Judul unit {index + 1}
                    </Label>
                    <Input
                      id={`unit-${index}-title`}
                      maxLength={200}
                      value={unit.title}
                      onChange={(event) =>
                        editUnit(index, (current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`unit-${index}-objective`}>
                      Tujuan unit {index + 1}
                    </Label>
                    <Textarea
                      id={`unit-${index}-objective`}
                      maxLength={1000}
                      value={unit.objective}
                      onChange={(event) =>
                        editUnit(index, (current) => ({
                          ...current,
                          objective: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium">
                      Kutipan materi sumber
                    </h3>
                    <blockquote className="border-l-2 border-evidence px-4 text-sm whitespace-pre-wrap wrap-break-word text-muted-foreground">
                      {unit.sourceExcerpt}
                    </blockquote>
                  </div>
                  {(
                    [
                      ["title", "Judul kasus", 200],
                      ["context", "Konteks kasus", 1000],
                      ["body", "Isi kasus", 4000],
                      ["keyQuestion", "Pertanyaan kunci", 1000],
                    ] as const
                  ).map(([key, label, max]) => (
                    <div key={key} className="flex flex-col gap-2">
                      <Label htmlFor={`unit-${index}-case-${key}`}>
                        {label}
                      </Label>
                      <Textarea
                        id={`unit-${index}-case-${key}`}
                        value={unit.case[key]}
                        maxLength={max}
                        rows={key === "body" ? 5 : 2}
                        onChange={(event) =>
                          editUnit(index, (current) => ({
                            ...current,
                            case: {
                              ...current.case,
                              [key]: event.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                  <h3 className="border-t border-border pt-4 text-sm font-semibold">
                    Enam tahap berpikir kritis
                  </h3>
                  {unit.activities.map((activity, activityIndex) => (
                    <details
                      key={activity.stageKey}
                      className="border-b border-border pb-3"
                    >
                      <summary className="cursor-pointer py-2 text-sm font-medium">
                        {activityIndex + 1}. {STAGE_LABEL[activity.stageKey]}
                      </summary>
                      <div className="flex min-w-0 flex-col gap-3 pt-3">
                        <div className="flex flex-col gap-2">
                          <Label
                            htmlFor={`unit-${index}-${activity.stageKey}-title`}
                          >
                            Judul aktivitas
                          </Label>
                          <Input
                            id={`unit-${index}-${activity.stageKey}-title`}
                            value={activity.title}
                            maxLength={200}
                            onChange={(event) =>
                              editUnit(index, (current) => ({
                                ...current,
                                activities: current.activities.map(
                                  (item, position) =>
                                    position === activityIndex
                                      ? { ...item, title: event.target.value }
                                      : item,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label
                            htmlFor={`unit-${index}-${activity.stageKey}-prompt`}
                          >
                            Instruksi mahasiswa
                          </Label>
                          <Textarea
                            id={`unit-${index}-${activity.stageKey}-prompt`}
                            value={activity.prompt}
                            maxLength={2000}
                            rows={4}
                            onChange={(event) =>
                              editUnit(index, (current) => ({
                                ...current,
                                activities: current.activities.map(
                                  (item, position) =>
                                    position === activityIndex
                                      ? { ...item, prompt: event.target.value }
                                      : item,
                                ),
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <Label
                            htmlFor={`unit-${index}-${activity.stageKey}-schema`}
                          >
                            Bentuk respons
                          </Label>
                          <select
                            id={`unit-${index}-${activity.stageKey}-schema`}
                            value={activity.responseSchema}
                            className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                            onChange={(event) =>
                              editUnit(index, (current) => ({
                                ...current,
                                activities: current.activities.map(
                                  (item, position) =>
                                    position === activityIndex
                                      ? {
                                          ...item,
                                          responseSchema:
                                            event.target.value === "cer"
                                              ? "cer"
                                              : "free_text",
                                        }
                                      : item,
                                ),
                              }))
                            }
                          >
                            <option value="free_text">Respons tertulis</option>
                            <option value="cer">
                              Klaim, bukti, dan penalaran (CER)
                            </option>
                          </select>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </fieldset>
      {editable ? (
        <div className="flex flex-col gap-4 border-t border-border pt-4">
          {dirty ? (
            <p role="status" className="text-sm text-evidence">
              Perubahan belum disimpan.
            </p>
          ) : null}
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={pending || dirty}
              onChange={(event) => setReviewed(event.target.checked)}
              className="size-4 shrink-0 accent-primary"
            />
            Saya sudah meninjau keenam unit dan kasusnya.
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={pending || !dirty}
              onClick={() => run("save")}
            >
              <Save aria-hidden="true" />
              Simpan perubahan
            </Button>
            <Button
              type="button"
              disabled={pending || dirty || !reviewed}
              className="min-h-11 whitespace-normal"
              onClick={() => run("apply")}
            >
              <Check aria-hidden="true" />
              {pending ? "Memproses..." : "Setujui dan buat 6 unit"}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      ) : null}
      {applied ? (
        <div className="flex flex-col gap-3">
          <Link
            href={`/app/lecturer/classes/${classId}/builder`}
            className={buttonVariants({ variant: "outline" })}
          >
            Buka struktur kelas
          </Link>
          {unitIds.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {unitIds.map((id, index) => (
                <li key={id}>
                  <Link
                    href={`/app/lecturer/classes/${classId}/builder/units/${id}`}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {index + 1}. {plan.units[index]?.title}
                  </Link>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
