/** @format */

import type { Metadata } from "next";
import Link from "next/link";

import { MockBanner } from "@/components/shared/mock-banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pilih tampilan prototipe",
};

// Pemilih peran khusus prototipe. Pada PHASE 5 peran diambil dari sesi server,
// bukan dipilih pengguna.
export default function AppEntryPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-subtle uppercase">
          Prototipe visual
        </p>
        <h1 className="font-heading text-h1 font-semibold">
          Pilih tampilan yang ingin ditinjau
        </h1>
        <p className="text-muted-foreground">
          Belum ada autentikasi maupun otorisasi. Pemilihan di bawah hanya
          menentukan tampilan yang dibuka.
        </p>
      </div>

      <MockBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tampilan mahasiswa</CardTitle>
            <CardDescription>
              Dashboard, kelas, ruang belajar enam tahap, dan verifikasi sumber.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button render={<Link href="/app/student/dashboard" />}>
              Buka tampilan mahasiswa
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tampilan dosen</CardTitle>
            <CardDescription>
              Kelas yang diampu, antrean review, distribusi mastery, dan insiden
              AI.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              render={<Link href="/app/lecturer/dashboard" />}
            >
              Buka tampilan dosen
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
