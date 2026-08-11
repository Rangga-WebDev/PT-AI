/** @format */

import { FlaskConical } from "lucide-react";

import { cn } from "@/lib/utils";

/** Penanda wajib bahwa isi halaman adalah data contoh, bukan data nyata. */
export function MockBanner({ className }: { className?: string | undefined }) {
  return (
    <div
      role="note"
      data-slot="mock-banner"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-evidence/40 bg-evidence/10 px-4 py-3",
        className,
      )}
    >
      <FlaskConical
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-evidence"
      />
      <p className="text-sm text-foreground">
        <span className="font-mono text-xs font-semibold tracking-widest text-evidence uppercase">
          Data contoh (MOCK)
        </span>
        <br />
        Halaman ini adalah prototipe visual. Isi, angka, dan nama bersifat
        fiktif; belum terhubung ke database, autentikasi, maupun AI.
      </p>
    </div>
  );
}
