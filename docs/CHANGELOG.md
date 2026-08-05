<!-- @format -->

# CHANGELOG — PT-AI Learning Management System

Mencatat perubahan arsitektur dan perubahan signifikan per fase.

## [PHASE 2] — 2026-08-05 — Design System and Application Shell

### Ditambahkan

- Design tokens tema "Civic Intelligence" di `src/app/globals.css`: seluruh palet LOCKED (shell gelap + reading canvas hangat), token semantik aqua/violet/amber/mint/coral/blue, skala tipografi (display 48 → caption 12), dimensi layout (sidebar 17rem/5rem, topbar 4.5rem, context panel 22.5rem, container shell 100rem, reading 47.5rem), radius dasar 12px, scope `.reading-surface`, utility `reading-prose`.
- Kustomisasi penuh `Button` (primary aqua 44px/radius 12px/weight 600, ai violet tinted, outline, ghost, danger, link) — LOCK-TECH-011.
- Komponen shadcn: `card`, `badge`, `skeleton`, `sheet`, `separator`, `tooltip` (disalin via CLI, tanpa dependency npm baru).
- `StatusBadge` (9 status semantik), 6 komponen state (`LoadingState`, `SkeletonState`, `EmptyState`, `ErrorState`, `ForbiddenState`, `LockedState`) dengan `StateShell` bersama.
- Application shell: `AppShell`, `Sidebar`/`SidebarNav`, `Topbar`, `MobileNavigation`, `PageContainer`, `PageHeader`, `BentoGrid`; konfigurasi navigasi serializable `src/lib/navigation.ts`; skip link + focus-visible + toggle keyboard.
- Halaman galeri internal `/design-system` (berlabel, akan digate sebelum produksi).
- Test baru: `button`, `status-badge`, `states`, `app-shell` (RTL) dan `e2e/design-system.spec.ts` (desktop + viewport mobile).

### Diubah

- `src/app/layout.tsx`: class `dark` pada `<html>` (tema tunggal gelap — NOTE-006).
- `src/app/page.tsx`: badge fase + tautan ke galeri design system.
- `.dark` block dihapus dari globals.css; `:root` menjadi satu-satunya sumber token.

### Keputusan teknis dalam fase

- Tema aplikasi adalah gelap permanen; reading canvas adalah scope permukaan, bukan theme switch (NOTE-006).
- State collapse sidebar memakai React state lokal — Zustand belum diperlukan (LOCK-TECH-016: state lokal terlebih dahulu).
- Ikon navigasi dikirim lintas batas RSC sebagai string key (`NavIconKey`), bukan fungsi komponen.

### Hasil verifikasi (dijalankan nyata)

- `npm run lint` → exit 0; `npm run typecheck` → exit 0.
- `npm run test` → 6 file, 23 test lulus.
- `npm run build` → sukses (3 route static).
- `npm run test:e2e` → 5 test lulus (sidebar 272↔80px terukur; touch target ≥44px pada viewport 390×844).

## [PHASE 1] — 2026-08-05 — Next.js Foundation

### Ditambahkan

- Inisialisasi Next.js 16.3.0 App Router (Turbopack) dengan TypeScript, Tailwind CSS v4, ESLint 9 (flat config), `src/` directory, import alias `@/*`.
- TypeScript strict diperketat: `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — semuanya aktif dan lolos typecheck + build.
- Tipografi tema via `next/font/google` (`src/lib/fonts.ts`): Space Grotesk (heading), Source Sans 3 (body/UI), IBM Plex Mono (metadata) — terhubung ke token Tailwind `font-heading`, `font-sans`, `font-mono`.
- shadcn/ui diinisialisasi (style `base-nova`, base color neutral, CSS variables, icon library Lucide) — `components.json`, `src/lib/utils.ts` (`cn`).
- Halaman placeholder Bahasa Indonesia (`src/app/page.tsx`) — Server Component tanpa `"use client"`.
- Fondasi error global Bahasa Indonesia: `src/app/error.tsx` (Client Component sesuai kontrak Next.js, tanpa stack trace ke pengguna), `src/app/not-found.tsx`, `src/app/loading.tsx`.
- Toolchain testing: Vitest 4 + React Testing Library (`vitest.config.mts`, `src/test/setup.ts`) dan Playwright (`playwright.config.ts`, `e2e/smoke.spec.ts`, webServer otomatis di localhost:3000).
- `.env.example` tanpa nilai secret; `.gitignore` diperluas untuk artefak Playwright.
- Script npm: `typecheck`, `test`, `test:watch`, `test:e2e`.

### Keputusan teknis dalam fase

- `@vitejs/plugin-react-swc` dipilih menggantikan `@vitejs/plugin-react` karena konflik peer dependency Babel 8 pada rantai `@vitejs/plugin-react@6` — SWC juga konsisten dengan toolchain Next.js. (Catatan: Vitest memakai Vite hanya sebagai internal test transformer; bukan pelanggaran ARCH-010/ARCH-012.)
- `vite-tsconfig-paths` dihapus; resolusi alias memakai opsi native `resolve.tsconfigPaths` di Vite.
- Konfigurasi Vitest memakai ekstensi `.mts` sesuai anjuran ESM Vite.
- shadcn v4 default style `base-nova` menggunakan `@base-ui/react` (Base UI) sebagai primitive layer dan paket `shadcn` sebagai runtime CSS preset (`@import "shadcn/tailwind.css"`), bukan Radix per komponen.
- File template `AGENTS.md`, `CLAUDE.md`, `README.md`, dan asset `public/*.svg` bawaan scaffold dipertahankan (tidak dihapus tanpa audit).
- Scaffold dilakukan via subfolder sementara `pt-ai-lms` karena npm menolak nama folder berhuruf kapital `PT-AI`; seluruh isi dipindahkan ke root (nama package: `pt-ai-lms`).

### Hasil verifikasi (dijalankan nyata)

- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm run test` → 2 file, 5 test lulus.
- `npm run build` → sukses (route `/` dan `/_not-found` static).
- `npm run test:e2e` → 2 test Playwright lulus (beranda + 404).
- `npm run dev` → ready 643ms; HTTP 200 di http://localhost:3000 dengan konten terverifikasi.

## [PHASE 0] — 2026-08-05 — Repository Audit and Planning

- Audit repository: folder kosong, greenfield, tanpa kode Vite/React lama.
- Dokumen dasar dibuat: DECISIONS, MASTER_PLAN, PROGRESS, ARCHITECTURE, ENVIRONMENT.
