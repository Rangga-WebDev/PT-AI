/** @format */

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerStudentAction } from "@/actions/auth/register";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fields = [
  {
    name: "fullName",
    label: "Nama lengkap",
    type: "text",
    autoComplete: "name",
    maxLength: 150,
  },
  {
    name: "identifier",
    label: "NIM",
    type: "text",
    autoComplete: "off",
    maxLength: 24,
  },
  {
    name: "email",
    label: "Surel mahasiswa",
    type: "email",
    autoComplete: "email",
    maxLength: 254,
  },
  {
    name: "password",
    label: "Kata sandi",
    type: "password",
    autoComplete: "new-password",
    maxLength: 128,
  },
  {
    name: "confirmPassword",
    label: "Konfirmasi kata sandi",
    type: "password",
    autoComplete: "new-password",
    maxLength: 128,
  },
] as const;

export function RegisterStudentForm({
  available = true,
}: {
  available?: boolean;
}) {
  const [state, action, pending] = useActionState(registerStudentAction, {});

  if (state.ok) {
    return (
      <div className="flex flex-col gap-5">
        <p role="status" className="text-sm text-success">
          Akun mahasiswa berhasil dibuat.
        </p>
        <Link href="/login" className={buttonVariants({ variant: "primary" })}>
          Masuk ke akun
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {!available ? (
        <p role="status" className="text-sm text-muted-foreground">
          Pendaftaran belum dibuka oleh institusi.
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {fields.map((field) => {
        const error = state.fieldErrors?.[field.name]?.[0];
        return (
          <div key={field.name} className="flex flex-col gap-2">
            <Label htmlFor={`register-${field.name}`}>{field.label}</Label>
            <Input
              id={`register-${field.name}`}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              maxLength={field.maxLength}
              required
              inputMode={field.name === "identifier" ? "numeric" : undefined}
              placeholder={
                field.name === "email"
                  ? "nama@student.unismuh.ac.id"
                  : field.name === "password"
                    ? "Minimal 12 karakter"
                    : undefined
              }
              aria-invalid={Boolean(error)}
              aria-describedby={
                error ? `register-${field.name}-error` : undefined
              }
              disabled={pending || !available}
              className="h-11"
            />
            {error ? (
              <p
                id={`register-${field.name}-error`}
                role="alert"
                className="text-sm text-destructive"
              >
                {error}
              </p>
            ) : null}
          </div>
        );
      })}
      <Button
        type="submit"
        disabled={pending || !available}
        className="mt-1 w-full"
      >
        {pending ? "Membuat akun..." : "Daftar mahasiswa"}
      </Button>
    </form>
  );
}
