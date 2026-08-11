/** @format */

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signIn, type AuthFormState } from "@/actions/auth/sign-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FieldError({ messages }: { messages?: string[] | undefined }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {messages[0]}
    </p>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Memproses…" : "Masuk"}
    </Button>
  );
}

export function SignInForm({
  redirectTo,
}: {
  redirectTo?: string | undefined;
}) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    signIn,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {redirectTo ? (
        <input type="hidden" name="redirectTo" value={redirectTo} />
      ) : null}

      {state.error ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Surel institusi</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@kampus.ac.id"
          required
        />
        <FieldError messages={state.fieldErrors?.["email"]} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <FieldError messages={state.fieldErrors?.["password"]} />
      </div>

      <SubmitButton />
    </form>
  );
}
