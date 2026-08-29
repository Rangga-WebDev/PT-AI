/** @format */

import Link from "next/link";

import { SignInForm } from "@/features/auth/components/sign-in-form";

const STAGES = [
  "Interpretasi",
  "Analisis",
  "Evaluasi",
  "Inferensi",
  "Eksplanasi",
  "Refleksi",
];

interface AuthScreenProps {
  redirectTo?: string | undefined;
  errorMessage?: string | undefined;
}

/**
 * Dipakai `/` dan `/login` agar hanya ada satu permukaan masuk.
 * `/login` menerima `redirectTo` dan pesan galat dari proxy.
 */
export function AuthScreen({ redirectTo, errorMessage }: AuthScreenProps) {
  return (
    <main
      data-slot="auth-screen"
      className="flex flex-1 flex-col lg:grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]"
    >
      <section className="flex flex-col justify-between gap-12 px-6 py-8 lg:px-12 lg:py-16">
        <div className="flex flex-col gap-4 lg:max-w-md">
          <p className="font-mono text-xs tracking-widest text-subtle uppercase">
            Pendidikan Kewarganegaraan
          </p>

          <h1 className="font-heading text-h3 font-semibold tracking-tight text-balance lg:text-h1">
            PT-AI Learning Management System
          </h1>

          <p className="text-sm leading-relaxed text-muted-foreground lg:text-base">
            Pembelajaran terprogram berbantuan AI untuk melatih kemampuan
            berpikir kritis mahasiswa.
          </p>

          <p className="hidden text-sm leading-relaxed text-muted-foreground lg:block">
            Bantuan AI terbuka setelah Anda mengirim jawaban sendiri, dan setiap
            rujukannya dapat ditelusuri ke sumber yang dilampirkan dosen.
          </p>
        </div>

        <div className="hidden flex-col gap-1.5 lg:flex">
          <p className="font-mono text-xs tracking-widest text-subtle uppercase">
            Enam tahap berurutan
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {STAGES.join(" · ")}
          </p>
        </div>
      </section>

      <section className="flex flex-1 items-start justify-center border-t border-border bg-card px-6 py-10 lg:items-center lg:border-t-0 lg:border-l lg:px-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-h3 font-semibold">
              Masuk ke akun Anda
            </h2>
            <p className="text-sm text-muted-foreground">
              Akun dibuat oleh administrator institusi. Hubungi administrator
              bila Anda belum memiliki akses.
            </p>
          </div>

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
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Lupa kata sandi?
          </Link>
        </div>
      </section>
    </main>
  );
}
