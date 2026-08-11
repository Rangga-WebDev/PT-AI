/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = {
  title: "Masuk",
};

const ERROR_MESSAGES: Record<string, string> = {
  "tautan-tidak-valid": "Tautan tidak valid. Silakan minta tautan baru.",
  "tautan-kedaluwarsa": "Tautan sudah kedaluwarsa. Silakan minta tautan baru.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const redirectTo =
    typeof params.redirectTo === "string" ? params.redirectTo : undefined;
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-2 text-center">
          <p className="font-mono text-xs tracking-widest text-subtle uppercase">
            PT-AI LMS
          </p>
          <h1 className="font-heading text-h2 font-semibold">
            Masuk ke akun Anda
          </h1>
          <p className="text-sm text-muted-foreground">
            Akun dibuat oleh administrator institusi. Hubungi administrator bila
            Anda belum memiliki akses.
          </p>
        </div>

        <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
          {errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          ) : null}

          <SignInForm redirectTo={redirectTo} />

          <Link
            href="/forgot-password"
            className="text-center text-sm text-primary underline-offset-4 hover:underline"
          >
            Lupa kata sandi?
          </Link>
        </div>
      </div>
    </main>
  );
}
