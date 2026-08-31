/** @format */

"use client";

import { useActionState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  deleteMaterialAction,
  requestMaterialDownloadAction,
  setMaterialPublicationAction,
} from "@/actions/courses/materials";
import type { FormState } from "@/actions/administration/accounts";
import type { MaterialView } from "@/lib/materials/types";

function PublicationButton({
  material,
  next,
  label,
}: {
  material: MaterialView;
  next: "draft" | "published";
  label: string;
}) {
  const [, formAction] = useActionState<FormState, FormData>(
    setMaterialPublicationAction,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={material.id} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" size="sm" variant="outline">
        {label}
      </Button>
    </form>
  );
}

function RevokeButton({ material }: { material: MaterialView }) {
  const [, formAction] = useActionState<FormState, FormData>(
    deleteMaterialAction,
    {},
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={material.id} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="hover:text-destructive"
      >
        Cabut
      </Button>
    </form>
  );
}

/**
 * Tautan unduhan tidak pernah ada di dokumen. Ia diminta saat dosen menekan
 * tombol, berumur pendek, dan dibuka lewat tab baru sehingga kunci objek tidak
 * pernah singgah di riwayat halaman ini.
 */
function ViewButton({
  material,
  onError,
}: {
  material: MaterialView;
  onError: (message: string) => void;
}) {
  if (material.url) {
    return (
      <a
        href={material.url}
        target="_blank"
        rel="noreferrer noopener"
        className={buttonVariants({ variant: "ghost", size: "sm" })}
      >
        Lihat
      </a>
    );
  }

  if (!material.hasFile) return null;

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={async () => {
        const result = await requestMaterialDownloadAction(material.id);
        if (!result.ok) {
          onError(result.error);
          return;
        }
        window.open(result.download.url, "_blank", "noopener,noreferrer");
      }}
    >
      Lihat
    </Button>
  );
}

export function MaterialActions({
  material,
  onEdit,
  onError,
}: {
  material: MaterialView;
  onEdit: (material: MaterialView) => void;
  onError: (message: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ViewButton material={material} onError={onError} />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onEdit(material)}
      >
        Ubah
      </Button>
      {material.status === "published" ? (
        <PublicationButton material={material} next="draft" label="Tarik" />
      ) : (
        <PublicationButton
          material={material}
          next="published"
          label="Terbitkan"
        />
      )}
      <RevokeButton material={material} />
    </div>
  );
}
