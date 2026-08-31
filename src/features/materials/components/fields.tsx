/** @format */

"use client";

import { Label } from "@/components/ui/label";
import { MATERIAL_VISIBILITIES } from "@/lib/validation/materials";
import { MATERIAL_VISIBILITY_LABEL } from "@/lib/materials/labels";

export const fieldClass = "flex flex-col gap-2";

export const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function VisibilityField({ idPrefix }: { idPrefix: string }) {
  return (
    <div className={fieldClass}>
      <Label htmlFor={`${idPrefix}-visibility`}>Terlihat oleh</Label>
      <select
        id={`${idPrefix}-visibility`}
        name="visibility"
        className={selectClass}
        defaultValue="student"
      >
        {MATERIAL_VISIBILITIES.map((visibility) => (
          <option key={visibility} value={visibility}>
            {MATERIAL_VISIBILITY_LABEL[visibility]}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Target ditampilkan sebagai keterangan, bukan pilihan: lapisan aplikasi baru
 * mendukung bahan tingkat kelas. Menyediakan pilihan yang belum didukung akan
 * menjanjikan sesuatu yang gagal saat disimpan.
 */
export function TargetNote() {
  return (
    <p className="text-xs text-subtle">
      Target: <span className="text-muted-foreground">Kelas</span> — terlihat di
      seluruh kelas ini. Bahan yang melekat pada modul atau unit tertentu
      dikelola lewat perancang materi.
    </p>
  );
}
