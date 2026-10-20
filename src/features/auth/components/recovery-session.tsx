/** @format */

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { parseRecoveryFragment } from "@/lib/auth/recovery";
import { createClient } from "@/lib/supabase/client";

const UNUSABLE =
  "Tautan pengaturan ulang tidak berlaku lagi. Silakan minta tautan baru.";

/** Mengembalikan pesan galat, atau null bila sesi pemulihan berhasil dipasang. */
async function establishRecoverySession(hash: string): Promise<string | null> {
  const parsed = parseRecoveryFragment(hash);
  if (!parsed.ok) return parsed.error;

  const { error } = await createClient().auth.setSession({
    access_token: parsed.accessToken,
    refresh_token: parsed.refreshToken,
  });
  return error ? UNUSABLE : null;
}

export function RecoverySession({ next }: { next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const hash = window.location.hash;
    // Token dihapus dari bilah alamat agar tidak tersimpan di riwayat peramban.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );

    void establishRecoverySession(hash).then((message) => {
      if (message) setError(message);
      else router.replace(next);
    });
  }, [next, router]);

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
        <Link
          href="/forgot-password"
          className="text-center text-sm text-primary underline-offset-4 hover:underline"
        >
          Minta tautan baru
        </Link>
      </div>
    );
  }

  return (
    <p role="status" className="text-center text-sm text-muted-foreground">
      Memeriksa tautan…
    </p>
  );
}
