/** @format */

import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/features/auth/components/update-password-form";

export const metadata: Metadata = {
  title: "Kata sandi baru",
};

// Nonce CSP hanya dapat disisipkan saat render per permintaan.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col gap-2 text-center">
          <h1 className="font-heading text-h2 font-semibold">
            Buat kata sandi baru
          </h1>
          <p className="text-sm text-muted-foreground">
            Gunakan kata sandi minimal 12 karakter yang tidak Anda pakai di
            layanan lain.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <UpdatePasswordForm />
        </div>
      </div>
    </main>
  );
}
