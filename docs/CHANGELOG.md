<!-- @format -->

# CHANGELOG — PT-AI Learning Management System

Mencatat perubahan arsitektur dan perubahan signifikan per fase.

## [PHASE 4] — 2026-08-11 — Database Architecture

### 4A — Desain (selesai, disetujui)

- [DATABASE.md](DATABASE.md), [DATABASE_DICTIONARY.md](DATABASE_DICTIONARY.md), [RLS_MATRIX.md](RLS_MATRIX.md): ERD 10 domain, kamus data 60 tabel, matriks RLS, rencana migration dan rollback.
- OPEN-002 dan DB-01 s.d. DB-07 ditetapkan LOCKED.

### 4B — Implementasi (**selesai dan terverifikasi**)

- 15 file migration di `supabase/migrations/` (2.039 baris) **diterapkan ke Supabase Cloud tanpa error**: ekstensi + 23 enum, 60 tabel, schema `research` dengan 3 view berpseudonim, 19 fungsi `security definer`, 15 trigger append-only, policy RLS seluruh tabel, 45 index.
- `src/lib/supabase/types.ts` — generated types (3.583 baris, 63 Row).
- `supabase/seed/0001_development_seed.sql` dijalankan; `supabase/tests/rls.test.sql` **18/18 lulus**.
- Penegakan pedagogis di level database: `attempt_drafts` vs `attempts`, trigger `prevent_mutation()` yang juga mengikat `service_role`, `ai_interactions.attempt_id NOT NULL`, `reason`/`explanation` NOT NULL pada branching, `require_lecturer_scorer()`, `protect_stage_order()`.
- Skrip pendukung: `npm run test:db` (pgTAP via driver `pg`, tanpa Docker), `npm run db:seed`, `npm run check:sql`.

### Dependency baru

`pg` dan `@types/pg` (devDependency) — `supabase test db` mensyaratkan Docker yang tidak tersedia, sehingga runner sendiri diperlukan agar test RLS dapat dijalankan dan diulang.

### Perbaikan selama fase

- `learning_units_lecturer_write`: `with check (... or true)` → `class_of_module()` yang benar.
- `lecturer_overrides_select`: akses mahasiswa dipersempit ke artefak miliknya sendiri.
- `types.ts` dikonversi dari UTF-16LE ke UTF-8 (efek redirect `>` PowerShell 5.1).
- Pemakaian `throws_ok` diperbaiki menjadi `throws_ok(sql, SQLSTATE, null, deskripsi)` sehingga menguji kode error spesifik.
- Test baseline diubah: `UPDATE` oleh mahasiswa tidak melempar error (RLS membuatnya mengenai nol baris), sehingga yang diverifikasi adalah isi baseline tetap utuh.

### Status verifikasi

`db push` 15/15 ✓ · `test:db` 18/18 ✓ · `db:seed` ✓ · `lint`, `typecheck`, `test` (35), `build` (17 route), `check:sql` (7/7) semuanya exit 0.

## [PHASE 3] — 2026-08-11 — Visual Prototype

### Ditambahkan

- Tipe domain prototipe `src/types/learning.ts` (peran, 6 dimensi, 6 tahap, siklus attempt→mastery, kelas, unit, kasus, sumber, klaim, feedback AI, analitik).
- Mock data berlabel di `src/mocks/` (`users`, `classes`, `units`, `cases`, `sources`, `ai-feedback`, `analytics`) — konstanta ber-prefix `MOCK_`, header `MOCK`, nama fiktif.
- `MockBanner` dan 10 card variant: HeroLearningCard, CourseCard, CaseCard (`learning-cards`), EvidenceCard, AIFeedbackCard (`evidence-cards`), InsightCard, AnalyticsCard, DimensionBars (`insight-cards`), LockedCard, RemedialCard, EnrichmentCard (`pathway-cards`).
- Fitur learning workspace: `PhaseRail`/`PhaseStepper` (6 tahap berurutan), `CaseReader` (kanvas baca hangat), `AttemptGate` (attempt-first + baseline read-only + revisi), `MasteryStatus` (siklus + kriteria kinerja).
- Fitur AI coach: `AIBoundaryNotice`, `AIFeedbackPanel` (aksi Terima/Abaikan/Laporkan, dinonaktifkan pada prototipe).
- Fitur verifikasi: `SourceViewer` (metadata + kutipan), `VerificationChecklist` (6 kriteria interaktif), `ClaimEvidenceLinker`.
- Route publik `/login`, `/forgot-password`; route prototipe `/app`, `/app/student/*` (dashboard, classes, learn/stage, sources, progress), `/app/lecturer/*` (dashboard, classes, review) beserta `loading.tsx` dan `error.tsx` per area.
- Navigasi per peran (`STUDENT_NAV`, `LECTURER_NAV`) di `src/lib/navigation.ts`.
- Test baru: `attempt-gate`, `phase-navigation`, `verification-checklist` + `MockBanner` (RTL) dan `e2e/prototype.spec.ts` (5 skenario desktop + 1 mobile).

### Diubah

- `CardTitle` menerima prop `as` (`div` default, atau `h2`/`h3`/`h4`) agar judul kartu dapat menjadi heading semantik; `AnalyticsCard` memakai `as="h3"`.
- `src/app/page.tsx`: tautan ke halaman masuk, prototipe aplikasi, dan galeri design system.
- Komponen shadcn tambahan: `input`, `label`, `textarea`, `checkbox`, `progress`, `avatar`, `tabs` (disalin CLI, **tanpa** dependency npm baru).

### Catatan penting

- Route group `(protected)` **belum terproteksi**; halaman `/app` (pemilih peran) adalah alat prototipe dan dihapus pada PHASE 5.
- Tidak ada panggilan AI: isi `AIFeedbackPanel` berasal dari mock statis.

### Hasil verifikasi (dijalankan nyata)

- `npm run lint` → exit 0; `npm run typecheck` → exit 0.
- `npm run test` → 9 file, 35 test lulus.
- `npm run build` → sukses (17 route: 12 static, 5 dynamic).
- `npm run test:e2e` → 11 test lulus (3 kegagalan awal ditemukan dan diperbaiki: heading kartu non-semantik + selector teks terlalu longgar).

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
