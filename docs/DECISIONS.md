<!-- @format -->

# DECISIONS — PT-AI Learning Management System

Dokumen ini adalah Decision Log resmi proyek.

Status keputusan:

- **LOCKED** — Sudah disepakati dan tidak boleh diubah diam-diam. Perubahan wajib melalui Change Request dan persetujuan pengguna.
- **OPEN** — Belum diputuskan.
- **DEFERRED** — Ditunda ke fase berikutnya.
- **REJECTED** — Tidak digunakan.

Aturan perubahan:

1. Setiap perubahan keputusan LOCKED menjadi Change Request.
2. Change Request wajib menjelaskan alasan, dampak, risiko, dan alternatif.
3. Change Request tidak boleh diterapkan sebelum persetujuan pengguna.

---

## 1. Keputusan Arsitektur

| ID       | Keputusan                                                                     | Status   | Tanggal    | Catatan                                      |
| -------- | ----------------------------------------------------------------------------- | -------- | ---------- | -------------------------------------------- |
| ARCH-001 | Next.js App Router sebagai framework utama                                    | LOCKED   | 2026-08-05 | Menggantikan rencana React SPA               |
| ARCH-002 | React Server Components sebagai default rendering                             | LOCKED   | 2026-08-05 | Client Components hanya untuk interaktivitas |
| ARCH-003 | Server Actions untuk mutasi yang berasal dari UI                              | LOCKED   | 2026-08-05 | Validasi Zod di server                       |
| ARCH-004 | Route Handlers untuk endpoint khusus (AI streaming, export, webhook, health)  | LOCKED   | 2026-08-05 | —                                            |
| ARCH-005 | Supabase SSR dengan cookie (@supabase/ssr)                                    | LOCKED   | 2026-08-05 | —                                            |
| ARCH-006 | proxy.ts untuk pembaruan sesi dan route-level redirect ringan                 | LOCKED   | 2026-08-05 | Bukan satu-satunya authorization layer       |
| ARCH-007 | Server-side authorization pada Server Component, Server Action, Route Handler | LOCKED   | 2026-08-05 | —                                            |
| ARCH-008 | PostgreSQL Row Level Security sebagai perlindungan data terakhir              | LOCKED   | 2026-08-05 | —                                            |
| ARCH-009 | Alamat pengembangan lokal http://localhost:3000                               | LOCKED   | 2026-08-05 | —                                            |
| ARCH-010 | React SPA dengan Vite                                                         | REJECTED | 2026-08-05 | Digantikan Next.js App Router                |
| ARCH-011 | React Router                                                                  | REJECTED | 2026-08-05 | Digantikan file-system routing               |
| ARCH-012 | vite.config.ts                                                                | REJECTED | 2026-08-05 | —                                            |
| ARCH-013 | Arsitektur frontend-only                                                      | REJECTED | 2026-08-05 | —                                            |
| ARCH-014 | Supabase Edge Functions sebagai backend utama                                 | REJECTED | 2026-08-05 | —                                            |
| ARCH-015 | Data fetching client-side sebagai pola utama                                  | REJECTED | 2026-08-05 | —                                            |
| ARCH-016 | Seluruh halaman menggunakan Client Components                                 | REJECTED | 2026-08-05 | —                                            |
| ARCH-017 | Pages Router                                                                  | REJECTED | 2026-08-05 | Hanya App Router yang digunakan              |

## 2. Keputusan Stack Teknologi

| ID            | Keputusan                                                                                                                     | Status | Tanggal    | Catatan                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------- |
| LOCK-TECH-001 | Next.js App Router versi stable terbaru yang kompatibel                                                                       | LOCKED | 2026-08-05 | Tanpa Pages Router                                   |
| LOCK-TECH-002 | TypeScript strict (strict, noImplicitAny, noUncheckedIndexedAccess, exactOptionalPropertyTypes bila tidak merusak dependency) | LOCKED | 2026-08-05 | Dilarang `any` untuk menyembunyikan error            |
| LOCK-TECH-003 | Node.js LTS-kompatibel + npm                                                                                                  | LOCKED | 2026-08-05 | Versi aktual dicatat di docs/ENVIRONMENT.md          |
| LOCK-TECH-004 | Dev server di http://localhost:3000 via `npm run dev`                                                                         | LOCKED | 2026-08-05 | Port tidak diganti tanpa konflik nyata + persetujuan |
| LOCK-TECH-005 | File-system routing App Router (page/layout/loading/error/not-found/route/proxy, route groups, dynamic segments)              | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-006 | Server Components default; Client Components hanya untuk kebutuhan browser API/interaktivitas                                 | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-007 | Server Actions + Zod untuk seluruh mutasi UI                                                                                  | LOCKED | 2026-08-05 | Validasi browser bukan validasi final                |
| LOCK-TECH-008 | Route Handlers untuk AI streaming, integrasi eksternal, webhook, export, upload khusus, health check                          | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-009 | Proxy hanya untuk refresh cookie sesi, redirect awal, proteksi route ringan, locale/header                                    | LOCKED | 2026-08-05 | Authorization tetap di server + RLS                  |
| LOCK-TECH-010 | Tailwind CSS                                                                                                                  | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-011 | shadcn/ui dikustomisasi penuh                                                                                                 | LOCKED | 2026-08-05 | Tanpa tampilan default                               |
| LOCK-TECH-012 | Lucide React untuk icon                                                                                                       | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-013 | next/font/google: Space Grotesk (heading), Source Sans 3 (body/UI), IBM Plex Mono (metadata)                                  | LOCKED | 2026-08-05 | Tanpa file font manual                               |
| LOCK-TECH-014 | Form: Server Actions + useActionState; React Hook Form hanya form client kompleks; Zod untuk schema                           | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-015 | Server state: Server Components + revalidatePath/Tag; TanStack Query hanya fitur client-heavy                                 | LOCKED | 2026-08-05 | Bukan pola default                                   |
| LOCK-TECH-016 | Client state: React state lokal dahulu; Zustand hanya UI state lintas komponen                                                | LOCKED | 2026-08-05 | Tanpa server data permanen di Zustand                |
| LOCK-TECH-017 | Supabase PostgreSQL sebagai database                                                                                          | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-018 | Supabase Auth SSR cookie via @supabase/ssr; login email+password; akun dibuat admin; reset password via email                 | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-019 | Supabase Storage                                                                                                              | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-020 | Akses database: Supabase JS client, @supabase/ssr, SQL migrations, generated types, RLS, PostgreSQL functions bila perlu      | LOCKED | 2026-08-05 | Prisma/Drizzle butuh persetujuan                     |
| LOCK-TECH-021 | Supabase admin client server-only (import server-only, tanpa NEXT*PUBLIC*, penggunaan dibatasi dan tercatat)                  | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-022 | OpenAI API melalui internal server-only provider adapter                                                                      | LOCKED | 2026-08-05 | Dilarang dipanggil dari browser                      |
| LOCK-TECH-023 | RAG: Supabase PostgreSQL + pgvector                                                                                           | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-024 | Testing: Vitest, React Testing Library, Playwright, database/RLS test, test business logic Server Actions/Route Handlers      | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-025 | Deployment: Vercel (Next.js) + Supabase (DB, Auth, Storage, pgvector)                                                         | LOCKED | 2026-08-05 | —                                                    |
| LOCK-TECH-026 | Tahapan produk: prototype → MVP DB → auth → learning workflow → AI → research → hardening                                     | LOCKED | 2026-08-05 | —                                                    |

## 3. Keputusan Pedagogis

| ID           | Keputusan                                                                                                                                 | Status | Tanggal    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- |
| LOCK-PED-001 | Enam dimensi outcome: Interpretasi, Analisis, Evaluasi, Inferensi, Eksplanasi, Regulasi diri                                              | LOCKED | 2026-08-05 |
| LOCK-PED-002 | Urutan pembelajaran 6 tahap tetap; tidak diganti alur LMS generik                                                                         | LOCKED | 2026-08-05 |
| LOCK-PED-003 | Siklus per tahap: Attempt → Feedback → Verify → Revise → Mastery                                                                          | LOCKED | 2026-08-05 |
| LOCK-PED-004 | Attempt-first rule: baseline tidak ditimpa; AI substantif terkunci sebelum attempt; revisi = versi baru                                   | LOCKED | 2026-08-05 |
| LOCK-PED-005 | AI non-answering: dilarang membuat jawaban final, esai siap kumpul, nilai akhir, sumber fiktif                                            | LOCKED | 2026-08-05 |
| LOCK-PED-006 | AI sebagai mitra kognitif dan objek epistemik yang harus diverifikasi                                                                     | LOCKED | 2026-08-05 |
| LOCK-PED-007 | Source grounding: source pack, metadata, claim-source link, penilaian kredibilitas, kutipan AI dapat ditelusuri                           | LOCKED | 2026-08-05 |
| LOCK-PED-008 | Mastery learning berdasarkan kriteria kinerja, bukan aktivitas klik/waktu akses                                                           | LOCKED | 2026-08-05 |
| LOCK-PED-009 | Adaptive branching transparan: setiap keputusan mempunyai alasan, dapat dilihat, dapat dioverride dosen                                   | LOCKED | 2026-08-05 |
| LOCK-PED-010 | Human oversight: dosen memegang keputusan akademik final                                                                                  | LOCKED | 2026-08-05 |
| LOCK-PED-011 | Refleksi wajib mencakup respons awal, feedback, sumber terverifikasi, revisi, alasan perubahan, saran AI diterima/ditolak, bias, strategi | LOCKED | 2026-08-05 |
| LOCK-PED-012 | Jejak lengkap disimpan: attempt, feedback, verifikasi, revisi, refleksi, mastery, branching, override, disclosure, incident               | LOCKED | 2026-08-05 |

## 4. Keputusan Design System

| ID      | Keputusan                                                                                                            | Status | Tanggal    |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ------ | ---------- |
| DSN-001 | Tema "Civic Intelligence": dark application shell + warm reading canvas                                              | LOCKED | 2026-08-05 |
| DSN-002 | Semantik warna: aqua = tindakan manusia, violet = AI, amber = evidence, mint = verified, coral = danger, blue = info | LOCKED | 2026-08-05 |
| DSN-003 | Palet lengkap sesuai spesifikasi (lihat docs/DESIGN_SYSTEM.md pada PHASE 2)                                          | LOCKED | 2026-08-05 |
| DSN-004 | Tipografi: Space Grotesk / Source Sans 3 / IBM Plex Mono dengan skala ukuran tetap                                   | LOCKED | 2026-08-05 |
| DSN-005 | Dashboard menggunakan asymmetrical bento grid                                                                        | LOCKED | 2026-08-05 |
| DSN-006 | AI tidak boleh lebih dominan secara visual daripada aktivitas mahasiswa                                              | LOCKED | 2026-08-05 |
| DSN-007 | Layout desktop: sidebar 272/80px, topbar 72px, context panel 340–380px, grid 12 kolom, max width ±1600px             | LOCKED | 2026-08-05 |
| DSN-008 | Mobile: bottom navigation, horizontal phase stepper, AI coach bottom sheet, touch target ≥44px                       | LOCKED | 2026-08-05 |

## 5. Keputusan Keamanan

| ID      | Keputusan                                                                  | Status | Tanggal    |
| ------- | -------------------------------------------------------------------------- | ------ | ---------- |
| SEC-001 | Seluruh 25 butir requirement security (bagian 15 requirement) diberlakukan | LOCKED | 2026-08-05 |
| SEC-002 | Secret hanya server-side; tanpa prefix NEXT*PUBLIC* untuk secret           | LOCKED | 2026-08-05 |
| SEC-003 | RLS aktif pada setiap tabel pengguna                                       | LOCKED | 2026-08-05 |
| SEC-004 | Identitas pengguna diambil dari sesi server, bukan dari client             | LOCKED | 2026-08-05 |
| SEC-005 | Admin role terpisah dari academic authority                                | LOCKED | 2026-08-05 |

## 6. Keputusan Terbuka (OPEN)

| ID       | Pertanyaan                                                                | Status | Target Fase                                   |
| -------- | ------------------------------------------------------------------------- | ------ | --------------------------------------------- |
| OPEN-001 | Nama final aplikasi (saat ini sementara: PT-AI LMS)                       | OPEN   | Sebelum production                            |
| OPEN-002 | Detail ERD final dan data dictionary                                      | OPEN   | PHASE 4 (butuh persetujuan sebelum migration) |
| OPEN-003 | Konsolidasi endpoint AI: terpisah per fungsi vs satu endpoint terstruktur | OPEN   | PHASE 10                                      |
| OPEN-004 | Model OpenAI spesifik untuk tiap fungsi AI                                | OPEN   | PHASE 10                                      |
| OPEN-005 | Strategi rate limiting (per user, per class, per activity)                | OPEN   | PHASE 10                                      |
| OPEN-006 | Kebijakan retensi data penelitian                                         | OPEN   | PHASE 14                                      |

## 7. Keputusan Ditunda (DEFERRED)

| ID      | Item                                            | Status   | Alasan                                                                      |
| ------- | ----------------------------------------------- | -------- | --------------------------------------------------------------------------- |
| DEF-001 | Multi-bahasa (i18n) di luar Bahasa Indonesia    | DEFERRED | MVP hanya Bahasa Indonesia                                                  |
| DEF-002 | Multi-institusi aktif                           | DEFERRED | MVP satu universitas; schema tetap siap multi-institusi via organization_id |
| DEF-003 | Metode login selain email+password (SSO, OAuth) | DEFERRED | Di luar scope MVP                                                           |
| DEF-004 | Realtime collaboration                          | DEFERRED | Tidak dibutuhkan MVP                                                        |

## 8. Catatan Implementasi (Bukan Perubahan Keputusan)

| ID       | Catatan                                                                                                                                                                                                                           | Fase    | Tanggal    |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| NOTE-001 | `exactOptionalPropertyTypes` dan `noUncheckedIndexedAccess` berhasil diaktifkan penuh tanpa merusak dependency — LOCK-TECH-002 terpenuhi seluruhnya                                                                               | PHASE 1 | 2026-08-05 |
| NOTE-002 | Vitest memakai Vite hanya sebagai internal test transformer; plugin dipilih `@vitejs/plugin-react-swc` karena `@vitejs/plugin-react@6` konflik peer Babel 8. Bukan pelanggaran ARCH-010/ARCH-012 (Vite bukan build tool aplikasi) | PHASE 1 | 2026-08-05 |
| NOTE-003 | shadcn v4 style default `base-nova` memakai `@base-ui/react` (Base UI) sebagai primitive layer + preset `shadcn/tailwind.css`; kustomisasi penuh tema dilakukan PHASE 2 sesuai LOCK-TECH-011                                      | PHASE 1 | 2026-08-05 |
| NOTE-004 | Scaffold via subfolder sementara karena npm menolak nama folder kapital `PT-AI`; nama package: `pt-ai-lms`                                                                                                                        | PHASE 1 | 2026-08-05 |
| NOTE-005 | File template scaffold `AGENTS.md`, `CLAUDE.md`, `README.md`, `public/*.svg` dipertahankan tanpa modifikasi (tidak menghapus tanpa audit)                                                                                         | PHASE 1 | 2026-08-05 |
| NOTE-006 | Tema aplikasi adalah gelap permanen (class `dark` di `<html>`, block `.dark` dihapus); reading canvas adalah scope `.reading-surface`, bukan theme switch. Light mode bukan requirement                                           | PHASE 2 | 2026-08-05 |
| NOTE-007 | Ikon navigasi dikirim lintas batas RSC sebagai string key (`NavIconKey` di `src/lib/navigation.ts`) karena fungsi komponen tidak dapat diserialisasi dari Server ke Client Component                                              | PHASE 2 | 2026-08-05 |
| NOTE-008 | State collapse sidebar memakai React state lokal di `AppShell`; Zustand ditunda sampai ada kebutuhan state UI lintas komponen nyata (LOCK-TECH-016)                                                                               | PHASE 2 | 2026-08-05 |
