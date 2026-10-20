/** @format */

"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { PasswordResetResult } from "@/lib/auth/password-reset";

/**
 * Pengaturan ulang oleh dosen atau administrator. Kata sandi sementara hanya
 * ditampilkan sekali; pemiliknya wajib menggantinya saat masuk.
 */
export function TemporaryPasswordReset({
  action,
  subjectName,
}: {
  action: () => Promise<PasswordResetResult>;
  subjectName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<PasswordResetResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function reset() {
    startTransition(async () => {
      setResult(await action());
      setConfirming(false);
    });
  }

  async function copy(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (result?.temporaryPassword) {
    const password = result.temporaryPassword;
    return (
      <div role="status" className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">
          Kata sandi sementara {subjectName}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md border border-border px-2 py-1 font-mono text-sm tracking-wide select-all">
            {password}
          </code>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => void copy(password)}
          >
            {copied ? "Tersalin" : "Salin"}
          </Button>
        </div>
        <span className="max-w-xs text-xs text-subtle">
          Hanya ditampilkan sekali. Pengguna wajib membuat kata sandi baru
          setelah masuk.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Atur ulang kata sandi {subjectName}?
          </span>
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={reset}
          >
            {pending ? "Memproses…" : "Ya, atur ulang"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirming(false)}
          >
            Batal
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setResult(null);
            setConfirming(true);
          }}
        >
          Atur ulang kata sandi
        </Button>
      )}
      {result?.error ? (
        <span className="text-xs text-destructive">{result.error}</span>
      ) : null}
    </div>
  );
}
