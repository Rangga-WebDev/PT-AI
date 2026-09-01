/** @format */

"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/shared/states/empty-state";
import { Button, buttonVariants } from "@/components/ui/button";
import type { MaterialView } from "@/lib/materials/types";

import { CourseDocumentPanel } from "./course-document-panel";
import {
  EditMaterialForm,
  LinkMaterialForm,
  NoteMaterialForm,
} from "./material-forms";
import { MaterialList } from "./material-list";
import { MaterialUploadForm } from "./material-upload-form";

type Panel =
  | { kind: "none" }
  | { kind: "choose" }
  | { kind: "upload" }
  | { kind: "link" }
  | { kind: "note" }
  | { kind: "document" }
  | { kind: "edit"; material: MaterialView };

const PANEL_TITLE: Record<Exclude<Panel["kind"], "none" | "edit">, string> = {
  choose: "Tambah materi",
  upload: "Unggah berkas",
  link: "Tambah tautan",
  note: "Tulis materi",
  document: "Unggah RPS / CPMK",
};

const ADD_OPTIONS = [
  {
    kind: "upload" as const,
    label: "Unggah berkas",
    hint: "PDF, Word, PowerPoint, Excel, atau teks.",
  },
  {
    kind: "link" as const,
    label: "Tambah tautan",
    hint: "Artikel, video, atau sumber di luar aplikasi.",
  },
  {
    kind: "note" as const,
    label: "Tulis materi",
    hint: "Ketik langsung tanpa menyiapkan berkas.",
  },
];

export function MaterialsWorkspace({
  classId,
  materials,
}: {
  classId: string;
  materials: MaterialView[];
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>({ kind: "none" });
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Panel yang terbuka tanpa memindahkan fokus membuat pengguna papan tik
  // harus menelusuri kembali seluruh halaman untuk menemukannya.
  useEffect(() => {
    if (panel.kind !== "none") headingRef.current?.focus();
  }, [panel]);

  function close() {
    setPanel({ kind: "none" });
  }

  const panelTitle =
    panel.kind === "edit"
      ? `Ubah ${panel.material.title}`
      : panel.kind === "none"
        ? ""
        : PANEL_TITLE[panel.kind];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() =>
            setPanel(
              panel.kind === "none" ? { kind: "choose" } : { kind: "none" },
            )
          }
          aria-expanded={panel.kind !== "none"}
          aria-controls="materials-panel"
        >
          + Tambah materi
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setPanel({ kind: "document" })}
        >
          Unggah RPS / CPMK
        </Button>
        <Link
          href={`/app/lecturer/classes/${classId}/quick-setup`}
          className={buttonVariants({ variant: "ai" })}
        >
          <Sparkles aria-hidden="true" />
          Buat dengan AI
        </Link>
      </div>

      {panel.kind !== "none" ? (
        <section
          id="materials-panel"
          aria-labelledby="materials-panel-title"
          className="flex max-w-2xl flex-col gap-4 rounded-xl border border-border p-5"
        >
          <div className="flex items-start justify-between gap-4">
            <h2
              id="materials-panel-title"
              ref={headingRef}
              tabIndex={-1}
              className="font-heading text-h3 font-semibold text-foreground outline-none"
            >
              {panelTitle}
            </h2>
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              Tutup
            </Button>
          </div>

          {panel.kind === "choose" ? (
            <ul className="flex flex-col">
              {ADD_OPTIONS.map((option) => (
                <li
                  key={option.kind}
                  className="border-b border-border last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => setPanel({ kind: option.kind })}
                    className="flex w-full flex-col gap-0.5 py-3 text-left transition-colors hover:bg-surface-active focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:outline-none"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {option.label}
                    </span>
                    <span className="text-xs text-subtle">{option.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {panel.kind === "upload" ? (
            <MaterialUploadForm
              classId={classId}
              defaultKind="reading"
              submitLabel="Unggah berkas"
              onUploaded={close}
            />
          ) : null}

          {panel.kind === "link" ? (
            <LinkMaterialForm classId={classId} />
          ) : null}
          {panel.kind === "note" ? (
            <NoteMaterialForm classId={classId} />
          ) : null}

          {panel.kind === "document" ? (
            <CourseDocumentPanel classId={classId} />
          ) : null}

          {panel.kind === "edit" ? (
            <EditMaterialForm material={panel.material} />
          ) : null}
        </section>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {materials.length === 0 ? (
        // Ajakan memulai hanya berguna selama dosen belum bertindak; setelah
        // panel terbuka ia hanya mengulang tombol yang sudah ada di atas.
        panel.kind === "none" ? (
          <EmptyState
            title="Belum ada materi"
            description="Mulai dengan mengunggah RPS, menambahkan bahan ajar, atau menulis materi sendiri."
            action={
              <Button
                type="button"
                onClick={() => setPanel({ kind: "choose" })}
              >
                + Tambah materi
              </Button>
            }
          />
        ) : null
      ) : (
        <MaterialList
          materials={materials}
          onEdit={(material) => setPanel({ kind: "edit", material })}
          onError={(message) => {
            setError(message);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
