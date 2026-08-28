/** @format */

"use client";

import {
  createSourceAction,
  createSourceVersionAction,
} from "@/actions/sources/curation";
import {
  ActionForm,
  FieldError,
} from "@/features/administration/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SOURCE_TYPE_LABEL } from "@/lib/constants/verification";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function CreateSourceForm() {
  return (
    <ActionForm action={createSourceAction} submitLabel="Tambah sumber">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="source-title">Judul sumber</Label>
            <Input id="source-title" name="title" required />
            <FieldError messages={state.fieldErrors?.["title"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source-type">Jenis sumber</Label>
            <select
              id="source-type"
              name="sourceType"
              defaultValue="regulation"
              className={selectClass}
            >
              {Object.entries(SOURCE_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["sourceType"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source-published">Tanggal terbit (opsional)</Label>
            <Input id="source-published" name="publishedAt" type="date" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source-authors">Penulis (opsional)</Label>
            <Input id="source-authors" name="authors" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="source-publisher">Penerbit (opsional)</Label>
            <Input id="source-publisher" name="publisher" />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="source-url">URL (opsional)</Label>
            <Input id="source-url" name="url" type="url" />
            <FieldError messages={state.fieldErrors?.["url"]} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="source-note">Catatan kurasi (opsional)</Label>
            <Textarea id="source-note" name="curationNote" rows={2} />
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateSourceVersionForm({
  sources,
}: {
  sources: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={createSourceVersionAction} submitLabel="Tambah versi">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="version-source">Sumber</Label>
            <select
              id="version-source"
              name="sourceId"
              required
              className={selectClass}
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.label}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["sourceId"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="version-label">Label versi</Label>
            <Input
              id="version-label"
              name="versionLabel"
              placeholder="v1 — dokumen asli"
              required
            />
            <FieldError messages={state.fieldErrors?.["versionLabel"]} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="version-retrieved">Tanggal pengambilan</Label>
            <Input
              id="version-retrieved"
              name="retrievedAt"
              type="date"
              required
            />
            <FieldError messages={state.fieldErrors?.["retrievedAt"]} />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="version-content">Kutipan sumber</Label>
            <Textarea
              id="version-content"
              name="contentText"
              rows={6}
              required
            />
            <FieldError messages={state.fieldErrors?.["contentText"]} />
            <p className="text-xs text-subtle">
              Pisahkan paragraf dengan baris kosong. Kutipan inilah yang dibaca
              mahasiswa saat memverifikasi sumber.
            </p>
          </div>
        </div>
      )}
    </ActionForm>
  );
}
