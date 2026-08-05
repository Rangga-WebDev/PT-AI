/** @format */

import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main
      aria-busy="true"
      className="flex flex-1 flex-col items-center justify-center gap-3 py-24"
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-6 animate-spin text-muted-foreground"
      />
      <p className="text-sm text-muted-foreground">Memuat…</p>
    </main>
  );
}
