/** @format */

import type { Metadata } from "next";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import type { NavSection } from "@/lib/navigation";

import { ComponentsSection } from "./_components/components-section";
import { FoundationsSection } from "./_components/foundations-section";

export const metadata: Metadata = {
  title: "Design System",
};

// Nonce CSP hanya dapat disisipkan saat render per permintaan.
export const dynamic = "force-dynamic";

// [PREVIEW INTERNAL] Galeri design system "Civic Intelligence".
// Halaman ini bukan fitur produk: navigasi di bawah hanyalah contoh untuk
// mendemonstrasikan AppShell, dan halaman akan digate/dihapus sebelum
// produksi (tercatat di docs/ROUTES.md).

const PREVIEW_NAV: NavSection[] = [
  {
    title: "Contoh menu",
    items: [
      { label: "Dashboard", href: "/design-system", icon: "dashboard" },
      { label: "Kelas", href: "#kelas", icon: "classes" },
      { label: "Pembelajaran", href: "#pembelajaran", icon: "learning" },
      { label: "Sumber", href: "#sumber", icon: "sources" },
    ],
  },
  {
    title: "Contoh lainnya",
    items: [
      { label: "Analitik", href: "#analitik", icon: "analytics" },
      { label: "Pengaturan", href: "#pengaturan", icon: "settings" },
    ],
  },
];

export default function DesignSystemPage() {
  return (
    <AppShell navSections={PREVIEW_NAV} topbarTitle="Design System">
      <PageContainer>
        <PageHeader
          eyebrow="Preview internal"
          title="Civic Intelligence"
          description="Galeri design tokens dan komponen dasar PT-AI LMS. Seluruh isi halaman adalah spesimen, bukan data produk."
        />
        <div className="flex flex-col gap-12">
          <FoundationsSection />
          <ComponentsSection />
        </div>
      </PageContainer>
    </AppShell>
  );
}
