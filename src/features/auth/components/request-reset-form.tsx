/** @format */

"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  requestPasswordReset,
  type ResetRequestState,
} from "@/actions/auth/request-password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Memproses…" : label}
    </Button>
  );
}

export function RequestResetForm() {
  const [state, formAction] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.success) {
    return (
      <p
        role="status"
        className="rounded-lg border border-success/40 bg-success/10 px-3 py-3 text-sm text-foreground"
      >
        Jika surel tersebut terdaftar, kami telah mengirim tautan pengaturan
        ulang kata sandi. Periksa kotak masuk dan folder spam Anda.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="reset-email">Surel institusi</Label>
        <Input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nama@kampus.ac.id"
          required
        />
        {state.fieldErrors?.["email"] ? (
          <p className="text-sm text-destructive" role="alert">
            {state.fieldErrors["email"][0]}
          </p>
        ) : null}
      </div>
      <SubmitButton label="Kirim tautan" />
    </form>
  );
}
