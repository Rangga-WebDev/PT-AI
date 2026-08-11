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
| 5    | Supabase SSR Authentication         | ⬜ Belum dimulai                          | —          | —          |
| 6    | Academic Structure                  | ⬜ Belum dimulai                          | —          | —          |
| 7    | Course Builder                      | ⬜ Belum dimulai                          | —          | —          |
| 8    | Student Learning Workspace          | ⬜ Belum dimulai                          | —          | —          |
| 9    | Source Verification                 | ⬜ Belum dimulai                          | —          | —          |
| 10   | AI Coach and RAG                    | ⬜ Belum dimulai                          | —          | —          |
| 11   | Mastery and Branching               | ⬜ Belum dimulai                          | —          | —          |
| 12   | Revision and Reflection             | ⬜ Belum dimulai                          | —          | —          |
| 13   | Analytics                           | ⬜ Belum dimulai                          | —          | —          |
| 14   | Research and Governance             | ⬜ Belum dimulai                          | —          | —          |
| 15   | Production Hardening                | ⬜ Belum dimulai                          | —          | —          |

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
