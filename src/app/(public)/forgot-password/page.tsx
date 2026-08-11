/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Lupa kata sandi",
};

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
          <div
            role="note"
            className="rounded-lg border border-evidence/40 bg-evidence/10 px-3 py-2 text-xs text-muted-foreground"
          >
            <span className="font-mono font-semibold tracking-widest text-evidence uppercase">
              Prototipe visual
            </span>{" "}
            — belum mengirim surel apa pun.
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="reset-email">Surel institusi</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              placeholder="nama@kampus.ac.id"
              disabled
            />
          </div>

          <Button disabled className="w-full">
            Kirim tautan
          </Button>

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
