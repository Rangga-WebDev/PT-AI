/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { RequestResetForm } from "@/features/auth/components/request-reset-form";

export const metadata: Metadata = {
  title: "Lupa kata sandi",
};

// Nonce CSP hanya dapat disisipkan saat render per permintaan; halaman statis
// akan kehilangan nonce dan skrip hidrasinya diblokir browser.
export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-2 text-center">
          <h1 className="font-heading text-h2 font-semibold">
            Atur ulang kata sandi
          </h1>
          <p className="text-sm text-muted-foreground">
            Masukkan surel institusi Anda. Tautan pengaturan ulang akan dikirim
            ke surel tersebut.
          </p>
        </div>

        <div className="flex flex-col gap-5 rounded-xl border border-border bg-card p-6">
          <RequestResetForm />
          <Link
            href="/login"
            className="text-center text-sm text-primary underline-offset-4 hover:underline"
          >
            Kembali ke halaman masuk
          </Link>
        </div>
      </div>
    </main>
  );
}
