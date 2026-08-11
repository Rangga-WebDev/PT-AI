/** @format */

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updatePassword } from "@/actions/auth/update-password";
import type { AuthFormState } from "@/actions/auth/sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Memproses…" : "Simpan kata sandi baru"}
    </Button>
  );
}

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    updatePassword,
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">Kata sandi baru</Label>
        <Input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        {state.fieldErrors?.["password"] ? (
          <p className="text-sm text-destructive" role="alert">
            {state.fieldErrors["password"][0]}
          </p>
        ) : null}
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
        {state.fieldErrors?.["confirmPassword"] ? (
          <p className="text-sm text-destructive" role="alert">
            {state.fieldErrors["confirmPassword"][0]}
          </p>
        ) : null}
      </div>

      <SubmitButton />
    </form>
  );
}
