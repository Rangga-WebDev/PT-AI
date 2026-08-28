/** @format */

"use client";

import { Link2, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  linkClaimToSourceAction,
  unlinkClaimSourceAction,
} from "@/actions/sources/verification";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  LINK_TYPE_LABEL,
  type ClaimLinkType,
} from "@/lib/constants/verification";
import type { ClaimView } from "@/server/repositories/sources";

const selectClass =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

interface ClaimEvidenceLinkerProps {
  claims: ClaimView[];
  sourceId: string;
  sourceTitle: string;
}

/** Penautan bukti bersifat eksploratif, sehingga tautan dapat dicabut kembali. */
export function ClaimEvidenceLinker({
  claims,
  sourceId,
  sourceTitle,
}: ClaimEvidenceLinkerProps) {
  const router = useRouter();
  const [linkTypes, setLinkTypes] = useState<Record<string, ClaimLinkType>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function link(claimId: string) {
    setError(null);
    startTransition(async () => {
      const result = await linkClaimToSourceAction({
        claimId,
        sourceId,
        linkType: linkTypes[claimId] ?? "supports",
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function unlink(linkId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkClaimSourceAction(linkId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      aria-labelledby="klaim-heading"
      data-slot="claim-linker"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <h3 id="klaim-heading" className="font-heading text-h4 font-semibold">
        Klaim dan bukti
      </h3>
      <p className="text-sm text-muted-foreground">
        Tautkan klaim kasus ke sumber ini bila relevan. Sebuah sumber dapat
        mendukung, membantah, atau sekadar memberi konteks.
      </p>

      {claims.length === 0 ? (
        <p className="text-sm text-subtle">
          Belum ada klaim pada kasus ini.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {claims.map((claim) => {
            const existing = claim.links.find(
              (item) => item.sourceId === sourceId,
            );

            return (
              <li
                key={claim.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-4"
              >
                <p className="text-sm text-foreground">{claim.text}</p>

                {claim.links.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {claim.links.map((item) => (
                      <li
                        key={item.id}
                        className="inline-flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Link2
                          aria-hidden="true"
                          className="mt-0.5 size-3.5 shrink-0 text-evidence"
                        />
                        <span className="min-w-0">
                          {LINK_TYPE_LABEL[item.linkType]} — {item.sourceTitle}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <StatusBadge status="danger" className="w-fit">
                    <Unlink aria-hidden="true" className="size-3" />
                    Belum ada bukti tertaut
                  </StatusBadge>
                )}

                {existing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isPending}
                    onClick={() => unlink(existing.id)}
                  >
                    <Unlink aria-hidden="true" />
                    Cabut tautan ke sumber ini
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`link-type-${claim.id}`}>
                        Jenis tautan
                      </Label>
                      <select
                        id={`link-type-${claim.id}`}
                        className={selectClass}
                        value={linkTypes[claim.id] ?? "supports"}
                        onChange={(event) =>
                          setLinkTypes((current) => ({
                            ...current,
                            [claim.id]: event.target.value as ClaimLinkType,
                          }))
                        }
                      >
                        {Object.entries(LINK_TYPE_LABEL).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                    <Button
                      size="sm"
                      disabled={isPending}
                      onClick={() => link(claim.id)}
                    >
                      <Link2 aria-hidden="true" />
                      Tautkan ke {sourceTitle.slice(0, 24)}…
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
