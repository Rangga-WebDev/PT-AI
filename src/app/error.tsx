/** @format */

"use client";

// error.tsx wajib berupa Client Component sesuai kontrak Next.js App Router.

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Detail error hanya dicatat ke console/log server — tidak pernah
    // ditampilkan ke pengguna (SECURITY: tanpa stack trace di UI).
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
        Kesalahan
      </p>
      <h1 className="font-heading text-2xl font-semibold">
        Terjadi kesalahan yang tidak terduga
      </h1>
      <p className="max-w-md text-muted-foreground">
        Maaf, permintaan Anda tidak dapat diproses. Silakan coba lagi. Jika
        masalah berlanjut, hubungi administrator.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">
          Kode referensi: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Coba lagi
      </button>
    </main>
  );
}
