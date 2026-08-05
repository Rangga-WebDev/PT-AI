/** @format */

import { Sparkles } from "lucide-react";

import { BentoGrid } from "@/components/layout/bento-grid";
import { EmptyState } from "@/components/shared/states/empty-state";
import { ErrorState } from "@/components/shared/states/error-state";
import { ForbiddenState } from "@/components/shared/states/forbidden-state";
import { LoadingState } from "@/components/shared/states/loading-state";
import { LockedState } from "@/components/shared/states/locked-state";
import { SkeletonState } from "@/components/shared/states/skeleton-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// [PREVIEW INTERNAL] Seksi komponen: button, badge, card, states.
// Semua isi adalah spesimen galeri, bukan data produk.

const BADGE_SPECIMENS = [
  { status: "draft", label: "Draf" },
  { status: "published", label: "Terbit" },
  { status: "in-progress", label: "Berjalan" },
  { status: "verified", label: "Terverifikasi" },
  { status: "evidence", label: "Bukti" },
  { status: "ai", label: "Saran AI" },
  { status: "info", label: "Informasi" },
  { status: "danger", label: "Insiden" },
  { status: "locked", label: "Terkunci" },
] as const;

export function ComponentsSection() {
  return (
    <section aria-labelledby="komponen-heading" className="flex flex-col gap-8">
      <h2
        id="komponen-heading"
        className="font-heading text-h3 font-semibold text-foreground"
      >
        Komponen
      </h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-heading font-semibold">Button</h3>
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Aksi primary</Button>
            <Button variant="ai">
              <Sparkles aria-hidden="true" />
              Bantuan AI
            </Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Hapus</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="outline">
              Ukuran kecil
            </Button>
            <Button size="lg">Ukuran besar</Button>
            <Button disabled>Nonaktif</Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Aturan: maksimal satu tombol primary per card; aqua untuk tindakan
            manusia, violet hanya untuk tindakan berbantuan AI; tidak semua
            button berbentuk pill.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-heading font-semibold">StatusBadge</h3>
        <div className="flex flex-wrap gap-3 rounded-xl border border-border bg-card p-6">
          {BADGE_SPECIMENS.map((badge) => (
            <StatusBadge key={badge.status} status={badge.status}>
              {badge.label}
            </StatusBadge>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-heading font-semibold">
          Card + BentoGrid asimetris (DSN-005)
        </h3>
        <BentoGrid>
          <Card className="md:col-span-8 lg:col-span-7">
            <CardHeader>
              <StatusBadge status="in-progress" className="mb-2">
                Contoh hero
              </StatusBadge>
              <CardTitle className="text-h3 font-semibold">
                Kartu hero pembelajaran
              </CardTitle>
              <CardDescription>
                Kartu terbesar pada bento grid menyorot aktivitas belajar yang
                sedang berjalan — bukan chatbot AI.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Konten spesimen. Grid: 12 kolom desktop, 8 kolom tablet, 1 kolom
              mobile; ukuran kartu sengaja tidak seragam.
            </CardContent>
            <CardFooter className="gap-3">
              <Button>Lanjutkan belajar</Button>
              <Button variant="outline">Lihat detail</Button>
            </CardFooter>
          </Card>
          <Card className="md:col-span-4 lg:col-span-5">
            <CardHeader>
              <StatusBadge status="ai" className="mb-2">
                Panel AI
              </StatusBadge>
              <CardTitle>Kartu feedback AI</CardTitle>
              <CardDescription>
                Aksen violet menandai konten AI; porsinya tidak mendominasi
                dashboard (DSN-006).
              </CardDescription>
            </CardHeader>
            <CardFooter className="gap-3">
              <Button variant="ai" size="sm">
                Terima saran
              </Button>
              <Button variant="ghost" size="sm">
                Abaikan
              </Button>
            </CardFooter>
          </Card>
          <Card size="sm" className="md:col-span-4 lg:col-span-4">
            <CardHeader>
              <CardTitle>Kartu bukti</CardTitle>
              <CardDescription>
                Aksen amber untuk sumber dan bukti.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusBadge status="evidence">3 sumber</StatusBadge>
            </CardContent>
          </Card>
          <Card size="sm" className="md:col-span-4 lg:col-span-4">
            <CardHeader>
              <CardTitle>Kartu progres</CardTitle>
              <CardDescription>
                Mint menandai tahap yang tuntas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusBadge status="verified">Tahap 2 tuntas</StatusBadge>
            </CardContent>
          </Card>
          <Card size="sm" className="md:col-span-8 lg:col-span-4">
            <CardHeader>
              <CardTitle>Kartu terkunci</CardTitle>
              <CardDescription>
                Tahap berikutnya terbuka setelah attempt tersimpan
                (attempt-first).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StatusBadge status="locked">Terkunci</StatusBadge>
            </CardContent>
          </Card>
        </BentoGrid>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-heading font-semibold">States</h3>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <LoadingState />
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <SkeletonState lines={3} />
          </div>
          <EmptyState
            description="Belum ada kelas yang diikuti. Hubungi dosen atau administrator Anda."
            action={
              <Button variant="outline" size="sm">
                Muat ulang
              </Button>
            }
          />
          <ErrorState
            action={
              <Button variant="outline" size="sm">
                Coba lagi
              </Button>
            }
          />
          <ForbiddenState />
          <LockedState description="Simpan respons awal Anda terlebih dahulu untuk membuka bantuan AI (attempt-first)." />
        </div>
      </div>
    </section>
  );
}
