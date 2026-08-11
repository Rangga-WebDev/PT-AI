/** @format */

import { ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

/** Batas peran AI wajib tampil di setiap tempat AI muncul (LOCK-PED-005/006). */
export function AIBoundaryNotice({
  className,
}: {
  className?: string | undefined;
}) {
  return (
    <div
      role="note"
      data-slot="ai-boundary-notice"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-ai/35 bg-ai/[0.08] px-4 py-3",
        className,
      )}
    >
      <ShieldAlert
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-ai"
      />
      <div className="text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">Batas peran AI</p>
        <p>
          AI di sini adalah mitra berpikir sekaligus objek yang harus Anda
          verifikasi. AI tidak menulis jawaban akhir, tidak menentukan nilai,
          dan tidak menggantikan keputusan dosen. Periksa setiap saran terhadap
          sumber sebelum Anda terima.
        </p>
      </div>
    </div>
  );
}
