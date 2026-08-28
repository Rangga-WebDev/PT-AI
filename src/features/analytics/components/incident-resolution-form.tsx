/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { resolveAiIncidentAction } from "@/actions/assessment/incidents";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

const STATUS_LABEL = {
  reviewing: "Sedang ditinjau",
  resolved: "Selesai ditangani",
  dismissed: "Tidak berdasar",
} as const;

export function IncidentResolutionForm({ incidentId }: { incidentId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<keyof typeof STATUS_LABEL>("resolved");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await resolveAiIncidentAction({
        incidentId,
        status,
        resolutionNote: note,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setNote("");
      router.refresh();
    });
  }

  return (
    <div data-slot="incident-resolution" className="flex flex-col gap-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`incident-status-${incidentId}`}>Status</Label>
        <select
          id={`incident-status-${incidentId}`}
          className={selectClass}
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as keyof typeof STATUS_LABEL)
          }
        >
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <Label htmlFor={`incident-note-${incidentId}`}>
        Catatan penyelesaian
      </Label>
      <Textarea
        id={`incident-note-${incidentId}`}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={3}
        placeholder="Minimal 10 karakter. Catatan ini terbaca pelapor."
      />

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button
          data-slot="submit-incident"
          size="sm"
          onClick={submit}
          disabled={note.trim().length < 10 || isPending}
        >
          {isPending ? "Menyimpan…" : "Simpan penanganan"}
        </Button>
      </div>
    </div>
  );
}
