/** @format */

"use client";

import { Check, Copy, Search, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decideEnrollmentAction } from "@/actions/courses/enrollment-requests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  REQUEST_STATUS_LABEL,
  type ClassEnrollmentRequest,
} from "@/lib/classes/enrollment-requests";

function RequestRow({
  request,
  classId,
  open,
}: {
  request: ClassEnrollmentRequest;
  classId: string;
  open: boolean;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [state, action, pending] = useActionState(decideEnrollmentAction, {});
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);
  const error = state.error ?? state.fieldErrors?.note?.[0];
  const disabled = pending || Boolean(state.ok) || !open;

  return (
    <li className="flex min-w-0 flex-col gap-3 py-4">
      <form action={action} className="flex min-w-0 flex-col gap-3">
        <input type="hidden" name="classId" value={classId} />
        <input type="hidden" name="requestId" value={request.id} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="wrap-break-word text-sm font-medium">
              {request.full_name}
            </p>
            <p className="break-all font-mono text-sm text-muted-foreground">
              {request.identifier}
            </p>
          </div>
          {request.status === "pending" ? (
            <div className="flex shrink-0 gap-2">
              <Button
                type="submit"
                size="sm"
                variant="outline"
                name="decision"
                value="approve"
                disabled={disabled}
                aria-label={`Setujui ${request.identifier}`}
              >
                <Check aria-hidden="true" />
                Setujui
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                aria-label={`${rejecting ? "Batal menolak" : "Tolak"} ${request.identifier}`}
                onClick={() => setRejecting(!rejecting)}
              >
                <X aria-hidden="true" />
                {rejecting ? "Batal" : "Tolak"}
              </Button>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">
              {REQUEST_STATUS_LABEL[request.status] ?? request.status}
            </span>
          )}
        </div>
        {rejecting && request.status === "pending" ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Label htmlFor={`note-${request.id}`}>Alasan penolakan</Label>
              <Input
                id={`note-${request.id}`}
                name="note"
                value={note}
                maxLength={500}
                disabled={disabled}
                onChange={(event) => setNote(event.target.value)}
                aria-invalid={Boolean(error)}
              />
            </div>
            <Button
              type="submit"
              name="decision"
              value="reject"
              variant="outline"
              size="sm"
              disabled={disabled || note.trim().length < 5}
            >
              Kirim penolakan
            </Button>
          </div>
        ) : null}
        {request.decision_note ? (
          <p className="wrap-break-word text-sm text-muted-foreground">
            {request.decision_note}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {state.ok ? (
          <p role="status" className="text-sm text-success">
            {state.message}
          </p>
        ) : null}
      </form>
    </li>
  );
}

export function EnrollmentInbox({
  classId,
  joinCode,
  requests,
  open,
}: {
  classId: string;
  joinCode: string;
  requests: ClassEnrollmentRequest[];
  open: boolean;
}) {
  const [query, setQuery] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const filtered = requests.filter(
    (request) =>
      (showHistory || request.status === "pending") &&
      `${request.identifier} ${request.full_name}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const pendingCount = requests.filter(
    (request) => request.status === "pending",
  ).length;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopyStatus("Kode disalin.");
    } catch {
      setCopyStatus("Kode tidak dapat disalin otomatis.");
    }
  }

  return (
    <section
      aria-labelledby="enrollment-inbox-heading"
      className="flex min-w-0 flex-col gap-4 border-b border-border pb-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3
          id="enrollment-inbox-heading"
          className="font-heading text-h4 font-semibold"
        >
          Pengajuan masuk ({pendingCount})
        </h3>
        <div className="flex min-w-0 items-center gap-2">
          <Label htmlFor="class-join-code" className="shrink-0">
            Kode gabung
          </Label>
          <Input
            id="class-join-code"
            readOnly
            value={joinCode}
            className="w-40 min-w-0 font-mono"
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Salin kode gabung"
            aria-label="Salin kode gabung"
            onClick={copyCode}
          >
            <Copy aria-hidden="true" />
          </Button>
        </div>
      </div>
      {!open ? (
        <p role="status" className="text-sm text-muted-foreground">
          Pendaftaran kelas belum dibuka. Status kelas masih draf atau sudah
          diarsipkan.
        </p>
      ) : null}
      {copyStatus ? (
        <p role="status" className="text-sm text-muted-foreground">
          {copyStatus}
        </p>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="group"
          aria-label="Tampilan pengajuan"
          className="flex gap-2"
        >
          <Button
            type="button"
            size="sm"
            variant={showHistory ? "outline" : "primary"}
            aria-pressed={!showHistory}
            onClick={() => setShowHistory(false)}
          >
            Menunggu
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showHistory ? "primary" : "outline"}
            aria-pressed={showHistory}
            onClick={() => setShowHistory(true)}
          >
            Semua
          </Button>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle"
          />
          <Input
            aria-label="Cari pengajuan berdasarkan NIM atau nama"
            placeholder="Cari NIM atau nama"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Tidak ada pengajuan yang sesuai.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((request) => (
            <RequestRow
              key={request.id}
              request={request}
              classId={classId}
              open={open}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
