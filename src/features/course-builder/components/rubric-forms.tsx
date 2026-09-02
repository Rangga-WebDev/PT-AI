/** @format */

"use client";

import {
  createCriterionAction,
  createLevelAction,
  createRubricAction,
  createStandardRubricAction,
} from "@/actions/courses/rubrics";
import {
  ActionForm,
  FieldError,
} from "@/features/administration/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PTAI_CT_CRITERIA,
  PTAI_CT_RUBRIC_TITLE,
} from "@/lib/assessment/ptai-critical-thinking-rubric";
import { DIMENSION_LABEL } from "@/lib/constants/stages";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function UseStandardRubricForm() {
  return (
    <ActionForm
      action={createStandardRubricAction}
      submitLabel="Gunakan template PT-AI"
    >
      {() => (
        <div className="flex flex-col gap-4">
          <p className="max-w-prose text-sm text-muted-foreground">
            Membuat {PTAI_CT_CRITERIA.length} kriteria berpikir kritis —{" "}
            {PTAI_CT_CRITERIA.map((criterion) => criterion.title).join(", ")} —
            masing-masing dengan lima level 0–4 beserta deskriptornya.
          </p>
          <div className="flex max-w-md flex-col gap-2">
            <Label htmlFor="standard-rubric-title">Judul (opsional)</Label>
            <Input
              id="standard-rubric-title"
              name="title"
              placeholder={PTAI_CT_RUBRIC_TITLE}
            />
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateRubricForm() {
  return (
    <ActionForm action={createRubricAction} submitLabel="Tambah rubrik">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rubric-title">Judul rubrik</Label>
            <Input id="rubric-title" name="title" required />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rubric-description">Deskripsi (opsional)</Label>
            <Input id="rubric-description" name="description" />
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateCriterionForm({
  rubrics,
}: {
  rubrics: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={createCriterionAction} submitLabel="Tambah kriteria">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="criterion-rubric">Rubrik</Label>
            <select
              id="criterion-rubric"
              name="rubricId"
              required
              className={selectClass}
            >
              {rubrics.map((rubric) => (
                <option key={rubric.id} value={rubric.id}>
                  {rubric.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["rubricId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="criterion-dimension">Dimensi berpikir kritis</Label>
            <select
              id="criterion-dimension"
              name="dimension"
              defaultValue="interpretation"
              className={selectClass}
            >
              {Object.entries(DIMENSION_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["dimension"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="criterion-code">Kode</Label>
            <Input id="criterion-code" name="code" required />
            <FieldError messages={state.fieldErrors?.["code"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="criterion-weight">Bobot</Label>
            <Input
              id="criterion-weight"
              name="weight"
              type="number"
              min={1}
              max={100}
              step={1}
              defaultValue={20}
              required
            />
            <FieldError messages={state.fieldErrors?.["weight"]} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="criterion-description">Deskripsi kriteria</Label>
            <Textarea
              id="criterion-description"
              name="description"
              rows={3}
              required
            />
            <FieldError messages={state.fieldErrors?.["description"]} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateLevelForm({
  criteria,
}: {
  criteria: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={createLevelAction} submitLabel="Tambah level">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="level-criterion">Kriteria</Label>
            <select
              id="level-criterion"
              name="criterionId"
              required
              className={selectClass}
            >
              {criteria.map((criterion) => (
                <option key={criterion.id} value={criterion.id}>
                  {criterion.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["criterionId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="level-label">Label level</Label>
            <Input id="level-label" name="label" required />
            <FieldError messages={state.fieldErrors?.["label"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="level-score">Skor</Label>
            <Input
              id="level-score"
              name="score"
              type="number"
              min={0}
              max={100}
              step={1}
              required
            />
            <FieldError messages={state.fieldErrors?.["score"]} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="level-descriptor">Deskriptor</Label>
            <Textarea
              id="level-descriptor"
              name="descriptor"
              rows={2}
              required
            />
            <FieldError messages={state.fieldErrors?.["descriptor"]} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}
