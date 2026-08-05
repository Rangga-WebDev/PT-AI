/** @format */

import { StatusBadge } from "@/components/shared/status-badge";

// [PREVIEW INTERNAL] Seksi fondasi: warna, tipografi, reading canvas.
// Konten di bawah hanyalah spesimen galeri, bukan data produk.

const SHELL_COLORS = [
  { name: "Background", token: "--background", className: "bg-background" },
  { name: "Sidebar", token: "--sidebar", className: "bg-sidebar" },
  { name: "Surface", token: "--surface", className: "bg-surface" },
  {
    name: "Elevated",
    token: "--surface-elevated",
    className: "bg-surface-elevated",
  },
  {
    name: "Active",
    token: "--surface-active",
    className: "bg-surface-active",
  },
  { name: "Border", token: "--border", className: "bg-border" },
] as const;

const ACCENT_COLORS = [
  {
    name: "Aqua — tindakan manusia",
    token: "--primary",
    className: "bg-primary",
  },
  { name: "Violet — bantuan AI", token: "--ai", className: "bg-ai" },
  { name: "Amber — evidence", token: "--evidence", className: "bg-evidence" },
  { name: "Mint — verified", token: "--success", className: "bg-success" },
  {
    name: "Coral — danger",
    token: "--destructive",
    className: "bg-destructive",
  },
  { name: "Blue — informasi", token: "--info", className: "bg-info" },
] as const;

const TYPE_SCALE = [
  { label: "Display / 48px", className: "text-display font-heading" },
  { label: "H1 / 36px", className: "text-h1 font-heading" },
  { label: "H2 / 28px", className: "text-h2 font-heading" },
  { label: "H3 / 22px", className: "text-h3 font-heading" },
  { label: "H4 / 18px", className: "text-h4 font-heading font-semibold" },
] as const;

export function FoundationsSection() {
  return (
    <section aria-labelledby="fondasi-heading" className="flex flex-col gap-8">
      <h2
        id="fondasi-heading"
        className="font-heading text-h3 font-semibold text-foreground"
      >
        Fondasi
      </h2>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-heading font-semibold">Permukaan shell</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SHELL_COLORS.map((color) => (
            <div
              key={color.token}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3"
            >
              <div
                className={`h-12 rounded-lg border border-border ${color.className}`}
              />
              <p className="text-xs font-medium text-foreground">
                {color.name}
              </p>
              <p className="font-mono text-[0.6875rem] text-subtle">
                {color.token}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-heading font-semibold">
          Aksen semantik (DSN-002)
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ACCENT_COLORS.map((color) => (
            <div
              key={color.token}
              className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3"
            >
              <div className={`h-12 rounded-lg ${color.className}`} />
              <p className="text-xs font-medium text-foreground">
                {color.name}
              </p>
              <p className="font-mono text-[0.6875rem] text-subtle">
                {color.token}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-heading font-semibold">Tipografi</h3>
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
          {TYPE_SCALE.map((item) => (
            <div key={item.label} className="flex flex-col gap-1">
              <p className="font-mono text-[0.6875rem] text-subtle uppercase">
                {item.label}
              </p>
              <p className={item.className}>Kewarganegaraan digital</p>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[0.6875rem] text-subtle uppercase">
              Body large / 18px — line-height 1.7
            </p>
            <p className="text-body-lg reading-prose text-muted-foreground">
              Mahasiswa menganalisis klaim, memeriksa bukti, dan menyusun
              argumen tentang isu kewarganegaraan autentik. Teks pembelajaran
              panjang memakai lebar baca 720–780px agar nyaman dibaca.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-mono text-[0.6875rem] text-subtle uppercase">
              Metadata — IBM Plex Mono
            </p>
            <p className="font-mono text-sm text-muted-foreground">
              attempt_id: 018f-3c2a · submitted_at: 2026-08-05T10:00:00+07:00
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-h4 font-heading font-semibold">
          Reading canvas hangat (DSN-001)
        </h3>
        <div className="reading-surface rounded-xl border border-reading-border p-6 md:p-8">
          <div className="reading-prose mx-auto flex flex-col gap-4">
            <StatusBadge status="evidence" className="w-fit">
              Sumber 01
            </StatusBadge>
            <h4 className="font-heading text-h3 font-semibold">
              Partisipasi Warga dalam Musyawarah Digital
            </h4>
            <p className="text-body-lg">
              Kasus berikut adalah <em>spesimen galeri</em>. Perhatikan bahwa
              teks panjang berada pada kanvas hangat, dengan{" "}
              <mark className="rounded-sm bg-reading-highlight px-1">
                sorotan penting ditandai seperti ini
              </mark>{" "}
              dan kutipan sumber dapat dihubungkan dengan klaim.
            </p>
            <div className="rounded-lg border border-primary/40 bg-reading-selected p-4 text-sm">
              Sumber terpilih ditampilkan dengan latar aqua lembut — penanda
              bahwa mahasiswa sedang menautkan klaim ke bukti.
            </div>
            <p className="text-sm text-reading-secondary">
              Metadata sumber: Lembaga Riset Sipil (2025), diakses 5 Agustus
              2026.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
