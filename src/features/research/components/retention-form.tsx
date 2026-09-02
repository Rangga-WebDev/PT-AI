/** @format */

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { saveRetentionRuleAction } from "@/actions/research/retention";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RETAINABLE_DOMAINS, RETENTION_DOMAINS } from "@/lib/research/consent";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

export function RetentionRuleForm({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const [domainKey, setDomainKey] = useState(RETAINABLE_DOMAINS[0]!.key);
  const [retentionDays, setRetentionDays] = useState("365");
  const [action, setAction] = useState<"anonymize" | "delete">("anonymize");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveRetentionRuleAction({
        organizationId,
        domainKey,
        retentionDays,
        action,
        isActive: true,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div data-slot="retention-form" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retention-domain">Domain data</Label>
          <select
            id="retention-domain"
            className={selectClass}
            value={domainKey}
            onChange={(event) => setDomainKey(event.target.value)}
          >
            {RETAINABLE_DOMAINS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retention-days">Masa simpan (hari)</Label>
          <Input
            id="retention-days"
            type="number"
            min={1}
            max={3650}
            value={retentionDays}
            onChange={(event) => setRetentionDays(event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="retention-action">Aksi</Label>
          <select
            id="retention-action"
            className={selectClass}
            value={action}
            onChange={(event) =>
              setAction(event.target.value as "anonymize" | "delete")
            }
          >
            <option value="anonymize">Anonimisasi</option>
            <option value="delete">Hapus</option>
          </select>
        </div>
      </div>

      <p role="status" className="text-sm text-muted-foreground">
        Jejak permanen —{" "}
        {RETENTION_DOMAINS.filter((item) => item.isAppendOnly)
          .map((item) => item.label.toLowerCase())
          .join(", ")}{" "}
        — tidak tunduk pada retensi. Penghapusan data penelitian dilakukan
        dengan memutus pemetaan identitas peserta.
      </p>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button
          data-slot="submit-retention"
          onClick={submit}
          disabled={isPending}
        >
          {isPending ? "Menyimpan…" : "Simpan aturan"}
        </Button>
      </div>
    </div>
  );
}
