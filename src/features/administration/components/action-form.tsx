/** @format */

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type * as React from "react";

import type { FormState } from "@/actions/administration/accounts";
import { Button } from "@/components/ui/button";

type FormAction = (state: FormState, formData: FormData) => Promise<FormState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Menyimpan…" : label}
    </Button>
  );
}

interface ActionFormProps {
  action: FormAction;
  submitLabel: string;
  children: (state: FormState) => React.ReactNode;
  className?: string | undefined;
}

/** Kerangka form Server Action dengan penyajian galat dan pesan yang seragam. */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
}: ActionFormProps) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className={className} noValidate>
      <div className="flex flex-col gap-4">
        {state.error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        {state.ok && state.message ? (
          <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm break-words text-foreground">
            {state.message}
          </p>
        ) : null}

        {children(state)}

        <div>
          <SubmitButton label={submitLabel} />
        </div>
      </div>
    </form>
  );
}

export function FieldError({ messages }: { messages?: string[] | undefined }) {
  if (!messages || messages.length === 0) return null;
  return <p className="text-sm text-destructive">{messages[0]}</p>;
}

/** Tombol aksi ringkas untuk operasi satu langkah di dalam tabel. */
export function InlineAction({
  action,
  label,
  variant = "outline",
  fields,
}: {
  action: FormAction;
  label: string;
  variant?: "outline" | "ghost" | "danger";
  fields: Record<string, string>;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});

  return (
    <form action={formAction} className="inline-flex flex-col gap-1">
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" size="sm" variant={variant}>
        {label}
      </Button>
      {state.error ? (
        <span className="text-xs text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}
