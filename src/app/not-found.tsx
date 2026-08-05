/** @format */

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
        404
      </p>
      <h1 className="font-heading text-2xl font-semibold">
        Halaman tidak ditemukan
      </h1>
      <p className="max-w-md text-muted-foreground">
        Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Kembali ke beranda
      </Link>
    </main>
  );
}
