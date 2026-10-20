/** @format */

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  changePassword,
  type ChangePasswordState,
} from "@/actions/auth/change-password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Menyimpan…" : "Simpan kata sandi baru"}
    </Button>
  );
}

function FieldMessage({ messages }: { messages: string[] | undefined }) {
  if (!messages?.[0]) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

export function ChangePasswordForm({
  requireCurrent,
}: {
  requireCurrent: boolean;
}) {
  const [state, formAction] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm text-foreground"
        >
          Kata sandi berhasil diganti. Gunakan kata sandi baru saat masuk
          berikutnya.
        </p>
      ) : null}

      {requireCurrent ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="current-password">Kata sandi saat ini</Label>
          <Input
            id="current-password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
          <FieldMessage messages={state.fieldErrors?.["currentPassword"]} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">Kata sandi baru</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldMessage messages={state.fieldErrors?.["password"]} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-password">Ulangi kata sandi baru</Label>
        <Input
          id="confirm-password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
        <FieldMessage messages={state.fieldErrors?.["confirmPassword"]} />
      </div>

      <SubmitButton />
    </form>
  );
}
