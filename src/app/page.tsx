/** @format */

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24">
      <p className="rounded-full border border-border px-4 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        PHASE 3 — Prototipe visual
      </p>
      <h1 className="max-w-2xl text-center font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
        PT-AI Learning Management System
      </h1>
      <p className="max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
        Sistem manajemen pembelajaran terprogram dengan integrasi AI untuk
        meningkatkan kemampuan berpikir kritis mahasiswa dalam Pendidikan
        Kewarganegaraan.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/login"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Halaman masuk →
        </Link>
        <Link
          href="/app"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Prototipe aplikasi →
        </Link>
        <Link
          href="/design-system"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Galeri design system →
        </Link>
      </div>
      <p className="font-mono text-sm text-muted-foreground">
        Antarmuka lengkap sedang dibangun bertahap — lihat docs/PROGRESS.md
      </p>
    </main>
  );
}
