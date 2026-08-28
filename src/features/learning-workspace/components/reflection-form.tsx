/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { submitReflectionAction } from "@/actions/learning/revisions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ReflectionView } from "@/server/repositories/revisions";

interface ReflectionFormProps {
  activityId: string;
  attemptId: string;
  latestRevisionId: string | null;
  existing: ReflectionView | null;
}

// Sembilan unsur LOCK-PED-011 sebagai field terpisah; satu kotak teks besar
// akan menghilangkan struktur metakognitif yang justru menjadi tujuannya.
const FIELDS = [
  {
    key: "initialSummary",
    label: "Apa jawaban awal Anda?",
    hint: "Ringkas pendirian Anda sebelum menerima umpan balik.",
  },
  {
    key: "feedbackSummary",
    label: "Umpan balik apa yang Anda terima?",
    hint: "Dari AI, dosen, atau teman.",
  },
  {
    key: "verifiedSourcesSummary",
    label: "Sumber apa yang Anda verifikasi?",
    hint: "Sebutkan sumber dan hasil pemeriksaannya.",
  },
  {
    key: "finalSummary",
    label: "Apa jawaban akhir Anda?",
    hint: "Pendirian Anda setelah revisi.",
  },
  {
    key: "changeReason",
    label: "Mengapa Anda mengubahnya?",
    hint: "Bukti atau argumen apa yang menggeser pendirian Anda.",
  },
  {
    key: "aiAccepted",
    label: "Saran AI mana yang Anda terima?",
    hint: "Dan atas dasar apa Anda menerimanya.",
  },
  {
    key: "aiRejected",
    label: "Saran AI mana yang Anda tolak?",
    hint: "Dan atas dasar apa Anda menolaknya.",
  },
  {
    key: "biasFound",
    label: "Bias apa yang Anda temukan?",
    hint: "Pada sumber, pada AI, atau pada diri Anda sendiri.",
  },
  {
    key: "nextStrategy",
    label: "Apa strategi Anda berikutnya?",
    hint: "Yang akan Anda lakukan berbeda pada tahap selanjutnya.",
  },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function ReflectionForm({
  activityId,
  attemptId,
  latestRevisionId,
  existing,
}: ReflectionFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<FieldKey, string>>(
    () =>
      Object.fromEntries(FIELDS.map((field) => [field.key, ""])) as Record<
        FieldKey,
        string
      >,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (existing) {
    return (
      <section
        aria-labelledby="reflection-heading"
        data-slot="reflection-saved"
        className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
      >
        <h3
          id="reflection-heading"
          className="font-heading text-h4 font-semibold"
        >
          Refleksi
        </h3>
        <p className="text-sm text-muted-foreground">
          Refleksi Anda sudah tersimpan dan tidak dapat diubah, sama seperti
          respons awal.
        </p>
        <dl className="flex flex-col gap-3">
          {FIELDS.map((field) => (
            <div key={field.key} className="flex flex-col gap-0.5">
              <dt className="text-sm font-medium">{field.label}</dt>
              <dd className="text-sm whitespace-pre-wrap text-muted-foreground">
                {existing[field.key]}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }

  const canSubmit = FIELDS.every(
    (field) => values[field.key].trim().length >= 10,
  );

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await submitReflectionAction({
        activityId,
        attemptId,
        revisionId: latestRevisionId ?? "",
        ...values,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="reflection-heading"
      data-slot="reflection-form"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-col gap-1">
        <h3
          id="reflection-heading"
          className="font-heading text-h4 font-semibold"
        >
          Refleksi
        </h3>
        <p className="text-sm text-muted-foreground">
          Sembilan pertanyaan ini wajib diisi masing-masing minimal 10 karakter.
          Refleksi tersimpan permanen dan menjadi bagian jejak belajar Anda.
        </p>
      </div>

      {FIELDS.map((field) => (
        <div key={field.key} className="flex flex-col gap-1.5">
          <Label htmlFor={`reflection-${field.key}`}>{field.label}</Label>
          <Textarea
            id={`reflection-${field.key}`}
            value={values[field.key]}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                [field.key]: event.target.value,
              }))
            }
            rows={2}
            placeholder={field.hint}
          />
        </div>
      ))}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button
          data-slot="submit-reflection"
          onClick={submit}
          disabled={!canSubmit || isPending}
        >
          {isPending ? "Menyimpan…" : "Simpan refleksi"}
        </Button>
      </div>
    </section>
  );
}
