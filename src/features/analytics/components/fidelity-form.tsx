/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { recordFidelityAction } from "@/actions/assessment/incidents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FIDELITY_CHECKLIST, FIDELITY_GROUPS } from "@/lib/analytics/aggregate";

interface FidelityFormProps {
  classId: string;
  current: Record<string, boolean | null>;
}

/** Checklist keterlaksanaan model; catatan observasi untuk kebutuhan penelitian. */
export function FidelityForm({ classId, current }: FidelityFormProps) {
  const router = useRouter();
  const [observationDate, setObservationDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle(checklistKey: string, isImplemented: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await recordFidelityAction({
        classId,
        checklistKey,
        isImplemented,
        observationDate,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div data-slot="fidelity-form" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fidelity-date">Tanggal observasi</Label>
        <Input
          id="fidelity-date"
          type="date"
          value={observationDate}
          onChange={(event) => setObservationDate(event.target.value)}
        />
      </div>

      {FIDELITY_GROUPS.map((group) => (
        <section key={group} className="flex flex-col gap-1.5">
          <h4 className="text-xs font-medium tracking-wide text-subtle uppercase">
            {group}
          </h4>
          <ul className="divide-y divide-border border-y border-border">
            {FIDELITY_CHECKLIST.filter((item) => item.group === group).map(
              (item) => (
                <li
                  key={item.key}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span className="text-sm">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={
                        current[item.key] === true ? "primary" : "outline"
                      }
                      onClick={() => toggle(item.key, true)}
                      disabled={isPending}
                    >
                      Terlaksana
                    </Button>
                    <Button
                      size="sm"
                      variant={
                        current[item.key] === false ? "danger" : "outline"
                      }
                      onClick={() => toggle(item.key, false)}
                      disabled={isPending}
                    >
                      Belum
                    </Button>
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>
      ))}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
