/** @format */

"use client";

import { useState } from "react";

import { StatusBadge } from "@/components/shared/status-badge";
import { MATERIAL_EXTRACTION_LABEL } from "@/lib/materials/labels";

import { MaterialUploadForm, type UploadResult } from "./material-upload-form";

/** Dokumen awal pembelajaran: yang biasanya dipegang dosen sebelum menyusun kelas. */
const COURSE_DOCUMENT_KINDS = [
  "rps",
  "syllabus",
  "module",
  "reading",
  "other",
] as const;

function ReadinessState({ result }: { result: UploadResult }) {
  const ready = result.extractionStatus === "succeeded";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-sm text-foreground">Dokumen berhasil diunggah.</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Status pembacaan
          </span>
          <StatusBadge status={ready ? "published" : "evidence"}>
            {ready
              ? MATERIAL_EXTRACTION_LABEL.succeeded
              : MATERIAL_EXTRACTION_LABEL.pending}
          </StatusBadge>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          Nantinya dokumen ini dapat dipakai untuk:
        </p>
        <ul className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
          <li>— menyusun struktur pertemuan</li>
          <li>— membuat draf materi</li>
          <li>— membuat aktivitas PT-AI</li>
        </ul>
        {!ready ? (
          <p className="mt-3 text-xs text-subtle">
            Teks dokumen ini belum terbaca, sehingga belum dapat dijadikan
            rujukan. Berkasnya tetap tersimpan dan dapat diunduh.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function CourseDocumentPanel({ classId }: { classId: string }) {
  const [result, setResult] = useState<UploadResult | null>(null);

  if (result) return <ReadinessState result={result} />;

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        Unggah RPS, CPMK, atau bahan ajar yang sudah Anda miliki. Dokumennya
        disimpan sebagai bahan kelas seperti biasa.
      </p>
      <MaterialUploadForm
        classId={classId}
        kinds={COURSE_DOCUMENT_KINDS}
        kindLabel="Jenis dokumen"
        submitLabel="Unggah dokumen"
        onUploaded={setResult}
      />
    </div>
  );
}
