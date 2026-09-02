/** @format */

"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  applyQuickSetupDraftAction,
  previewQuickSetupApplyAction,
} from "@/actions/courses/quick-setup";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ApplyPlan } from "@/lib/ai/apply-plan";
import type { FormState } from "@/actions/administration/accounts";

function PlanSummary({ plan }: { plan: ApplyPlan }) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-foreground">
        {plan.create.length + plan.skip.length} pertemuan ditemukan pada draf.{" "}
        <span className="text-muted-foreground">
          {plan.create.length} akan dibuat
          {plan.skip.length > 0
            ? `, ${plan.skip.length} dilewati karena nomornya sudah ada.`
            : "."}
        </span>
      </p>

      {plan.create.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-xs tracking-widest text-subtle uppercase">
            Akan dibuat
          </h3>
          <ul className="flex flex-col">
            {plan.create.map((item) => (
              <li
                key={item.sequence}
                className="flex gap-3 border-b border-border/60 py-1.5 text-sm last:border-b-0"
              >
                <span className="w-24 shrink-0 font-mono text-xs text-subtle">
                  Pertemuan {item.sequence}
                </span>
                <span className="text-foreground">{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.skip.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="font-mono text-xs tracking-widest text-subtle uppercase">
            Sudah ada, dipertahankan
          </h3>
          <ul className="flex flex-col">
            {plan.skip.map((item) => (
              <li
                key={item.sequence}
                className="flex flex-col gap-0.5 border-b border-border/60 py-2 text-sm last:border-b-0"
              >
                <span className="font-mono text-xs text-subtle">
                  Pertemuan {item.sequence}
                </span>
                <span className="text-foreground">
                  Dipertahankan: {item.existingTitle}
                </span>
                <span className="text-xs text-subtle">
                  Usulan draf: {item.draftTitle}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.ptaiCandidates.length > 0 ? (
        <div className="flex flex-col gap-2 border-l-2 border-ai/40 pl-4">
          <StatusBadge status="ai">Kandidat PT-AI</StatusBadge>
          <p className="text-xs text-subtle">
            Ditandai sebagai usulan saja. Tidak ada unit, kasus, maupun
            aktivitas yang dibuat dari sini.
          </p>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {plan.ptaiCandidates.map((item) => (
              <li key={item.sequence}>
                — Pertemuan {item.sequence}: {item.title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.unsupported.length > 0 ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-mono text-xs tracking-widest text-subtle uppercase">
            Belum dapat diterapkan
          </h3>
          <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            {plan.unsupported.map((item) => (
              <li key={item.section}>
                <span className="text-foreground">{item.section}</span> —{" "}
                {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ApplyPanel({
  draftId,
  classId,
}: {
  draftId: string;
  classId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<ApplyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [state, formAction] = useActionState<FormState, FormData>(
    applyQuickSetupDraftAction,
    {},
  );

  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  async function openPreview() {
    setOpen(true);
    setLoading(true);
    setError(null);

    const result = await previewQuickSetupApplyAction({ draftId, classId });
    setLoading(false);

    if (result.ok) setPlan(result.plan);
    else setError(result.error);
  }

  if (state.ok) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-border p-5">
        <p className="text-sm text-foreground">{state.message}</p>
        <p className="text-xs text-subtle">
          Pertemuan dibuat sebagai draf. Tidak ada yang diterbitkan kepada
          mahasiswa.
        </p>
        <div>
          <Link
            href={`/app/lecturer/classes/${classId}`}
            className={buttonVariants({ size: "sm" })}
          >
            Lihat kelas
          </Link>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={openPreview}>
        Terapkan ke kelas
      </Button>
    );
  }

  return (
    <section
      id="apply-panel"
      aria-labelledby="apply-panel-title"
      className="flex flex-col gap-5 rounded-xl border border-border p-5"
    >
      <h2
        id="apply-panel-title"
        className="font-heading text-h3 font-semibold text-foreground"
      >
        Terapkan ke kelas
      </h2>

      {loading ? (
        <p className="text-sm text-subtle">Menyusun pratinjau…</p>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      {plan ? <PlanSummary plan={plan} /> : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Batal
        </Button>
        {plan && plan.create.length > 0 ? (
          <form action={formAction}>
            <input type="hidden" name="draftId" value={draftId} />
            <input type="hidden" name="classId" value={classId} />
            <Button type="submit" size="sm">
              Terapkan {plan.create.length} pertemuan
            </Button>
          </form>
        ) : null}
      </div>
    </section>
  );
}
