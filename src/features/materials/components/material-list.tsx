/** @format */

"use client";

import { StatusBadge } from "@/components/shared/status-badge";
import {
  formatMaterialDate,
  formatMaterialSize,
  materialExtractionNote,
  materialFormatLabel,
  materialStatusTone,
  MATERIAL_STATUS_LABEL,
  MATERIAL_VISIBILITY_LABEL,
} from "@/lib/materials/labels";
import type { MaterialView } from "@/lib/materials/types";

import { MaterialActions } from "./material-actions";

interface MaterialListProps {
  materials: MaterialView[];
  onEdit: (material: MaterialView) => void;
  onError: (message: string) => void;
}

function ExtractionNote({ material }: { material: MaterialView }) {
  const note = materialExtractionNote(material);
  if (!note) return null;

  return (
    <StatusBadge status={note.tone} withDot={false}>
      {note.label}
    </StatusBadge>
  );
}

export function MaterialList({
  materials,
  onEdit,
  onError,
}: MaterialListProps) {
  return (
    <>
      {/* Tabel penuh hanya masuk akal ketika lebarnya cukup untuk tujuh kolom. */}
      <table className="hidden w-full border-collapse text-sm lg:table">
        <thead>
          <tr className="border-b border-border text-left">
            {[
              "Judul",
              "Jenis",
              "Target",
              "Status",
              "Terlihat oleh",
              "Tanggal",
            ].map((heading) => (
              <th
                key={heading}
                scope="col"
                className="py-2 pr-4 font-mono text-xs font-medium tracking-wide text-subtle uppercase"
              >
                {heading}
              </th>
            ))}
            <th scope="col" className="py-2 text-right">
              <span className="sr-only">Aksi</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material) => (
            <tr key={material.id} className="border-b border-border/60">
              <td className="py-3 pr-4 align-top">
                <span className="font-medium text-foreground">
                  {material.title}
                </span>
                {material.description ? (
                  <span className="mt-0.5 block max-w-md text-xs text-subtle">
                    {material.description}
                  </span>
                ) : null}
              </td>
              <td className="py-3 pr-4 align-top text-muted-foreground">
                {materialFormatLabel(material)}
                {formatMaterialSize(material.sizeBytes) ? (
                  <span className="block font-mono text-xs text-subtle">
                    {formatMaterialSize(material.sizeBytes)}
                  </span>
                ) : null}
              </td>
              <td className="py-3 pr-4 align-top text-muted-foreground">
                Kelas
              </td>
              <td className="py-3 pr-4 align-top">
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={materialStatusTone(material.status)}>
                    {MATERIAL_STATUS_LABEL[material.status]}
                  </StatusBadge>
                  <ExtractionNote material={material} />
                </div>
              </td>
              <td className="py-3 pr-4 align-top text-muted-foreground">
                {MATERIAL_VISIBILITY_LABEL[material.visibility]}
              </td>
              <td className="py-3 pr-4 align-top font-mono text-xs text-subtle">
                {formatMaterialDate(material.createdAt)}
              </td>
              <td className="py-3 align-top">
                <div className="flex justify-end">
                  <MaterialActions
                    material={material}
                    onEdit={onEdit}
                    onError={onError}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Di layar sempit kolom dilipat menjadi baris keterangan, bukan digeser. */}
      <ul className="flex flex-col gap-3 lg:hidden">
        {materials.map((material) => (
          <li
            key={material.id}
            className="flex flex-col gap-3 border-b border-border pb-4 last:border-b-0"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">
                {material.title}
              </span>
              <span className="font-mono text-xs text-subtle">
                {materialFormatLabel(material)} ·{" "}
                {MATERIAL_VISIBILITY_LABEL[material.visibility]} ·{" "}
                {formatMaterialDate(material.createdAt)}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={materialStatusTone(material.status)}>
                {MATERIAL_STATUS_LABEL[material.status]}
              </StatusBadge>
              <ExtractionNote material={material} />
            </div>
            <MaterialActions
              material={material}
              onEdit={onEdit}
              onError={onError}
            />
          </li>
        ))}
      </ul>
    </>
  );
}
