/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  submitConsentAction,
  withdrawConsentAction,
} from "@/actions/research/consent";
import { Button } from "@/components/ui/button";
import type { ConsentAvailability } from "@/lib/research/consent";

interface ConsentFormProps {
  availability: ConsentAvailability;
}

export function ConsentForm({ availability }: ConsentFormProps) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(operation: () => Promise<{ ok?: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await operation();
      if (result.error) {
        setError(result.error);
        return;
      }
      setAcknowledged(false);
      router.refresh();
    });
  }

  return (
    <div data-slot="consent-form" className="flex flex-col gap-4">
      <p
        role="status"
        className="rounded-lg border border-border bg-surface-active/50 p-3 text-sm text-muted-foreground"
      >
        {availability.notice}
      </p>

      {availability.canGrant ? (
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            data-slot="consent-acknowledge"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
            className="mt-1 size-4"
          />
          <span>
            Saya sudah membaca seluruh keterangan di atas dan memahami bahwa
            keikutsertaan bersifat sukarela serta tidak memengaruhi nilai saya.
          </span>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {availability.canGrant ? (
          <>
            <Button
              data-slot="consent-grant"
              disabled={!acknowledged || isPending}
              onClick={() =>
                run(() => submitConsentAction({ decision: "granted" }))
              }
            >
              {isPending ? "Menyimpan…" : "Saya bersedia ikut serta"}
            </Button>
            <Button
              variant="outline"
              data-slot="consent-decline"
              disabled={!acknowledged || isPending}
              onClick={() =>
                run(() => submitConsentAction({ decision: "declined" }))
              }
            >
              Saya tidak bersedia
            </Button>
          </>
        ) : null}

        {availability.canWithdraw ? (
          <Button
            variant="danger"
            data-slot="consent-withdraw"
            disabled={isPending}
            onClick={() => run(() => withdrawConsentAction())}
          >
            {isPending ? "Memproses…" : "Tarik persetujuan saya"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
