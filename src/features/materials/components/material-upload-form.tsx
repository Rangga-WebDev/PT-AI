/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MATERIAL_KINDS,
  MATERIAL_KIND_LABEL,
  MATERIAL_MIME_ALLOWLIST,
} from "@/lib/validation/materials";

import { fieldClass, selectClass, TargetNote, VisibilityField } from "./fields";

const ACCEPT = MATERIAL_MIME_ALLOWLIST.join(",");

export interface UploadResult {
  resourceId: string;
  extractionStatus: string;
}

interface MaterialUploadFormProps {
  classId: string;
  /** Dibatasi ketika formulir dipakai untuk dokumen awal pembelajaran. */
  kinds?: readonly (typeof MATERIAL_KINDS)[number][];
  defaultKind?: (typeof MATERIAL_KINDS)[number];
  kindLabel?: string;
  submitLabel: string;
  onUploaded: (result: UploadResult) => void;
}

/**
 * Unggahan tidak lewat Server Action: batas body-nya sengaja tetap ketat.
 * Berkas dikirim ke Route Handler khusus, lalu daftar disegarkan dari server.
 */
export function MaterialUploadForm({
  classId,
  kinds = MATERIAL_KINDS,
  defaultKind,
  kindLabel = "Jenis bahan",
  submitLabel,
  onUploaded,
}: MaterialUploadFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/materials/upload", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });

      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
        resourceId?: string;
        extractionStatus?: string;
      };

      if (!response.ok || !payload.ok || !payload.resourceId) {
        setError(payload.error ?? "Berkas gagal diunggah.");
        return;
      }

      onUploaded({
        resourceId: payload.resourceId,
        extractionStatus: payload.extractionStatus ?? "pending",
      });
      router.refresh();
    } catch {
      setError("Berkas gagal diunggah. Periksa koneksi lalu coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <input type="hidden" name="classId" value={classId} />

      <div className={fieldClass}>
        <Label htmlFor="upload-title">Judul</Label>
        <Input id="upload-title" name="title" required />
      </div>

      <div className={fieldClass}>
        <Label htmlFor="upload-file">Berkas</Label>
        <Input
          id="upload-file"
          name="file"
          type="file"
          accept={ACCEPT}
          required
          className="h-auto py-2 file:mr-3 file:rounded-md file:border-0 file:bg-surface-active file:px-3 file:py-1.5 file:text-sm file:text-foreground"
        />
        <p className="text-xs text-subtle">
          PDF, Word, PowerPoint, Excel, teks, atau Markdown. Maksimal 25 MB.
        </p>
      </div>

      <div className={fieldClass}>
        <Label htmlFor="upload-kind">{kindLabel}</Label>
        <select
          id="upload-kind"
          name="materialKind"
          className={selectClass}
          defaultValue={defaultKind ?? kinds[0]}
        >
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {MATERIAL_KIND_LABEL[kind]}
            </option>
          ))}
        </select>
      </div>

      <VisibilityField idPrefix="upload" />
      <TargetNote />

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Mengunggah…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
