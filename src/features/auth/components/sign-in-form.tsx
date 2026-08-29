/** @format */

"use client";

import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
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
  // Nama tombol sengaja tidak memakai frasa "kata sandi" agar pencarian
  // berbasis label tidak cocok ke dua elemen sekaligus.
  const [passwordVisible, setPasswordVisible] = useState(false);

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
        <div className="relative">
          <Mail
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nama@kampus.ac.id"
            className="h-11 pl-10"
            required
          />
        </div>
        <FieldError messages={state.fieldErrors?.["email"]} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Kata sandi</Label>
        <div className="relative">
          <Lock
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
          />
          <Input
            id="password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Masukkan kata sandi"
            className="h-11 pr-11 pl-10"
            required
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={
              passwordVisible ? "Sembunyikan sandi" : "Perlihatkan sandi"
            }
            aria-pressed={passwordVisible}
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-2 text-subtle outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {passwordVisible ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </button>
        </div>
        <FieldError messages={state.fieldErrors?.["password"]} />
      </div>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-sm text-primary underline-offset-4 hover:underline"
        >
          Lupa kata sandi?
        </Link>
      </div>

      <SubmitButton />
    </form>
  );
}
