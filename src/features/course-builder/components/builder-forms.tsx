/** @format */

"use client";

import {
  createActivityAction,
  createInstructionAction,
  createLearningUnitAction,
  createModuleAction,
  setActivityRubricAction,
  updateStageAction,
  upsertCaseAction,
} from "@/actions/courses/content";
import { useActionState } from "react";
import {
  ActionForm,
  FieldError,
} from "@/features/administration/components/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ACTIVITY_TYPE_LABEL,
  AI_FUNCTION_LABEL,
  STAGE_LABEL,
  type StageKey,
} from "@/lib/constants/stages";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

/** Rubrik aktivitas dapat diganti kapan saja, bukan hanya saat pembuatan. */
export function ActivityRubricForm({
  activityId,
  currentRubricId,
  rubrics,
}: {
  activityId: string;
  currentRubricId: string | null;
  rubrics: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(setActivityRubricAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="activityId" value={activityId} />
      <div className="flex items-center gap-2">
        <label htmlFor={`rubric-${activityId}`} className="sr-only">
          Rubrik aktivitas
        </label>
        <select
          id={`rubric-${activityId}`}
          name="rubricId"
          defaultValue={currentRubricId ?? ""}
          className={`${selectClass} max-w-56`}
        >
          <option value="">Tanpa rubrik</option>
          {rubrics.map((rubric) => (
            <option key={rubric.id} value={rubric.id}>
              {rubric.label}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="outline">
          Simpan rubrik
        </Button>
      </div>
      {state.error ? (
        <span className="text-xs text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}

export function CreateModuleForm({ classId }: { classId: string }) {
  return (
    <ActionForm action={createModuleAction} submitLabel="Tambah modul">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input type="hidden" name="classId" value={classId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="module-title">Judul modul</Label>
            <Input id="module-title" name="title" required />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="module-description">Deskripsi (opsional)</Label>
            <Input id="module-description" name="description" />
            <FieldError messages={state.fieldErrors?.["description"]} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateUnitForm({
  modules,
}: {
  modules: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={createLearningUnitAction} submitLabel="Tambah unit">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="unit-module">Modul induk</Label>
            <select
              id="unit-module"
              name="moduleId"
              required
              className={selectClass}
            >
              {modules.map((module) => (
                <option key={module.id} value={module.id}>
                  {module.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["moduleId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="unit-kind">Jenis unit</Label>
            <select
              id="unit-kind"
              name="unitKind"
              defaultValue="core"
              className={selectClass}
            >
              <option value="core">Inti</option>
              <option value="remedial">Remedial</option>
              <option value="enrichment">Pengayaan</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="unit-title">Judul unit</Label>
            <Input id="unit-title" name="title" required />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="unit-objective">Tujuan pembelajaran</Label>
            <Textarea id="unit-objective" name="objective" rows={3} required />
            <FieldError messages={state.fieldErrors?.["objective"]} />
          </div>
          <p className="text-xs text-subtle md:col-span-2">
            Enam tahap berpikir kritis dibuat otomatis saat unit tersimpan dan
            urutannya tidak dapat diubah.
          </p>
        </div>
      )}
    </ActionForm>
  );
}

export function CaseForm({
  learningUnitId,
  initial,
}: {
  learningUnitId: string;
  initial: {
    title: string;
    context: string;
    body: string;
    keyQuestion: string;
  } | null;
}) {
  return (
    <ActionForm action={upsertCaseAction} submitLabel="Simpan kasus">
      {(state) => (
        <div className="flex flex-col gap-4">
          <input type="hidden" name="learningUnitId" value={learningUnitId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="case-title">Judul kasus</Label>
            <Input
              id="case-title"
              name="title"
              defaultValue={initial?.title ?? ""}
              required
            />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="case-context">Konteks</Label>
            <Textarea
              id="case-context"
              name="context"
              rows={3}
              defaultValue={initial?.context ?? ""}
              required
            />
            <FieldError messages={state.fieldErrors?.["context"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="case-body">Isi kasus</Label>
            <Textarea
              id="case-body"
              name="body"
              rows={10}
              defaultValue={initial?.body ?? ""}
              required
            />
            <FieldError messages={state.fieldErrors?.["body"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="case-question">Pertanyaan kunci</Label>
            <Textarea
              id="case-question"
              name="keyQuestion"
              rows={2}
              defaultValue={initial?.keyQuestion ?? ""}
              required
            />
            <FieldError messages={state.fieldErrors?.["keyQuestion"]} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function StageForm({
  stage,
}: {
  stage: {
    id: string;
    stageKey: StageKey;
    sequence: number;
    title: string;
    focus: string;
    isEnabled: boolean;
  };
}) {
  return (
    <ActionForm action={updateStageAction} submitLabel="Simpan tahap">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input type="hidden" name="stageId" value={stage.id} />
          <div className="flex flex-col gap-2">
            <Label htmlFor={`stage-title-${stage.id}`}>
              Judul tahap {stage.sequence} · {STAGE_LABEL[stage.stageKey]}
            </Label>
            <Input
              id={`stage-title-${stage.id}`}
              name="title"
              defaultValue={stage.title}
              required
            />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`stage-focus-${stage.id}`}>Fokus tahap</Label>
            <Input
              id={`stage-focus-${stage.id}`}
              name="focus"
              defaultValue={stage.focus}
              required
            />
            <FieldError messages={state.fieldErrors?.["focus"]} />
          </div>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              name="isEnabled"
              defaultChecked={stage.isEnabled}
              className="size-4 rounded border-input"
            />
            Tahap ini aktif untuk mahasiswa
          </label>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateActivityForm({
  stages,
  rubrics,
}: {
  stages: { id: string; label: string }[];
  rubrics: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={createActivityAction} submitLabel="Tambah aktivitas">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-stage">Tahap</Label>
            <select
              id="activity-stage"
              name="learningStageId"
              required
              className={selectClass}
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["learningStageId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-type">Jenis aktivitas</Label>
            <select
              id="activity-type"
              name="activityType"
              defaultValue="written_response"
              className={selectClass}
            >
              {Object.entries(ACTIVITY_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["activityType"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-title">Judul aktivitas</Label>
            <Input id="activity-title" name="title" required />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-rubric">Rubrik (opsional)</Label>
            <select
              id="activity-rubric"
              name="rubricId"
              defaultValue=""
              className={selectClass}
            >
              <option value="">Tanpa rubrik</option>
              {rubrics.map((rubric) => (
                <option key={rubric.id} value={rubric.id}>
                  {rubric.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="activity-prompt">Instruksi tugas</Label>
            <Textarea id="activity-prompt" name="prompt" rows={4} required />
            <FieldError messages={state.fieldErrors?.["prompt"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-due">Batas waktu (opsional)</Label>
            <Input id="activity-due" name="dueAt" type="datetime-local" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="activity-threshold">
              Ambang ketuntasan (opsional)
            </Label>
            <Input
              id="activity-threshold"
              name="masteryThreshold"
              type="number"
              min={0}
              max={100}
              step={1}
            />
            <FieldError messages={state.fieldErrors?.["masteryThreshold"]} />
          </div>

          <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3 md:col-span-2">
            <legend className="px-1 text-sm text-foreground">Bantuan AI</legend>
            <p className="text-xs text-subtle">
              AI mati secara bawaan. Bila diaktifkan, mahasiswa tetap wajib
              mengirim jawaban mandiri lebih dulu sebelum AI dapat merespons.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allowsAi"
                className="size-4 rounded border-input"
              />
              Izinkan bantuan AI pada aktivitas ini
            </label>
            <div className="flex flex-wrap gap-3 pt-1">
              {Object.entries(AI_FUNCTION_LABEL).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-sm text-subtle"
                >
                  <input
                    type="checkbox"
                    name="allowedAiFunctions"
                    value={value}
                    className="size-4 rounded border-input"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateInstructionForm({
  activities,
}: {
  activities: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={createInstructionAction} submitLabel="Tambah instruksi">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="instruction-activity">Aktivitas</Label>
            <select
              id="instruction-activity"
              name="activityId"
              required
              className={selectClass}
            >
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["activityId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="instruction-audience">Audiens</Label>
            <select
              id="instruction-audience"
              name="audience"
              defaultValue="student"
              className={selectClass}
            >
              <option value="student">Mahasiswa</option>
              <option value="lecturer">Dosen saja</option>
            </select>
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="instruction-content">Isi instruksi</Label>
            <Textarea
              id="instruction-content"
              name="content"
              rows={3}
              required
            />
            <FieldError messages={state.fieldErrors?.["content"]} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}
