<!-- @format -->

# CHANGELOG — PT-AI Learning Management System

Mencatat perubahan arsitektur dan perubahan signifikan per fase.

## [PHASE 9] — 2026-08-28 — Source Verification

### Ditambahkan

- `src/lib/constants/verification.ts` — enam kriteria LOCK-PED-007 dengan kunci yang sama seperti constraint database.
- `src/lib/validation/sources.ts`, `src/server/repositories/sources.ts`.
- `src/actions/sources/{curation,verification}.ts` — kurasi sumber, source pack, klaim kasus, verifikasi, penautan bukti.
- Rute `/app/lecturer/sources`; source pack dan klaim pada halaman unit perancang materi.
- Test: `source-validation.test.ts` (9), `source-access.test.sql` (11), `verification.spec.ts` (6), `curation.spec.ts` (3).

### Diubah

- `VerificationChecklist` dan `ClaimEvidenceLinker` menyimpan ke database, bukan state lokal.
- `SourceViewer` dan `EvidenceCard` memakai data sumber nyata beserta status verifikasi mahasiswa.
- Halaman sumber menerima parameter `?activity=` karena verifikasi selalu tercatat dalam konteks tugas.
- `scripts/run-db-tests.mjs` menolak berkas pgTAP yang jumlah testnya tidak cocok dengan `plan(n)`.
- `scripts/seed-dev-academics.mjs` menyeed dua sumber terkurasi dan dua klaim kasus.

### Dihapus

- `src/mocks/sources.ts` dan `src/mocks/claims.ts`; tipe sumber dan klaim dibuang dari `types/learning.ts`.

### Dependency baru

Tidak ada. Unggah berkas ke Supabase Storage ditunda — `source_files` sudah siap tetapi belum dibutuhkan.

## [PHASE 8] — 2026-08-28 — Student Learning Workspace

### Ditambahkan

- `src/server/repositories/attempts.ts` — keadaan kerja aktivitas, riwayat mahasiswa, antrean tinjauan dosen.
- `src/actions/learning/attempts.ts` — `saveDraftAction` dan `submitAttemptAction` dengan `content_hash` sisi server dan idempotensi `client_submission_id`.
- `src/lib/validation/attempts.ts` — skema Zod draf dan pengiriman respons awal.
- `src/features/learning-workspace/components/answer-editor.tsx` — autosave ter-debounce dengan indikator status.
- `e2e/fixtures/learning-content.ts` — pembuat unit sekali pakai untuk pengujian attempt yang dapat diulang.
- Test: `attempt-validation.test.ts` (5), `attempt-integrity.test.sql` (10), `attempt.spec.ts` (6), `review.spec.ts` (2).

### Diubah

- `AttemptGate` membaca draf dan baseline dari database; keadaan tidak lagi disimulasikan di klien.
- Halaman tahap mahasiswa memuat keadaan kerja aktivitas pertama tahap tersebut.
- `/app/student/progress` menampilkan respons yang sudah dikirim; `/app/lecturer/review` menampilkan antrean nyata tanpa kendali ubah.
- `student.spec.ts` tidak lagi mengirim baseline — penguncian AI diuji di `attempt.spec.ts` dengan data sekali pakai.
- `playwright.config.ts` mendaftarkan `attempt.spec.ts` dan `review.spec.ts`.

### Dependency baru

Tidak ada.

## [PHASE 7] — 2026-08-12 — Course Builder

### Ditambahkan

- `src/lib/constants/stages.ts` — pemetaan enum tahap dan dimensi ke label Indonesia serta `resolveStageAccess()`.
- `src/lib/validation/content.ts` — skema Zod untuk modul, unit, kasus, aktivitas, instruksi, tahap, dan rubrik.
- `src/server/repositories/{content,rubrics}.ts` — pembacaan materi untuk dosen dan mahasiswa secara terpisah.
- `src/actions/courses/{content,rubrics}.ts` — Server Actions materi dan rubrik dengan publikasi berjenjang.
- Rute `/app/lecturer/classes/[classId]/builder`, `.../builder/units/[unitId]`, dan `/app/lecturer/rubrics`.
- `src/features/course-builder/components/{builder-forms,rubric-forms}.tsx`.
- Test: `content-validation.test.ts` (9), `content-access.test.sql` (10), `builder.spec.ts` (5 skenario E2E).

### Diubah

- `LearningStageKey` mengikuti enum `stage_key` database (Inggris) agar URL tahap konsisten dengan basis data.
- Dashboard, detail kelas, dan ruang belajar mahasiswa membaca modul, unit, kasus, tahap, serta aktivitas dari database.
- Halaman kelas dosen menampilkan struktur materi nyata dan tautan ke perancang materi.
- `scripts/seed-dev-academics.mjs` menyeed modul, unit, kasus, aktivitas, dan instruksi.
- `playwright.config.ts` mendaftarkan `builder.spec.ts` pada project `lecturer`.

### Dihapus

- `src/mocks/units.ts` dan `src/mocks/cases.ts` — digantikan data nyata; `MOCK_CLAIMS` dipindah ke `src/mocks/claims.ts`.

### Dependency baru

Tidak ada.

## [PHASE 6] — 2026-08-12 — Academic Structure

### Ditambahkan

- `src/server/repositories/*` — lapisan akses data `server-only` dengan penanganan galat terpusat.
- `src/server/services/account-service.ts` — pembuatan akun dan pengelolaan peran melalui `withAuditedAdmin()`.
- `src/actions/administration/accounts.ts` dan `src/actions/academics/structure.ts` — Server Actions bervalidasi Zod dengan guard peran.
- Area `/app/admin/*`: dashboard, pengguna, organisasi, periode akademik, mata kuliah, kelas, detail kelas.
- `ClassCard` berbasis data nyata; skrip `npm run db:seed:academics`.
- Test: `academics-validation` (unit), `academic-access.test.sql` (8 skenario), `admin.spec.ts` (5 skenario E2E).

### Diubah

- Halaman kelas mahasiswa dan dosen membaca database, bukan mock.
- Detail kelas dilindungi `requireClassAccess()` / `requireLecturerOfClass()`.
- `signIn` membedakan rate limit (429) dari kredensial salah.
- `test:e2e` memuat `.env.local` di proses induk.
- Skrip seed akun memverifikasi kredensial dapat dipakai masuk.

### Dihapus

- `src/mocks/classes.ts` — digantikan data nyata.

### Dependency baru

Tidak ada.

### Status verifikasi

`lint` ✓ · `typecheck` ✓ · `test` 58/58 ✓ · `test:db` 26/26 ✓ · `test:e2e` 30/30 ✓ · `build` 25 route ✓ · `check:secrets` ✓.

## [PHASE 5] — 2026-08-12 — Supabase SSR Authentication

### Ditambahkan

- `src/lib/supabase/{client,server,admin}.ts` — tiga klien terpisah; `admin.ts` bertanda `server-only` dan seluruh operasinya dibungkus `withAuditedAdmin()` yang menulis `audit_logs`.
- `src/proxy.ts` — penyegaran cookie sesi + redirect optimistik, dengan matcher yang mengecualikan aset statis.
- `src/lib/supabase/auth.ts` — Data Access Layer otorisasi berbasis `getUser()`; `src/lib/permissions/roles.ts` untuk logika peran murni.
- `src/lib/errors/index.ts` — domain error dengan pemisahan `publicMessage` dan detail internal.
- `src/lib/validation/auth.ts` — skema Zod untuk masuk, permintaan reset, dan penetapan kata sandi baru.
- Server Actions `src/actions/auth/*` dan Route Handler `/auth/callback`.
- Halaman `/login`, `/forgot-password`, `/reset-password`, `/app/forbidden` yang fungsional.
- Skrip `npm run db:seed:users` dan `npm run check:secrets`.
- E2E terstruktur per peran memakai `storageState` (project `setup`, `guest`, `student`, `lecturer`).

### Diubah

- `/app` tidak lagi meminta pengguna memilih peran; peran diambil dari sesi server (SEC-004).
- Layout mahasiswa dan dosen memanggil `requireStudentAccess()` / `requireLecturerAccess()` serta menampilkan profil nyata.
- `signOut()` memakai `scope: "local"` agar keluar di satu perangkat tidak memutus sesi perangkat lain.

### Dependency baru

`@supabase/supabase-js`, `@supabase/ssr`, `zod`, `server-only`.

### Status verifikasi

`lint` ✓ · `typecheck` ✓ · `test` 50/50 ✓ · `test:e2e` 24/24 ✓ · `test:db` 18/18 ✓ · `build` (20 route) ✓ · `check:secrets` nol kebocoran ✓.

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
