/** @format */

import { SignInForm } from "@/features/auth/components/sign-in-form";

import Image from "next/image";
interface AuthScreenProps {
  redirectTo?: string | undefined;
  errorMessage?: string | undefined;
}

export function AuthScreen({ redirectTo, errorMessage }: AuthScreenProps) {
  return (
    <main
      data-slot="auth-screen"
      className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]"
    >
      <section className="relative flex flex-col justify-between gap-12 bg-card px-6 py-8 lg:px-12 lg:py-16 lg:[clip-path:ellipse(100%_115%_at_0%_50%)]">
        <div aria-hidden className="absolute inset-0">
          <Image
            src="/auth/auth.png"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-background/75" />
        </div>

        <div className="relative flex flex-col gap-4 lg:max-w-md">
          <h1 className="relative font-heading tracking-tight">
            <span className="block text-h2 leading-none font-bold lg:text-display">
              PT<span className="text-primary">-</span>AI
            </span>{" "}
            <span className="mt-2.5 block font-sans text-xs font-medium tracking-widest text-subtle uppercase lg:text-sm">
              Learning Management System
            </span>
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground lg:text-base">
            Pembelajaran terprogram berbantuan AI untuk melatih kemampuan
            berpikir kritis mahasiswa.
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-start justify-center px-6 py-10 lg:items-center lg:px-12">
        <div className="flex w-full max-w-sm flex-col gap-7">
          <h2 className="text-center font-heading text-h3 font-semibold">
            Masuk ke akun Anda
          </h2>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          ) : null}

          <SignInForm redirectTo={redirectTo} />

          <p className="text-center text-sm text-muted-foreground">
            Akun dibuat oleh administrator institusi. Hubungi administrator bila
            Anda belum memiliki akses.
          </p>
        </div>
      </section>
    </main>
  );
}
