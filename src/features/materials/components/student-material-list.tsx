/** @format */

"use client";

import Link from "next/link";
import { useState } from "react";

import { requestMaterialDownloadAction } from "@/actions/courses/materials";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  formatMaterialDate,
  materialFormatLabel,
} from "@/lib/materials/labels";
import type { MaterialView } from "@/lib/materials/types";

/**
 * Yang ditampilkan hanya yang berguna bagi mahasiswa. Status penerbitan,
 * keadaan ekstraksi, checksum, dan kunci objek sengaja tidak pernah sampai ke
 * sini — mereka urusan pengelolaan, bukan urusan belajar.
 */
function OpenAction({
  material,
  classId,
  onError,
}: {
  material: MaterialView;
  classId: string;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);

  if (material.resourceType === "note") {
    return (
      <Link
        href={`/app/student/classes/${classId}/materials/${material.id}`}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Baca
      </Link>
    );
  }

  if (material.url) {
    return (
      <a
        href={material.url}
        target="_blank"
        rel="noreferrer noopener"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Buka
      </a>
    );
  }

  if (!material.hasFile) return null;

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await requestMaterialDownloadAction(material.id);
        setPending(false);

        if (!result.ok) {
          onError(result.error);
          return;
        }
        window.open(result.download.url, "_blank", "noopener,noreferrer");
      }}
    >
      {pending ? "Menyiapkan…" : "Lihat"}
    </Button>
  );
}

export function StudentMaterialList({
  classId,
  materials,
}: {
  classId: string;
  materials: MaterialView[];
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <table className="hidden w-full border-collapse text-sm md:table">
        <thead>
          <tr className="border-b border-border text-left">
            {["Judul", "Jenis", "Pertemuan", "Tanggal"].map((heading) => (
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
              </td>
              <td className="py-3 pr-4 align-top text-muted-foreground">
                Umum
              </td>
              <td className="py-3 pr-4 align-top font-mono text-xs text-subtle">
                {formatMaterialDate(material.createdAt)}
              </td>
              <td className="py-3 align-top">
                <div className="flex justify-end">
                  <OpenAction
                    material={material}
                    classId={classId}
                    onError={setError}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden">
        {materials.map((material) => (
          <li
            key={material.id}
            className="flex flex-col gap-2 border-b border-border pb-4 last:border-b-0"
          >
            <span className="font-medium text-foreground">
              {material.title}
            </span>
            <span className="font-mono text-xs text-subtle">
              {materialFormatLabel(material)} · Umum ·{" "}
              {formatMaterialDate(material.createdAt)}
            </span>
            <div>
              <OpenAction
                material={material}
                classId={classId}
                onError={setError}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
