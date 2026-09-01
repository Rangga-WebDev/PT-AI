/** @format */

"use client";

import { generateQuickSetupDraftAction } from "@/actions/courses/quick-setup";
import {
  ActionForm,
  FieldError,
} from "@/features/administration/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/shared/states/empty-state";
import {
  DOCUMENT_TYPE_LABEL,
  QUICK_SETUP_DOCUMENT_TYPES,
} from "@/lib/ai/quick-setup-schema";

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export interface ReadableDocument {
  id: string;
  title: string;
  extractedAt: string | null;
}

export function QuickSetupLauncher({
  classId,
  documents,
}: {
  classId: string;
  documents: ReadableDocument[];
}) {
  if (documents.length === 0) {
    return (
      <EmptyState
        title="Belum ada dokumen yang terbaca"
        description="Quick Setup hanya dapat memakai dokumen yang isinya sudah berhasil dibaca. Unggah RPS atau CPMK dari halaman Materi, lalu kembali ke sini."
      />
    );
  }

  return (
    <ActionForm
      action={generateQuickSetupDraftAction}
      submitLabel="Susun draf dengan AI"
      submitVariant="ai"
      className="max-w-2xl"
    >
      {(state) => (
        <div className="flex flex-col gap-4">
          <input type="hidden" name="classId" value={classId} />

          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-setup-resource">Dokumen sumber</Label>
            <select
              id="quick-setup-resource"
              name="resourceId"
              className={selectClass}
              required
            >
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
            <p className="text-xs text-subtle">
              Hanya dokumen yang isinya sudah terbaca yang muncul di sini.
            </p>
            <FieldError messages={state.fieldErrors?.["resourceId"]} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-setup-type">Jenis dokumen</Label>
            <select
              id="quick-setup-type"
              name="documentType"
              className={selectClass}
              defaultValue="rps"
            >
              {QUICK_SETUP_DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DOCUMENT_TYPE_LABEL[type]}
                </option>
              ))}
            </select>
            <FieldError messages={state.fieldErrors?.["documentType"]} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quick-setup-instruction">
              Permintaan tambahan (opsional)
            </Label>
            <Input
              id="quick-setup-instruction"
              name="instruction"
              placeholder="Misalnya: fokuskan pada pertemuan paruh pertama."
            />
            <FieldError messages={state.fieldErrors?.["instruction"]} />
          </div>

          <p className="max-w-prose text-xs text-subtle">
            AI hanya menstrukturkan isi dokumen dan memberi saran. Hasilnya
            berstatus draf dan tidak diterapkan ke kelas sampai Anda
            memutuskannya.
          </p>
        </div>
      )}
    </ActionForm>
  );
}
