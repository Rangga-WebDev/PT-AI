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
| 4    | Database Architecture               | ⬜ Belum dimulai                          | —          | —          |
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
