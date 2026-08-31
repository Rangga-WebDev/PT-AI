/** @format */

"use client";

import {
  createLinkMaterialAction,
  createNoteMaterialAction,
  updateMaterialAction,
} from "@/actions/courses/materials";
import {
  ActionForm,
  FieldError,
} from "@/features/administration/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MATERIAL_KINDS,
  MATERIAL_KIND_LABEL,
} from "@/lib/validation/materials";
import type { MaterialView } from "@/lib/materials/types";

import { fieldClass, selectClass, TargetNote, VisibilityField } from "./fields";

function KindField({
  idPrefix,
  defaultValue,
}: {
  idPrefix: string;
  defaultValue?: string | undefined;
}) {
  return (
    <div className={fieldClass}>
      <Label htmlFor={`${idPrefix}-kind`}>Jenis bahan</Label>
      <select
        id={`${idPrefix}-kind`}
        name="materialKind"
        className={selectClass}
        defaultValue={defaultValue ?? "reading"}
      >
        {MATERIAL_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {MATERIAL_KIND_LABEL[kind]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function LinkMaterialForm({ classId }: { classId: string }) {
  return (
    <ActionForm action={createLinkMaterialAction} submitLabel="Simpan tautan">
      {(state) => (
        <div className="flex flex-col gap-4">
          <input type="hidden" name="classId" value={classId} />
          <input type="hidden" name="resourceType" value="link" />

          <div className={fieldClass}>
            <Label htmlFor="link-title">Judul</Label>
            <Input id="link-title" name="title" required />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>

          <div className={fieldClass}>
            <Label htmlFor="link-url">Tautan</Label>
            <Input
              id="link-url"
              name="url"
              type="url"
              inputMode="url"
              placeholder="https://"
              required
            />
            <FieldError messages={state.fieldErrors?.["url"]} />
          </div>

          <KindField idPrefix="link" />
          <VisibilityField idPrefix="link" />
          <TargetNote />
        </div>
      )}
    </ActionForm>
  );
}

export function NoteMaterialForm({ classId }: { classId: string }) {
  return (
    <ActionForm action={createNoteMaterialAction} submitLabel="Simpan materi">
      {(state) => (
        <div className="flex flex-col gap-4">
          <input type="hidden" name="classId" value={classId} />

          <div className={fieldClass}>
            <Label htmlFor="note-title">Judul</Label>
            <Input id="note-title" name="title" required />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>

          <div className={fieldClass}>
            <Label htmlFor="note-content">Isi materi</Label>
            <Textarea id="note-content" name="content" rows={10} required />
            <p className="text-xs text-subtle">
              Ditulis biasa. Penanda Markdown seperti # dan * boleh dipakai.
            </p>
            <FieldError messages={state.fieldErrors?.["content"]} />
          </div>

          <KindField idPrefix="note" />
          <VisibilityField idPrefix="note" />
          <TargetNote />
        </div>
      )}
    </ActionForm>
  );
}

export function EditMaterialForm({ material }: { material: MaterialView }) {
  return (
    <ActionForm action={updateMaterialAction} submitLabel="Simpan perubahan">
      {(state) => (
        <div className="flex flex-col gap-4">
          <input type="hidden" name="id" value={material.id} />

          <div className={fieldClass}>
            <Label htmlFor="edit-title">Judul</Label>
            <Input
              id="edit-title"
              name="title"
              defaultValue={material.title}
              required
            />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>

          <div className={fieldClass}>
            <Label htmlFor="edit-description">Keterangan (opsional)</Label>
            <Input
              id="edit-description"
              name="description"
              defaultValue={material.description ?? ""}
            />
            <FieldError messages={state.fieldErrors?.["description"]} />
          </div>

          <KindField
            idPrefix="edit"
            defaultValue={material.materialKind ?? "reading"}
          />
          <div className={fieldClass}>
            <Label htmlFor="edit-visibility">Terlihat oleh</Label>
            <select
              id="edit-visibility"
              name="visibility"
              className={selectClass}
              defaultValue={material.visibility}
            >
              <option value="student">Mahasiswa</option>
              <option value="lecturer">Hanya dosen</option>
            </select>
          </div>
        </div>
      )}
    </ActionForm>
  );
}
