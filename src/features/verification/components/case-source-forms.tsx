/** @format */

"use client";

import {
  attachSourceToCaseAction,
  createCaseClaimAction,
} from "@/actions/sources/curation";
import {
  ActionForm,
  FieldError,
} from "@/features/administration/components/action-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function AttachSourceForm({
  caseId,
  sources,
}: {
  caseId: string;
  sources: { id: string; label: string }[];
}) {
  return (
    <ActionForm action={attachSourceToCaseAction} submitLabel="Lampirkan">
      {(state) => (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <input type="hidden" name="caseId" value={caseId} />
          <div className="flex flex-col gap-2">
            <Label htmlFor="attach-source">Sumber</Label>
            <select
              id="attach-source"
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
            <Label htmlFor="attach-required">Status</Label>
            <select
              id="attach-required"
              name="isRequired"
              defaultValue="true"
              className={selectClass}
            >
              <option value="true">Wajib dibaca</option>
              <option value="false">Opsional</option>
            </select>
          </div>
        </div>
      )}
    </ActionForm>
  );
}

export function CreateCaseClaimForm({ caseId }: { caseId: string }) {
  return (
    <ActionForm action={createCaseClaimAction} submitLabel="Tambah klaim">
      {(state) => (
        <div className="flex flex-col gap-2">
          <input type="hidden" name="caseId" value={caseId} />
          <Label htmlFor="claim-text">Klaim dari kasus</Label>
          <Input
            id="claim-text"
            name="text"
            placeholder="Proses konsultasi publik telah memenuhi ketentuan formal."
            required
          />
          <FieldError messages={state.fieldErrors?.["text"]} />
          <p className="text-xs text-subtle">
            Klaim ini yang akan ditautkan mahasiswa ke bukti pada tahap
            verifikasi.
          </p>
        </div>
      )}
    </ActionForm>
  );
}
