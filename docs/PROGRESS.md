<!-- @format -->

# PROGRESS — PT-AI Learning Management System

Dokumen ini mencatat kemajuan setiap fase. Diperbarui pada akhir setiap fase atau saat terjadi perubahan signifikan.

## Status Fase

| Fase | Nama                                | Status                                    | Mulai      | Selesai    |
| ---- | ----------------------------------- | ----------------------------------------- | ---------- | ---------- |
| 0    | Repository Audit and Planning       | ✅ SELESAI — disetujui                    | 2026-08-05 | 2026-08-05 |
| 1    | Next.js Foundation                  | ✅ SELESAI — disetujui                    | 2026-08-05 | 2026-08-05 |
| 2    | Design System and Application Shell | ✅ SELESAI — disetujui                    | 2026-08-05 | 2026-08-05 |
| 3    | Visual Prototype                    | ✅ SELESAI — menunggu persetujuan PHASE 4 | 2026-08-11 | 2026-08-11 |
| 4    | Database Architecture               | ✅ SELESAI — menunggu persetujuan PHASE 5 | 2026-08-11 | 2026-08-12 |
| 5    | Supabase SSR Authentication         | ✅ SELESAI — menunggu persetujuan PHASE 6 | 2026-08-12 | 2026-08-12 |
| 6    | Academic Structure                  | ✅ SELESAI — disetujui                    | 2026-08-12 | 2026-08-12 |
| 7    | Course Builder                      | ✅ SELESAI — menunggu persetujuan PHASE 8 | 2026-08-12 | 2026-08-12 |
| 8    | Student Learning Workspace          | ⬜ Belum dimulai                          | —          | —          |
| 9    | Source Verification                 | ⬜ Belum dimulai                          | —          | —          |
| 10   | AI Coach and RAG                    | ⬜ Belum dimulai                          | —          | —          |
| 11   | Mastery and Branching               | ⬜ Belum dimulai                          | —          | —          |
| 12   | Revision and Reflection             | ⬜ Belum dimulai                          | —          | —          |
| 13   | Analytics                           | ⬜ Belum dimulai                          | —          | —          |
| 14   | Research and Governance             | ⬜ Belum dimulai                          | —          | —          |
| 15   | Production Hardening                | ⬜ Belum dimulai                          | —          | —          |

## Log PHASE 7 — Course Builder (2026-08-12)

### Yang dikerjakan

- **Konstanta tahap**: `src/lib/constants/stages.ts` memetakan enum `stage_key` berbahasa Inggris (DB-02) ke label Indonesia, sekaligus menyediakan `resolveStageAccess()`. `LearningStageKey` pada `src/types/learning.ts` disamakan dengan enum database sehingga URL tahap dapat dipetakan langsung tanpa penerjemahan.
- **Validasi konten**: `src/lib/validation/content.ts` — skema Zod untuk modul, unit, kasus, aktivitas, instruksi, tahap, rubrik, kriteria, dan level. Skema tahap **sengaja tidak memuat** `stageKey` maupun `sequence` agar urutan LOCK-PED-002 tidak dapat diubah lewat formulir.
- **Repository**: `src/server/repositories/content.ts` dan `rubrics.ts` (`server-only`), termasuk pandangan khusus mahasiswa yang hanya memuat aktivitas terbit dan instruksi beraudiens mahasiswa.
- **Server Actions**: `src/actions/courses/{content,rubrics}.ts`, seluruhnya berpagar `requireLecturerOfClass()` atau `requireRoleOrThrow("lecturer")`.
- **Publikasi berjenjang**: unit ditolak terbit bila belum memiliki kasus atau belum memiliki satu pun aktivitas, dengan pesan Indonesia yang menjelaskan langkah perbaikan.
- **UI dosen**: `/app/lecturer/classes/[classId]/builder` (modul dan unit) serta `/builder/units/[unitId]` (kasus, enam tahap, aktivitas, instruksi), dan `/app/lecturer/rubrics` (rubrik, kriteria per dimensi, level).
- **Ruang belajar mahasiswa memakai data nyata**: dashboard, detail kelas, `/app/student/learn/[unitId]`, dan `/stage/[stageKey]` membaca modul, unit, kasus, tahap, serta aktivitas dari database.
- **Mock dihapus**: `src/mocks/units.ts` dan `src/mocks/cases.ts` dihapus; `MOCK_CLAIMS` dipindah ke `src/mocks/claims.ts` untuk dipakai PHASE 9.
- Seed pengembangan diperluas dengan modul, unit, kasus, aktivitas, dan instruksi agar pengujian E2E deterministik.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                                  |
| `npm run test`               | ✅ 13 file, **67 test** lulus                              |
| `npm run test:db`            | ✅ **36/36** lulus (18 RLS + 8 akademik + 10 akses konten) |
| `npm run test:e2e`           | ✅ **38/38** lulus                                         |
| `npm run build`              | ✅ 28 route                                                |
| `npm run check:secrets`      | ✅ nol kebocoran                                           |
| `npm run check:sql`          | ✅ 7/7 pemeriksaan bersih                                  |

### Masalah yang ditemukan dan diperbaiki

1. **Zod v4 menolak UUID yang bukan versi 1–8.** UUID contoh pada pengujian sempat membuat kasus uji gagal padahal skemanya benar; diganti dengan UUID v4 yang sah.
2. **SQLSTATE `protect_stage_order()` adalah `23001`, bukan `P0001`.** Ekspektasi pgTAP dikoreksi setelah membaca keluaran uji, bukan sebaliknya.
3. **`Set-Content -Encoding UTF8` pada PowerShell 5.1 menyisipkan BOM** sehingga PostgreSQL menolak berkas SQL. Penulisan ulang memakai `UTF8Encoding($false)`.
4. **Playwright menganggap `<option>` tidak terlihat**, sehingga `getByText(...).first()` memilih opsi select dan gagal. Asersi dipersempit ke daftar rubrik.
5. **`page.url()` tepat setelah `click()` masih mengembalikan URL lama**; navigasi ditunggu lebih dulu dengan `expect(page).toHaveURL()`.
6. **Spesifikasi E2E baru tidak berjalan** karena `testMatch` project Playwright bersifat eksplisit; `builder.spec.ts` didaftarkan ke project `lecturer`.

### Mock yang masih tersisa

`src/mocks/{sources,claims,ai-feedback,analytics,users}.ts` — dihapus pada PHASE 9, 10, dan 13. Halaman yang masih memakainya tetap menampilkan `MockBanner`.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 8 — Student Learning Workspace.

## Log PHASE 6 — Academic Structure (2026-08-12)

### Yang dikerjakan

- **Lapisan data**: `src/server/repositories/` (organizations, academic-periods, courses, classes, profiles) bertanda `server-only`, dengan helper `unwrap()` agar galat mentah database tidak pernah bocor ke pengguna.
- **Service akun**: `createAccount()`, `grantRole()`, `revokeRole()` — seluruhnya lewat `withAuditedAdmin()` sehingga tercatat di `audit_logs`. Pembuatan profil yang gagal membatalkan akun auth agar tidak meninggalkan akun yatim.
- **Server Actions**: fakultas, program studi, periode akademik, mata kuliah, kelas, status publikasi, penugasan dosen, enrollment — semua divalidasi Zod dan diperiksa `requireAdminAccess()`.
- **Area admin**: dashboard, pengguna, organisasi, periode akademik, mata kuliah, kelas, dan detail kelas; ber-guard `requireAdminAccess()` dengan `loading.tsx`/`error.tsx`.
- **Penggantian mock**: `/app/student/classes` dan `/app/lecturer/classes` beserta detailnya kini membaca database. `src/mocks/classes.ts` **dihapus**; `ClassCard` menggantikan `CourseCard` berbasis mock.
- **Guard akses kelas**: detail kelas mahasiswa memanggil `requireClassAccess()`, detail kelas dosen memanggil `requireLecturerOfClass()`.
- Skrip `npm run db:seed:academics` menyiapkan mata kuliah, kelas terbit, penugasan dosen, dan enrollment untuk akun dev.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                |
| ---------------------------- | ---------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                            |
| `npm run test`               | ✅ 12 file, **58 test** lulus                        |
| `npm run test:db`            | ✅ **26/26** lulus (18 RLS + 8 akses akademik)       |
| `npm run test:e2e`           | ✅ **30/30** lulus (guest, student, lecturer, admin) |
| `npm run build`              | ✅ 25 route                                          |
| `npm run check:secrets`      | ✅ nol kebocoran                                     |

### Masalah yang ditemukan dan diperbaiki

1. **Relasi ambigu PostgREST.** `class_lecturers` dan `enrollments` masing-masing punya dua foreign key ke `profiles`, dan `role_assignments` punya tiga. Query harus menunjuk kolom eksplisit (`profiles!lecturer_id`, `role_assignments!profile_id`).
2. **`process.loadEnvFile()` di `playwright.config.ts` tidak terbaca worker**, sehingga seluruh project ber-sesi hilang diam-diam. Env kini dimuat proses induk lewat skrip `test:e2e`.
3. **Rate limit auth disamarkan sebagai "kata sandi salah".** Kini status 429 dijawab pesan sendiri — rate limit bukan informasi sensitif, dan menyamarkannya menyesatkan pengguna.
4. **Kredensial dev pernah tidak sinkron** antara `.env.local` dan database. Skrip seed kini **memverifikasi** setiap kredensial dapat dipakai masuk sebelum menyatakan berhasil.
5. `Remove-Item` pada path dengan kurung siku memerlukan `-LiteralPath` di PowerShell.

### Mock yang masih tersisa

`src/mocks/{sources,ai-feedback,analytics}.ts` masih dipakai untuk konten pembelajaran dan analitik — dihapus pada PHASE 9 s.d. 13. Halaman yang masih memakainya tetap menampilkan `MockBanner`.

### Checkpoint

✅ **DISETUJUI.** PHASE 7 — Course Builder dilanjutkan.

## Log PHASE 5 — Supabase SSR Authentication (2026-08-12)

### Yang dikerjakan

- Tiga klien Supabase: `client.ts` (browser), `server.ts` (cookie SSR), `admin.ts` (service role, `server-only`, seluruh pemakaian dibungkus `withAuditedAdmin()` yang menulis `audit_logs`).
- `src/proxy.ts`: menyegarkan cookie sesi + redirect optimistik. Sesuai panduan Next.js 16, proxy **tidak** dipakai sebagai lapisan otorisasi.
- Data Access Layer `lib/supabase/auth.ts`: `getCurrentUser` (memakai `getUser()`, bukan `getSession()`), `requireUser`, `requireRole`/`requireRoleOrThrow`, `requireClassAccess`, `requireLecturerOfClass`, `requireAdminAccess`. Dibungkus `cache()` agar satu render satu pemeriksaan.
- Logika peran murni dipisah ke `lib/permissions/roles.ts` agar dapat diuji tanpa melanggar `server-only`.
- Server Actions: `sign-in`, `sign-out`, `request-password-reset`, `update-password` — seluruhnya divalidasi Zod di server.
- Route Handler `/auth/callback` untuk menukar kode tautan surel menjadi sesi.
- Halaman fungsional: `/login`, `/forgot-password`, `/reset-password`, `/app/forbidden`.
- Domain error (`lib/errors`) dengan `publicMessage` terpisah dari detail internal.
- Skrip `npm run db:seed:users` (akun pengembangan) dan `npm run check:secrets` (pemindaian bundel klien).

### Utang teknis PHASE 3 yang dilunasi

- Route `/app` **tidak lagi** meminta pengguna memilih peran; peran diambil dari sesi server lalu dialihkan (SEC-004).
- Identitas pada Topbar dan dashboard mahasiswa beralih dari `MOCK_STUDENT`/`MOCK_LECTURER` ke profil nyata.

### Hasil verifikasi (dijalankan nyata)

| Perintah                | Hasil                                           |
| ----------------------- | ----------------------------------------------- |
| `npm run lint`          | ✅ exit 0                                       |
| `npm run typecheck`     | ✅ exit 0                                       |
| `npm run test`          | ✅ 11 file, **50 test** lulus                   |
| `npm run test:e2e`      | ✅ **24 test** lulus (guest, student, lecturer) |
| `npm run test:db`       | ✅ 18/18 lulus                                  |
| `npm run build`         | ✅ 20 route; Proxy terdaftar                    |
| `npm run check:secrets` | ✅ 30 berkas bundel dipindai, **nol kebocoran** |

### Masalah yang ditemukan dan diperbaiki

1. **`server-only` memblokir unit test** — justru bukti proteksi bekerja. Logika peran murni dipindah ke `lib/permissions/roles.ts`.
2. **Rate limit Supabase Auth** saat 8 worker login bersamaan. Diganti pola `storageState`: login sekali di project `setup`, sesinya dipakai ulang.
3. **Test logout mencabut sesi test lain.** `signOut()` Supabase default ber-scope global sehingga mencabut refresh token di semua perangkat. Diubah menjadi `scope: "local"` — sekaligus keputusan produk: keluar di satu perangkat tidak mengeluarkan perangkat lain. Test logout juga diisolasi dengan sesinya sendiri.
4. **Selector `getByRole("alert")` ambigu** karena Next.js menambahkan route announcer ber-role `alert`.

### Catatan

- Alur surel reset password belum diuji ujung ke ujung karena bergantung pada konfigurasi SMTP Supabase; yang diuji adalah bahwa halaman tidak membocorkan surel terdaftar.
- Akun pengembangan memakai kata sandi acak yang ditulis langsung ke `.env.local` oleh skrip, tidak dicetak di terminal.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 6 — Academic Structure.

## Log PHASE 4B — Implementasi Database (2026-08-11 s.d. 2026-08-12)

> ✅ **SELESAI.** Seluruh migration diterapkan ke Supabase Cloud dan 18 skenario test RLS lulus — dijalankan nyata, bukan diklaim.

### Persetujuan yang tercatat

ERD disetujui 2026-08-11; DB-01 s.d. DB-07 diterima sesuai usulan dan berstatus LOCKED di [DECISIONS.md](DECISIONS.md).

### Yang diterapkan

| Berkas                                               | Isi                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `supabase/migrations/…0001_extensions_and_types.sql` | 3 ekstensi + 23 enum                                                                       |
| `…0002` s.d. `…0012`                                 | 60 tabel dalam 10 domain + schema `research` (3 view export berpseudonim)                  |
| `…0013_functions_and_triggers.sql`                   | 19 fungsi, 15 trigger append-only, trigger seed 6 tahap, penegak baseline/AI/penilai dosen |
| `…0014_rls_policies.sql`                             | RLS aktif seluruh tabel + policy per peran                                                 |
| `…0015_indexes.sql`                                  | 45 index, termasuk HNSW pgvector                                                           |
| `supabase/seed/0001_development_seed.sql`            | Struktur akademik minimal                                                                  |
| `supabase/tests/rls.test.sql`                        | 18 skenario pgTAP                                                                          |
| `src/lib/supabase/types.ts`                          | Generated types — 3.583 baris, 63 definisi Row                                             |

### Hasil verifikasi (dijalankan nyata)

| Perintah                                        | Hasil                                                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npx supabase db push`                          | ✅ 15/15 migration diterapkan, **nol error SQL**                                                                            |
| `npm run test:db`                               | ✅ **18 lulus, 0 gagal**                                                                                                    |
| `npm run db:seed`                               | ✅ organizations 1, faculties 1, study_programs 1, academic_periods 1, roles 3, error_categories 10, data_retention_rules 2 |
| `npx supabase gen types`                        | ✅ 63 Row (60 tabel + 3 view)                                                                                               |
| `npm run lint` / `typecheck` / `test` / `build` | ✅ exit 0; 35 test lulus; 17 route                                                                                          |
| `npm run check:sql`                             | ✅ 7/7 pemeriksaan konsistensi                                                                                              |

### Masalah yang ditemukan dan diperbaiki selama fase

1. **Dua kebocoran policy** (ditemukan saat telaah sendiri sebelum push): `learning_units_lecturer_write` memiliki `with check (... or true)` sehingga pemeriksaan tulis selalu lolos; `lecturer_overrides_select` memberi seluruh mahasiswa akses ke seluruh override. Keduanya diperbaiki.
2. **`types.ts` tersimpan UTF-16LE** karena perilaku redirect `>` pada PowerShell 5.1 — dikonversi ke UTF-8 (221 KB → 107 KB).
3. **`supabase test db --linked` ternyata tetap memerlukan Docker.** Dibuat runner sendiri (`npm run test:db`) memakai driver `pg`, sehingga test dapat diulang dan siap dipakai CI.
4. **`pooler-url` hasil `link` tidak memuat kredensial** — penyusun connection string diperbaiki agar mengambil username dari `project-ref`.
5. **9 dari 10 kegagalan test pertama adalah kesalahan penulisan test**, bukan celah keamanan: `throws_ok(sql, deskripsi)` membuat pgTAP menafsirkan argumen kedua sebagai pesan error yang diharapkan. Diperbaiki menjadi `throws_ok(sql, SQLSTATE, null, deskripsi)` sehingga kini menguji kode error spesifik.
6. **Temuan nyata dari test:** mahasiswa yang menjalankan `UPDATE` pada baseline tidak menerima error karena RLS membuatnya mengenai nol baris. Data tetap aman, tetapi test diubah agar memverifikasi isi baseline benar-benar tidak berubah.

### Catatan keamanan

Password database sempat ditulis literal di terminal sehingga terekspos pada riwayat dan konteks. Pengguna telah diberi tahu untuk melakukan reset password. Kredensial tidak pernah dikirim melalui percakapan; berkas `.env*` tetap tidak terlacak git (diverifikasi).

### Dependency baru

`pg` dan `@types/pg` (devDependency) — diperlukan untuk menjalankan test pgTAP tanpa Docker.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 5 — Supabase SSR Authentication.

## Log PHASE 4A — Database Design (2026-08-11)

### Keputusan lingkungan (dipilih pengguna)

- **Supabase Cloud** (Docker tidak terpasang, dan tidak diperlukan).
- **Seluruh domain sekaligus** — 60 tabel, bukan bertahap.
- **ERD ditinjau lebih dahulu** sebelum satu baris SQL ditulis.

### Yang dikerjakan (dokumen saja — tanpa SQL, tanpa dependency)

- [DATABASE.md](DATABASE.md) — prinsip, konvensi, 23 enum, ERD Mermaid per 10 domain, aturan integritas, fungsi/trigger RLS, rencana index, rencana migration 15 file + rollback, pemetaan requirement→mekanisme, 7 keputusan terbuka.
- [DATABASE_DICTIONARY.md](DATABASE_DICTIONARY.md) — kamus data 60 tabel + schema `research`: kolom, tipe, constraint, index, alasan keberadaan.
- [RLS_MATRIX.md](RLS_MATRIX.md) — hak SELECT/INSERT/UPDATE/DELETE per peran untuk seluruh tabel + 18 skenario uji yang akan dijalankan pada 4B.

### Keputusan desain utama

1. **`attempt_drafts` dipisah dari `attempts`** — autosave butuh tulis berulang, sementara baseline tidak boleh ditimpa. Pemisahan ini menyelesaikan konflik tanpa melanggar LOCK-PED-004.
2. **Trigger `prevent_mutation()`, bukan hanya RLS** — `service_role` Supabase mem-bypass RLS, sehingga baseline hanya benar-benar aman bila dilindungi trigger.
3. **`ai_interactions.attempt_id NOT NULL`** — attempt-first menjadi kendala database, bukan sekadar aturan aplikasi.
4. **`explanation`/`reason` NOT NULL pada branching** — keputusan adaptif tanpa alasan tidak dapat disimpan.
5. **Admin ⛔ pada nilai dan jawaban** di matriks RLS (SEC-005).
6. **Schema `research` + pseudonim**, view memfilter consent aktif.

### Verifikasi

Tidak ada perintah yang dapat dijalankan pada 4A (tanpa kode). Validasi dilakukan dengan menelusuri seluruh butir requirement §13 dan LOCK-PED ke mekanisme database — hasilnya ada di tabel pemetaan [DATABASE.md](DATABASE.md) bagian 10.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan ERD dan jawaban atas DB-01…DB-07 sebelum PHASE 4B (menulis migration).

## Log PHASE 3 — Visual Prototype (2026-08-11)

### Yang dikerjakan

- Tipe domain + mock data berlabel (`src/types/learning.ts`, `src/mocks/*`).
- 10 card variant, `MockBanner`, komponen learning workspace (PhaseRail/PhaseStepper, CaseReader, AttemptGate, MasteryStatus), AI coach (AIBoundaryNotice, AIFeedbackPanel), verifikasi (SourceViewer, VerificationChecklist, ClaimEvidenceLinker).
- Route: `/login`, `/forgot-password`, `/app`, 6 halaman mahasiswa, 4 halaman dosen, plus `loading.tsx`/`error.tsx` per area.
- Attempt-first terlihat secara visual: panel AI terkunci sampai respons awal disimpan; baseline ditampilkan read-only; revisi sebagai bagian terpisah.

### Hasil verifikasi (dijalankan nyata, bukan klaim)

| Perintah            | Hasil                                                          |
| ------------------- | -------------------------------------------------------------- |
| `npm run lint`      | ✅ exit 0                                                      |
| `npm run typecheck` | ✅ exit 0                                                      |
| `npm run test`      | ✅ 9 file, 35 test lulus                                       |
| `npm run build`     | ✅ 17 route (12 static, 5 dynamic)                             |
| `npm run test:e2e`  | ✅ 11 test lulus (3 gagal pada percobaan pertama → diperbaiki) |

### Utang teknis yang harus dibereskan pada fase berikutnya

1. **Hapus `src/mocks/` dan seluruh `MockBanner`** ketika data nyata tersedia (PHASE 6+).
2. **Hapus route `/app`** (pemilih peran prototipe) pada PHASE 5 — peran wajib berasal dari sesi server.
3. Pasang proteksi nyata pada route group `(protected)` (PHASE 5).
4. Ganti aksi yang dinonaktifkan (`Simpan verifikasi`, `Simpan revisi`, `Tinjau`, aksi AI) dengan Server Action pada fase terkait.
5. Gate atau hapus `/design-system` sebelum produksi (PHASE 15).

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 4 — Database Architecture (ERD wajib disetujui sebelum migration).

## Log PHASE 2 — Design System and Application Shell (2026-08-05)

### Yang dikerjakan

- Design tokens Civic Intelligence lengkap di `globals.css`: palet shell gelap + reading canvas hangat (scope `.reading-surface`), token semantik (aqua/violet/amber/mint/coral/blue), skala tipografi LOCKED (display→caption), dimensi layout (sidebar 272/80, topbar 72, context panel 360, max 1600, reading 760), radius dasar 12px, utility `reading-prose`.
- Tema tunggal gelap: block `.dark` dihapus, class `dark` dipasang di `<html>` (NOTE-006).
- Button dikustomisasi penuh: primary aqua 44px/12px/600, ai violet tinted, outline, ghost, danger coral, link; `data-variant` untuk testing.
- Komponen shadcn ditambahkan + terkena token kustom: card, badge, skeleton, sheet, separator, tooltip (tanpa paket npm baru).
- `StatusBadge` 9 varian semantik; 6 komponen state (Loading/Skeleton/Empty/Error/Forbidden/Locked) berbasis `StateShell` server-compatible.
- AppShell responsif: `Sidebar`+`SidebarNav` (272↔80px, tooltip saat rail, indikator aktif aqua), `Topbar` 72px, `MobileNavigation` bottom nav ≥44px, drawer Sheet mobile, skip link, `PageContainer`, `PageHeader`, `BentoGrid` asimetris; navigasi berbasis icon key yang serializable (`src/lib/navigation.ts`).
- Halaman galeri `/design-system` berlabel "Preview internal" (bukan fitur produk).

### Hasil verifikasi (dijalankan nyata, bukan klaim)

| Perintah            | Hasil                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `npm run lint`      | ✅ exit 0                                                                                |
| `npm run typecheck` | ✅ exit 0 (1 error exactOptionalPropertyTypes ditemukan lalu diperbaiki)                 |
| `npm run test`      | ✅ 6 file, 23 test lulus                                                                 |
| `npm run build`     | ✅ sukses; route `/`, `/_not-found`, `/design-system` static                             |
| `npm run test:e2e`  | ✅ 5 test lulus — termasuk ukur sidebar 272↔80px & touch target ≥44px (viewport 390×844) |

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 3 — Visual Prototype.

## Log PHASE 1 — Next.js Foundation (2026-08-05)

### Yang dikerjakan

- Next.js 16.3.0 App Router + TypeScript + Tailwind v4 + ESLint 9, `src/` + alias `@/*` (scaffold via subfolder sementara `pt-ai-lms`, dipindah ke root).
- TS strict penuh: `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — aktif tanpa merusak dependency.
- Font tema via `next/font/google` di `src/lib/fonts.ts` + wiring token `font-heading`/`font-sans`/`font-mono` di `globals.css`.
- shadcn/ui init (base-nova, neutral, CSS variables, Lucide).
- Halaman placeholder `/` Bahasa Indonesia (Server Component); `error.tsx`, `not-found.tsx`, `loading.tsx` Bahasa Indonesia.
- Vitest 4 + RTL (5 test) dan Playwright (2 smoke test) + `.env.example` + script npm baru.
- Dokumen baru: CHANGELOG, TESTING, ROUTES, SECURITY.

### Hasil verifikasi (dijalankan nyata, bukan klaim)

| Perintah                                           | Hasil                                              |
| -------------------------------------------------- | -------------------------------------------------- |
| `npm run lint`                                     | ✅ exit 0                                          |
| `npm run typecheck`                                | ✅ exit 0                                          |
| `npm run test`                                     | ✅ 2 file, 5 test lulus                            |
| `npm run build`                                    | ✅ sukses; route `/` dan `/_not-found` static      |
| `npx playwright install chromium`                  | ✅ exit 0                                          |
| `npm run test:e2e`                                 | ✅ 2 test lulus (26.9s)                            |
| `npm run dev` + `Invoke-WebRequest localhost:3000` | ✅ Ready 643ms; HTTP 200; judul aplikasi ditemukan |

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 2 — Design System and Application Shell.

## Log PHASE 0 — Repository Audit and Planning (2026-08-05)

### Hasil audit

- Folder `d:\PT-AI` kosong total (0 item termasuk file tersembunyi) — diverifikasi via `Get-ChildItem -Force -Recurse`.
- Belum ada git repository (`git status` → "not a git repository").
- Tidak ada `package.json`, tidak ada file environment, tidak ada kode Vite/React lama.
- Tidak ada konflik dengan Next.js App Router.
- **Kesimpulan: greenfield project. Tidak diperlukan migration plan dari Vite.**

### Environment terverifikasi

- Node.js: v24.14.0
- npm: 11.9.0
- git: 2.45.1.windows.1
- OS: Windows

### Artefak yang dibuat

- `docs/DECISIONS.md` — Decision Log dengan seluruh keputusan LOCKED/OPEN/DEFERRED/REJECTED.
- `docs/MASTER_PLAN.md` — Rencana induk 16 fase.
- `docs/PROGRESS.md` — Dokumen ini.
- `docs/ARCHITECTURE.md` — Arsitektur target dan proposed folder tree.
- `docs/ENVIRONMENT.md` — Versi environment dan variabel environment terencana.

### Tindakan yang TIDAK dilakukan (sesuai protokol)

- Tidak menghapus file apapun (tidak ada file untuk dihapus).
- Tidak menginstal dependency.
- Tidak menginisialisasi Next.js.
- Tidak membuat migration database.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 1 — Next.js Foundation.
