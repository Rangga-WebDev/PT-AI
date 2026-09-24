/** @format */

"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { generateUnitPlanAction } from "@/actions/courses/unit-plan";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UnitPlanLauncher({
  classId,
  modules,
  documents,
}: {
  classId: string;
  modules: { id: string; label: string }[];
  documents: { id: string; title: string }[];
}) {
  const [state, action, pending] = useActionState(generateUnitPlanAction, {});
  const router = useRouter();
  useEffect(() => {
    if (state.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  return (
    <section
      aria-labelledby="ai-unit-heading"
      className="flex min-w-0 flex-col gap-4 border-y border-border py-5"
    >
      <h2 id="ai-unit-heading" className="font-heading text-h4 font-semibold">
        Enam unit dengan AI
      </h2>
      {modules.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">
          Belum ada pertemuan tujuan.
        </p>
      ) : documents.length === 0 ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm text-muted-foreground">
            Belum ada materi sumber yang terbaca.
          </p>
          <Link
            href={`/app/lecturer/classes/${classId}/materials`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Tambah materi
          </Link>
        </div>
      ) : (
        <form
          action={action}
          noValidate
          className="flex flex-col gap-4"
          aria-busy={pending}
        >
          <input type="hidden" name="classId" value={classId} />
          <fieldset
            disabled={pending}
            className="grid min-w-0 gap-4 md:grid-cols-2"
          >
            {[
              {
                name: "moduleId",
                label: "Pertemuan tujuan",
                options: modules.map((module) => ({
                  id: module.id,
                  label: module.label,
                })),
              },
              {
                name: "resourceId",
                label: "Materi sumber",
                options: documents.map((document) => ({
                  id: document.id,
                  label: document.title,
                })),
              },
            ].map((field) => (
              <div key={field.name} className="flex min-w-0 flex-col gap-2">
                <Label htmlFor={`unit-plan-${field.name}`}>{field.label}</Label>
                <select
                  id={`unit-plan-${field.name}`}
                  name={field.name}
                  required
                  className="h-11 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm"
                  aria-invalid={Boolean(state.fieldErrors?.[field.name])}
                  aria-describedby={
                    state.fieldErrors?.[field.name]
                      ? `unit-plan-${field.name}-error`
                      : undefined
                  }
                >
                  {field.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {state.fieldErrors?.[field.name] ? (
                  <p
                    id={`unit-plan-${field.name}-error`}
                    role="alert"
                    className="text-sm text-destructive"
                  >
                    {state.fieldErrors[field.name]?.[0]}
                  </p>
                ) : null}
              </div>
            ))}
            <div className="flex min-w-0 flex-col gap-2 md:col-span-2">
              <Label htmlFor="unit-plan-instruction">
                Fokus tambahan (opsional)
              </Label>
              <Input
                id="unit-plan-instruction"
                name="instruction"
                maxLength={1000}
                placeholder="Contoh: partisipasi warga dan kebijakan publik"
                className="h-11"
              />
              {state.fieldErrors?.instruction ? (
                <p role="alert" className="text-sm text-destructive">
                  {state.fieldErrors.instruction[0]}
                </p>
              ) : null}
            </div>
          </fieldset>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <div>
            <Button
              type="submit"
              variant="ai"
              disabled={pending}
              className="min-h-11 whitespace-normal"
            >
              <Sparkles aria-hidden="true" />
              {pending ? "Menyusun 6 unit..." : "Buat 6 unit dengan AI"}
            </Button>
          </div>
          {pending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Draf sedang disusun dari materi sumber.
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
