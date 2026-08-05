/** @format */

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24">
      <p className="rounded-full border border-border px-4 py-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        PHASE 1 — Fondasi
      </p>
      <h1 className="max-w-2xl text-center font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
        PT-AI Learning Management System
      </h1>
      <p className="max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
        Sistem manajemen pembelajaran terprogram dengan integrasi AI untuk
        meningkatkan kemampuan berpikir kritis mahasiswa dalam Pendidikan
        Kewarganegaraan.
      </p>
      <p className="font-mono text-sm text-muted-foreground">
        Antarmuka lengkap sedang dibangun bertahap — lihat docs/PROGRESS.md
      </p>
    </main>
  );
}
