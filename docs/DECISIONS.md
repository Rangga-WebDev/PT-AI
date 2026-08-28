<!-- @format -->

# DECISIONS â€” PT-AI Learning Management System

Dokumen ini adalah Decision Log resmi proyek.

Status keputusan:

- **LOCKED** â€” Sudah disepakati dan tidak boleh diubah diam-diam. Perubahan wajib melalui Change Request dan persetujuan pengguna.
- **OPEN** â€” Belum diputuskan.
- **DEFERRED** â€” Ditunda ke fase berikutnya.
- **REJECTED** â€” Tidak digunakan.

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
| ARCH-004 | Route Handlers untuk endpoint khusus (AI streaming, export, webhook, health)  | LOCKED   | 2026-08-05 | â€”                                            |
| ARCH-005 | Supabase SSR dengan cookie (@supabase/ssr)                                    | LOCKED   | 2026-08-05 | â€”                                            |
| ARCH-006 | proxy.ts untuk pembaruan sesi dan route-level redirect ringan                 | LOCKED   | 2026-08-05 | Bukan satu-satunya authorization layer       |
| ARCH-007 | Server-side authorization pada Server Component, Server Action, Route Handler | LOCKED   | 2026-08-05 | â€”                                            |
| ARCH-008 | PostgreSQL Row Level Security sebagai perlindungan data terakhir              | LOCKED   | 2026-08-05 | â€”                                            |
| ARCH-009 | Alamat pengembangan lokal http://localhost:3000                               | LOCKED   | 2026-08-05 | â€”                                            |
| ARCH-010 | React SPA dengan Vite                                                         | REJECTED | 2026-08-05 | Digantikan Next.js App Router                |
| ARCH-011 | React Router                                                                  | REJECTED | 2026-08-05 | Digantikan file-system routing               |
| ARCH-012 | vite.config.ts                                                                | REJECTED | 2026-08-05 | â€”                                            |
| ARCH-013 | Arsitektur frontend-only                                                      | REJECTED | 2026-08-05 | â€”                                            |
| ARCH-014 | Supabase Edge Functions sebagai backend utama                                 | REJECTED | 2026-08-05 | â€”                                            |
| ARCH-015 | Data fetching client-side sebagai pola utama                                  | REJECTED | 2026-08-05 | â€”                                            |
| ARCH-016 | Seluruh halaman menggunakan Client Components                                 | REJECTED | 2026-08-05 | â€”                                            |
| ARCH-017 | Pages Router                                                                  | REJECTED | 2026-08-05 | Hanya App Router yang digunakan              |

## 2. Keputusan Stack Teknologi

| ID            | Keputusan                                                                                                                     | Status | Tanggal    | Catatan                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------- |
| LOCK-TECH-001 | Next.js App Router versi stable terbaru yang kompatibel                                                                       | LOCKED | 2026-08-05 | Tanpa Pages Router                                   |
| LOCK-TECH-002 | TypeScript strict (strict, noImplicitAny, noUncheckedIndexedAccess, exactOptionalPropertyTypes bila tidak merusak dependency) | LOCKED | 2026-08-05 | Dilarang `any` untuk menyembunyikan error            |
| LOCK-TECH-003 | Node.js LTS-kompatibel + npm                                                                                                  | LOCKED | 2026-08-05 | Versi aktual dicatat di docs/ENVIRONMENT.md          |
| LOCK-TECH-004 | Dev server di http://localhost:3000 via `npm run dev`                                                                         | LOCKED | 2026-08-05 | Port tidak diganti tanpa konflik nyata + persetujuan |
| LOCK-TECH-005 | File-system routing App Router (page/layout/loading/error/not-found/route/proxy, route groups, dynamic segments)              | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-006 | Server Components default; Client Components hanya untuk kebutuhan browser API/interaktivitas                                 | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-007 | Server Actions + Zod untuk seluruh mutasi UI                                                                                  | LOCKED | 2026-08-05 | Validasi browser bukan validasi final                |
| LOCK-TECH-008 | Route Handlers untuk AI streaming, integrasi eksternal, webhook, export, upload khusus, health check                          | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-009 | Proxy hanya untuk refresh cookie sesi, redirect awal, proteksi route ringan, locale/header                                    | LOCKED | 2026-08-05 | Authorization tetap di server + RLS                  |
| LOCK-TECH-010 | Tailwind CSS                                                                                                                  | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-011 | shadcn/ui dikustomisasi penuh                                                                                                 | LOCKED | 2026-08-05 | Tanpa tampilan default                               |
| LOCK-TECH-012 | Lucide React untuk icon                                                                                                       | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-013 | next/font/google: Space Grotesk (heading), Source Sans 3 (body/UI), IBM Plex Mono (metadata)                                  | LOCKED | 2026-08-05 | Tanpa file font manual                               |
| LOCK-TECH-014 | Form: Server Actions + useActionState; React Hook Form hanya form client kompleks; Zod untuk schema                           | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-015 | Server state: Server Components + revalidatePath/Tag; TanStack Query hanya fitur client-heavy                                 | LOCKED | 2026-08-05 | Bukan pola default                                   |
| LOCK-TECH-016 | Client state: React state lokal dahulu; Zustand hanya UI state lintas komponen                                                | LOCKED | 2026-08-05 | Tanpa server data permanen di Zustand                |
| LOCK-TECH-017 | Supabase PostgreSQL sebagai database                                                                                          | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-018 | Supabase Auth SSR cookie via @supabase/ssr; login email+password; akun dibuat admin; reset password via email                 | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-019 | Supabase Storage                                                                                                              | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-020 | Akses database: Supabase JS client, @supabase/ssr, SQL migrations, generated types, RLS, PostgreSQL functions bila perlu      | LOCKED | 2026-08-05 | Prisma/Drizzle butuh persetujuan                     |
| LOCK-TECH-021 | Supabase admin client server-only (import server-only, tanpa NEXT*PUBLIC*, penggunaan dibatasi dan tercatat)                  | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-022 | Google Gemini API melalui internal server-only provider adapter (rev. CR-001, 2026-08-28; semula OpenAI)                      | LOCKED | 2026-08-05 | Dilarang dipanggil dari browser                      |
| LOCK-TECH-023 | RAG: Supabase PostgreSQL + pgvector                                                                                           | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-024 | Testing: Vitest, React Testing Library, Playwright, database/RLS test, test business logic Server Actions/Route Handlers      | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-025 | Deployment: Vercel (Next.js) + Supabase (DB, Auth, Storage, pgvector)                                                         | LOCKED | 2026-08-05 | â€”                                                    |
| LOCK-TECH-026 | Tahapan produk: prototype â†’ MVP DB â†’ auth â†’ learning workflow â†’ AI â†’ research â†’ hardening                                     | LOCKED | 2026-08-05 | â€”                                                    |

## 3. Keputusan Pedagogis

| ID           | Keputusan                                                                                                                                 | Status | Tanggal    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------- |
| LOCK-PED-001 | Enam dimensi outcome: Interpretasi, Analisis, Evaluasi, Inferensi, Eksplanasi, Regulasi diri                                              | LOCKED | 2026-08-05 |
| LOCK-PED-002 | Urutan pembelajaran 6 tahap tetap; tidak diganti alur LMS generik                                                                         | LOCKED | 2026-08-05 |
| LOCK-PED-003 | Siklus per tahap: Attempt â†’ Feedback â†’ Verify â†’ Revise â†’ Mastery                                                                          | LOCKED | 2026-08-05 |
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
| DSN-007 | Layout desktop: sidebar 272/80px, topbar 72px, context panel 340â€“380px, grid 12 kolom, max width Â±1600px             | LOCKED | 2026-08-05 |
| DSN-008 | Mobile: bottom navigation, horizontal phase stepper, AI coach bottom sheet, touch target â‰¥44px                       | LOCKED | 2026-08-05 |

## 5. Keputusan Keamanan

| ID      | Keputusan                                                                  | Status | Tanggal    |
| ------- | -------------------------------------------------------------------------- | ------ | ---------- |
| SEC-001 | Seluruh 25 butir requirement security (bagian 15 requirement) diberlakukan | LOCKED | 2026-08-05 |
| SEC-002 | Secret hanya server-side; tanpa prefix NEXT*PUBLIC* untuk secret           | LOCKED | 2026-08-05 |
| SEC-003 | RLS aktif pada setiap tabel pengguna                                       | LOCKED | 2026-08-05 |
| SEC-004 | Identitas pengguna diambil dari sesi server, bukan dari client             | LOCKED | 2026-08-05 |
| SEC-005 | Admin role terpisah dari academic authority                                | LOCKED | 2026-08-05 |

## 6. Keputusan Terbuka (OPEN)

| ID       | Pertanyaan                                                                                         | Status                                                              | Target Fase                    |
| -------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------ |
| OPEN-001 | Nama final aplikasi (saat ini sementara: PT-AI LMS)                                                | OPEN                                                                | Sebelum production             |
| OPEN-002 | Detail ERD final dan data dictionary                                                               | **LOCKED** â€” disetujui 2026-08-11, lihat [DATABASE.md](DATABASE.md) | PHASE 4A selesai               |
| DB-01    | Cakupan soft delete: konten akademik saja; artefak mahasiswa tidak pernah dihapus                  | **LOCKED**                                                          | 2026-08-11                     |
| DB-02    | Nilai enum Bahasa Inggris di database, label Indonesia di aplikasi                                 | **LOCKED**                                                          | 2026-08-11                     |
| DB-03    | Dimensi vektor `source_chunks.embedding` = `vector(1536)`, ditinjau ulang saat model final dipilih | **LOCKED (sementara)**                                              | 2026-08-11, revisi di PHASE 10 |
| DB-04    | Cakupan `audit_logs`: hanya operasi sensitif                                                       | **LOCKED**                                                          | 2026-08-11                     |
| DB-05    | Retensi `learning_events`: detail 12 bulan lalu agregasi                                           | **LOCKED**                                                          | 2026-08-11                     |
| DB-06    | Pembedaan `verifications` (klaim/saran AI) vs `source_verifications` (kredibilitas sumber)         | **LOCKED**                                                          | 2026-08-11                     |
| DB-07    | Satu `case` per `learning_unit` (relasi 1:1)                                                       | **LOCKED**                                                          | 2026-08-11                     |
| OPEN-003 | Konsolidasi endpoint AI: terpisah per fungsi vs satu endpoint terstruktur                          | OPEN                                                                | PHASE 10                       |
| OPEN-004 | Model OpenAI spesifik untuk tiap fungsi AI                                                         | OPEN                                                                | PHASE 10                       |
| OPEN-005 | Strategi rate limiting (per user, per class, per activity)                                         | OPEN                                                                | PHASE 10                       |
| OPEN-006 | Kebijakan retensi data penelitian                                                                  | OPEN                                                                | PHASE 14                       |

## 6a. Change Request

| ID     | Usulan                                                                              | Status                                | Diajukan   |
| ------ | ----------------------------------------------------------------------------------- | ------------------------------------- | ---------- |
| CR-001 | Mengganti penyedia AI pada LOCK-TECH-022 dari OpenAI ke Google Gemini (tier gratis) | **DISETUJUI** â€” diterapkan 2026-08-28 | 2026-08-28 |

**CR-001 â€” detail**

- **Alasan.** Pembimbing mengarahkan pemakaian layanan AI tanpa biaya.
- **Konteks etik.** Pengguna menyatakan penelitian ini tidak memerlukan izin etik dan mahasiswa telah menyetujui keikutsertaan. Konsekuensi tier gratis Gemini â€” konten dipakai penyedia untuk memperbaiki produknya â€” karena itu diterima secara sadar.
- **Dampak.** `LOCK-TECH-022` berubah pada nama penyedia saja. Bentuk akses tetap server-only provider adapter, dan larangan pemanggilan dari browser tetap berlaku.
- **Dampak skema.** `DB-03` (`vector(1536)`) direncanakan dipertahankan dengan menyetel `output_dimensionality` model embedding Gemini ke 1536. **Belum terbukti** â€” lihat blokir akses di bawah.
- **Risiko.** (1) Kuota tier gratis terbatas sehingga uji beban kelas penuh dapat tertahan; (2) konten mahasiswa dipakai penyedia; (3) dimensi embedding perlu dipotong, bukan native.
- **Mitigasi wajib.** Prompt dipseudonimkan â€” tanpa nama dan tanpa NIM; hanya teks kasus, rubrik, potongan sumber, dan jawaban anonim.
- **Alternatif yang dipertimbangkan.** Tetap OpenAI berbayar (â‰ˆ$1,3â€“5,7 per kelas per semester); model open-source swahosting (gratis dan data tidak keluar, tetapi tidak dapat berjalan di Vercel).
- **Keputusan SDK.** Memakai `@google/genai` (SDK resmi JavaScript), bukan `fetch` langsung. Belum dipasang sampai akses inferensi terbukti.

**CR-001 â€” blokir akses yang ditemukan saat verifikasi (2026-08-28)**

Kunci API terbukti sah: `GET /v1beta/models` berhasil dan mengembalikan 50 model. Namun **seluruh panggilan inferensi ditolak**:

| Endpoint                                   | Hasil                                                           |
| ------------------------------------------ | --------------------------------------------------------------- |
| `models.list`                              | 200 OK                                                          |
| `gemini-embedding-001:embedContent`        | 403 `PERMISSION_DENIED` â€” "Your project has been denied access" |
| `gemini-3.5-flash-lite:generateContent`    | 403 `PERMISSION_DENIED` â€” pesan sama                            |
| `gemini-flash-lite-latest:generateContent` | 403 `PERMISSION_DENIED` â€” pesan sama                            |

Indonesia termasuk wilayah yang didukung menurut halaman _available regions_, sehingga penyebab yang tersisa adalah persyaratan usia 18+ atau verifikasi usia akun Google yang belum dilakukan. PHASE 10 **ditahan** sampai ini teratasi.

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
| NOTE-001 | `exactOptionalPropertyTypes` dan `noUncheckedIndexedAccess` berhasil diaktifkan penuh tanpa merusak dependency â€” LOCK-TECH-002 terpenuhi seluruhnya                                                                               | PHASE 1 | 2026-08-05 |
| NOTE-002 | Vitest memakai Vite hanya sebagai internal test transformer; plugin dipilih `@vitejs/plugin-react-swc` karena `@vitejs/plugin-react@6` konflik peer Babel 8. Bukan pelanggaran ARCH-010/ARCH-012 (Vite bukan build tool aplikasi) | PHASE 1 | 2026-08-05 |
| NOTE-003 | shadcn v4 style default `base-nova` memakai `@base-ui/react` (Base UI) sebagai primitive layer + preset `shadcn/tailwind.css`; kustomisasi penuh tema dilakukan PHASE 2 sesuai LOCK-TECH-011                                      | PHASE 1 | 2026-08-05 |
| NOTE-004 | Scaffold via subfolder sementara karena npm menolak nama folder kapital `PT-AI`; nama package: `pt-ai-lms`                                                                                                                        | PHASE 1 | 2026-08-05 |
| NOTE-005 | File template scaffold `AGENTS.md`, `CLAUDE.md`, `README.md`, `public/*.svg` dipertahankan tanpa modifikasi (tidak menghapus tanpa audit)                                                                                         | PHASE 1 | 2026-08-05 |
| NOTE-006 | Tema aplikasi adalah gelap permanen (class `dark` di `<html>`, block `.dark` dihapus); reading canvas adalah scope `.reading-surface`, bukan theme switch. Light mode bukan requirement                                           | PHASE 2 | 2026-08-05 |
| NOTE-007 | Ikon navigasi dikirim lintas batas RSC sebagai string key (`NavIconKey` di `src/lib/navigation.ts`) karena fungsi komponen tidak dapat diserialisasi dari Server ke Client Component                                              | PHASE 2 | 2026-08-05 |
| NOTE-008 | State collapse sidebar memakai React state lokal di `AppShell`; Zustand ditunda sampai ada kebutuhan state UI lintas komponen nyata (LOCK-TECH-016)                                                                               | PHASE 2 | 2026-08-05 |
| NOTE-009 | Peran pada prototipe ditentukan oleh segmen URL dan halaman pemilih `/app`; ini alat prototipe yang **wajib dihapus** pada PHASE 5 ketika peran diambil dari sesi server (SEC-004)                                                | PHASE 3 | 2026-08-11 |
| NOTE-010 | `CardTitle` diberi prop `as` agar judul kartu dapat menjadi heading semantik; kegagalan E2E mengungkap bahwa `<div>` bawaan shadcn tidak terbaca sebagai heading oleh assistive technology                                        | PHASE 3 | 2026-08-11 |
