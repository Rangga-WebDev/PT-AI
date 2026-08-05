<!-- @format -->

# DESIGN SYSTEM — Civic Intelligence

Referensi keputusan: DSN-001 s.d. DSN-008 (LOCKED) di [DECISIONS.md](DECISIONS.md). Implementasi: [src/app/globals.css](../src/app/globals.css).

## 1. Konsep

Dark application shell + warm reading canvas + aqua human action + violet AI assistance + amber evidence + mint verification + coral danger. Arah visual: neo-academic, editorial, intelligent, futuristik, profesional, nyaman untuk teks panjang — bukan template SaaS generik.

**Tema tunggal gelap.** Tidak ada light mode aplikasi; kanvas baca hangat adalah _scope permukaan_ (`.reading-surface`), bukan theme switch. Class `dark` dipasang permanen di `<html>` (NOTE-006).

## 2. Token Warna

### Shell gelap (default `:root`)

| Token                                           | Nilai     | Utility                 | Kegunaan            |
| ----------------------------------------------- | --------- | ----------------------- | ------------------- |
| `--background`                                  | `#09111F` | `bg-background`         | Latar aplikasi      |
| `--sidebar`                                     | `#0E192B` | `bg-sidebar`            | Sidebar/bottom nav  |
| `--surface` / `--card`                          | `#142137` | `bg-surface`, `bg-card` | Permukaan utama     |
| `--surface-elevated` / `--popover`              | `#1A2942` | `bg-surface-elevated`   | Permukaan terangkat |
| `--surface-active` / `--secondary` / `--accent` | `#203554` | `bg-surface-active`     | Hover/aktif         |
| `--border` / `--input`                          | `#293A55` | `border-border`         | Garis batas         |
| `--foreground`                                  | `#F5F7FB` | `text-foreground`       | Teks utama          |
| `--muted-foreground`                            | `#A9B6CB` | `text-muted-foreground` | Teks sekunder       |
| `--subtle`                                      | `#71809A` | `text-subtle`           | Teks muted/metadata |

### Aksen semantik (DSN-002 — makna TIDAK boleh ditukar)

| Makna                      | Token                   | Nilai     | Hover                       |
| -------------------------- | ----------------------- | --------- | --------------------------- |
| Tindakan mahasiswa/manusia | `--primary` (aqua)      | `#63E6E2` | `--primary-hover` `#86F1ED` |
| Bantuan AI                 | `--ai` (violet)         | `#9B8CFF` | `--ai-hover` `#B2A7FF`      |
| Evidence/sumber            | `--evidence` (amber)    | `#F4C95D` | —                           |
| Verified/completed         | `--success` (mint)      | `#45D6A8` | —                           |
| Danger/incident            | `--destructive` (coral) | `#FF7185` | —                           |
| Informasi netral           | `--info` (blue)         | `#68A7FF` | —                           |

Aturan: **AI (violet) tidak boleh lebih dominan daripada aktivitas mahasiswa (aqua)** — DSN-006.

### Reading canvas (scope `.reading-surface`)

| Token                  | Nilai     | Kegunaan              |
| ---------------------- | --------- | --------------------- |
| `--reading-canvas`     | `#F7F3E9` | Latar kanvas baca     |
| `--reading-surface`    | `#FFFCF5` | Kartu di dalam kanvas |
| `--reading-foreground` | `#202631` | Teks baca             |
| `--reading-secondary`  | `#667085` | Teks sekunder baca    |
| `--reading-border`     | `#DED8CB` | Border baca           |
| `--reading-highlight`  | `#FFF0BD` | Sorotan teks          |
| `--reading-selected`   | `#DDF8F5` | Sumber terpilih       |

Class `.reading-surface` memetakan ulang token semantik (background, card, border, muted) sehingga komponen di dalamnya otomatis menyesuaikan. Jangan gunakan glassmorphism pada teks panjang.

## 3. Tipografi (DSN-004)

Font via `next/font/google` ([src/lib/fonts.ts](../src/lib/fonts.ts)): Space Grotesk (`font-heading`), Source Sans 3 (`font-sans`), IBM Plex Mono (`font-mono`).

| Utility        | Ukuran | Line-height |
| -------------- | ------ | ----------- |
| `text-display` | 48px   | 1.15        |
| `text-h1`      | 36px   | 1.2         |
| `text-h2`      | 28px   | 1.25        |
| `text-h3`      | 22px   | 1.3         |
| `text-h4`      | 18px   | 1.4         |
| `text-body-lg` | 18px   | 1.7         |
| `text-base`    | 16px   | default     |
| `text-sm`      | 14px   | default     |
| `text-xs`      | 12px   | default     |

Teks pembelajaran panjang: utility `reading-prose` (max-width 760px, line-height 1.7).

## 4. Layout (DSN-007/008)

| Token                         | Nilai  | Utility                          |
| ----------------------------- | ------ | -------------------------------- |
| `--spacing-sidebar`           | 272px  | `w-sidebar`, `pl-sidebar`        |
| `--spacing-sidebar-collapsed` | 80px   | `w-sidebar-collapsed`            |
| `--spacing-topbar`            | 72px   | `h-topbar`                       |
| `--spacing-context-panel`     | 360px  | `w-context-panel`                |
| `--container-shell`           | 1600px | `max-w-shell`                    |
| `--container-reading`         | 760px  | `max-w-reading`, `reading-prose` |

Breakpoint perilaku: desktop (≥lg) sidebar 272↔80px; tablet (md–lg) navigation rail 80px; mobile (<md) bottom navigation + drawer. Grid: `BentoGrid` = 1 kolom mobile, 8 kolom tablet, 12 kolom desktop, asimetris (DSN-005). Padding halaman desktop 32px (`PageContainer`). Touch target minimal 44px.

## 5. Button (LOCKED)

[src/components/ui/button.tsx](../src/components/ui/button.tsx) — radius dasar `--radius` = 12px.

| Varian              | Gaya                                                  | Kegunaan                                    |
| ------------------- | ----------------------------------------------------- | ------------------------------------------- |
| `primary` (default) | Aqua solid, teks gelap, 44px, radius 12px, weight 600 | Tindakan utama manusia                      |
| `ai`                | Violet tinted + border + teks violet                  | Tindakan berbantuan AI                      |
| `outline`           | Transparan + border terlihat                          | Tindakan sekunder                           |
| `ghost`             | Tanpa latar                                           | Aksi toolbar                                |
| `danger`            | Coral solid                                           | Tindakan destruktif (dengan confirm dialog) |
| `link`              | Teks aqua underline                                   | Tautan inline                               |

Aturan: maksimal SATU primary per card; tidak semua button pill; violet hanya untuk AI.

## 6. Inventori Komponen (PHASE 2)

| Kategori                   | Komponen                                                                                                 | Lokasi                   |
| -------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------ |
| ui (shadcn terkustomisasi) | Button, Card, Badge, Skeleton, Sheet, Separator, Tooltip                                                 | `src/components/ui/`     |
| shared                     | StatusBadge (9 status), LoadingState, SkeletonState, EmptyState, ErrorState, ForbiddenState, LockedState | `src/components/shared/` |
| layout                     | AppShell, Sidebar/SidebarNav, Topbar, MobileNavigation, PageContainer, PageHeader, BentoGrid             | `src/components/layout/` |

Belum dibangun (fase berikutnya): card variants pembelajaran (HeroLearningCard, CourseCard, CaseCard, EvidenceCard, AIFeedbackCard, InsightCard, AnalyticsCard, LockedCard, RemedialCard, EnrichmentCard — PHASE 3), PhaseRail/PhaseStepper, ContextDrawer, OfflineState, Breadcrumbs, FilterBar, Tabs.

## 7. Aksesibilitas

- Skip link "Langsung ke konten utama" pada AppShell.
- `focus-visible` ring aqua (ring AI violet pada varian ai).
- Toggle sidebar dapat dioperasikan keyboard, dengan `aria-label` dan `aria-expanded`.
- `aria-current="page"` pada item navigasi aktif; nav diberi `aria-label` unik.
- Touch target ≥44px (`h-11`, `min-h-14` bottom nav — diverifikasi E2E).
- Ikon dekoratif memakai `aria-hidden="true"`.

## 8. Galeri

`/design-system` — halaman preview internal berlabel (bukan fitur produk; digate/dihapus pada PHASE 15).
