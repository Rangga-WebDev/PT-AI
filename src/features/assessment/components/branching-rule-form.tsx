/** @format */

"use client";

import { createBranchingRuleAction } from "@/actions/assessment/branching";
import {
  ActionForm,
  FieldError,
} from "@/features/administration/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const ACTION_LABEL = {
  continue: "Lanjut ke tahap berikutnya",
  remedial: "Remedial",
  enrichment: "Pengayaan",
  hold: "Tahan sementara",
};

export function CreateBranchingRuleForm({
  activities,
  errorCategories,
  units,
}: {
  activities: { id: string; label: string }[];
  errorCategories: { id: string; name: string }[];
  units: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={createBranchingRuleAction} submitLabel="Tambah aturan">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-activity">Aktivitas</Label>
            <select
              id="rule-activity"
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
            <Label htmlFor="rule-action">Tindakan</Label>
            <select
              id="rule-action"
              name="action"
              defaultValue="remedial"
              className={selectClass}
            >
              {Object.entries(ACTION_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["action"]} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-category">
              Kategori kekeliruan (opsional)
            </Label>
            <select
              id="rule-category"
              name="errorCategoryId"
              defaultValue=""
              className={selectClass}
            >
              <option value="">Tidak ditentukan</option>
              {errorCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-target">Unit tujuan (opsional)</Label>
            <select
              id="rule-target"
              name="targetUnitId"
              defaultValue=""
              className={selectClass}
            >
              <option value="">Tidak ditentukan</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rule-priority">Prioritas</Label>
            <Input
              id="rule-priority"
              name="priority"
              type="number"
              min={1}
              max={999}
              defaultValue={100}
            />
            <FieldError messages={state.fieldErrors?.["priority"]} />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="rule-explanation">Penjelasan aturan</Label>
            <Textarea
              id="rule-explanation"
              name="explanation"
              rows={3}
              required
              placeholder="Jelaskan mengapa aturan ini ada dan kapan sepatutnya dipakai…"
            />
            <FieldError messages={state.fieldErrors?.["explanation"]} />
            <p className="text-xs text-subtle">
              Aturan tanpa penjelasan tidak dapat disimpan. Penjelasan ini
              menjadi dasar keputusan yang nanti dibaca mahasiswa.
            </p>
          </div>
        </div>
      )}
    </ActionForm>
  );
}
