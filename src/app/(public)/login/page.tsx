/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "Masuk",
};

export default function LoginPage() {
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
          <div
            role="note"
            className="rounded-lg border border-evidence/40 bg-evidence/10 px-3 py-2 text-xs text-muted-foreground"
          >
            <span className="font-mono font-semibold tracking-widest text-evidence uppercase">
              Prototipe visual
            </span>{" "}
            — formulir belum terhubung ke autentikasi. Login sungguhan dibangun
            pada PHASE 5.
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Surel institusi</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nama@kampus.ac.id"
              disabled
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Kata sandi</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled
            />
          </div>

          <Button disabled className="w-full">
            Masuk
          </Button>

          <div className="flex flex-col gap-2 text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-primary underline-offset-4 hover:underline"
            >
              Lupa kata sandi?
            </Link>
            <Link
              href="/app"
              className="text-muted-foreground underline-offset-4 hover:underline"
            >
              Lihat prototipe tanpa masuk →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
