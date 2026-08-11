<!-- @format -->

# ENVIRONMENT — PT-AI Learning Management System

## 1. Environment Terverifikasi (PHASE 0 — 2026-08-05)

| Komponen | Versi            | Metode verifikasi |
| -------- | ---------------- | ----------------- |
| OS       | Windows          | Info workspace    |
| Node.js  | v24.14.0         | `node --version`  |
| npm      | 11.9.0           | `npm --version`   |
| git      | 2.45.1.windows.1 | `git --version`   |

Catatan: Node v24 adalah rilis Current/LTS-line yang kompatibel dengan Next.js stable terbaru (persyaratan minimal Next.js 15: Node 18.18+). Sesuai LOCK-TECH-003.

## 2. Versi Dependency Utama

Terpasang pada PHASE 1 (2026-08-05). Nama package: `pt-ai-lms` (npm menolak huruf kapital).

| Paket                                                                                       | Versi                                                | Fase ditambahkan | Alasan                                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------- | -------------------------------------------------------- |
| next                                                                                        | 16.3.0                                               | PHASE 1          | Framework inti (LOCK-TECH-001)                           |
| react / react-dom                                                                           | 19.2.8                                               | PHASE 1          | Library UI                                               |
| typescript                                                                                  | ^5                                                   | PHASE 1          | TS strict (LOCK-TECH-002)                                |
| tailwindcss / @tailwindcss/postcss                                                          | ^4                                                   | PHASE 1          | Styling (LOCK-TECH-010)                                  |
| eslint / eslint-config-next                                                                 | ^9 / 16.3.0                                          | PHASE 1          | Lint baseline                                            |
| shadcn / @base-ui/react / class-variance-authority / clsx / tailwind-merge / tw-animate-css | ^4.16.1 / ^1.7.0 / ^0.7.1 / ^2.1.1 / ^3.6.0 / ^1.4.0 | PHASE 1          | Komponen dasar shadcn/ui style base-nova (LOCK-TECH-011) |
| lucide-react                                                                                | ^1.28.0                                              | PHASE 1          | Icon (LOCK-TECH-012)                                     |
| vitest / @vitejs/plugin-react-swc / jsdom                                                   | ^4.1.10 / ^4.3.3 / ^29.1.1                           | PHASE 1          | Unit & component test (LOCK-TECH-024)                    |
| @testing-library/react / jest-dom / user-event                                              | ^16.3.2 / ^7.0.0 / ^14.6.3                           | PHASE 1          | Component testing (LOCK-TECH-024)                        |
| @playwright/test                                                                            | ^1.62.1                                              | PHASE 1          | E2E (LOCK-TECH-024); browser Chromium terinstal          |

Belum diinstal (menunggu fase yang membutuhkan): `zod`, `zustand`, `@tanstack/react-query`, `@supabase/ssr`, `@supabase/supabase-js`, `react-hook-form`, `openai`.

## 3. Perintah Pengembangan (Aktif sejak PHASE 1)

| Perintah             | Fungsi                                      |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Development server di http://localhost:3000 |
| `npm run build`      | Production build                            |
| `npm run start`      | Production server                           |
| `npm run lint`       | ESLint                                      |
| `npm run typecheck`  | TypeScript type checking                    |
| `npm run test`       | Vitest unit/component test                  |
| `npm run test:watch` | Vitest mode watch                           |
| `npm run test:e2e`   | Playwright end-to-end test                  |

### Perintah database (Supabase CLI v2.113.0 via `npx`, tanpa instalasi global)

| Perintah | Fungsi | Prasyarat |
| --- | --- | --- |
| `npx supabase init` | Membuat struktur `supabase/` | — (sudah dijalankan) |
| `npx supabase link --project-ref <ref>` | Menautkan ke project Cloud | Project + kredensial |
| `npx supabase db push` | Menerapkan migration ke database | Sudah link |
| `npx supabase db diff` | Meninjau perbedaan schema sebelum push | Sudah link |
| `npx supabase test db --db-url "<connection>"` | Menjalankan `supabase/tests/*.sql` (pgTAP) | Connection string |
| `npx supabase gen types typescript --linked > src/lib/supabase/types.ts` | Generated database types | Sudah link |

**Docker tidak diperlukan** karena kita memakai Supabase Cloud, bukan stack lokal.
Kredensial dimasukkan langsung oleh pengguna di terminal — tidak pernah melalui chat.

## 4. Variabel Environment

File `.env.example` tersedia sejak PHASE 1 (tanpa nilai). **Secret tidak pernah dikommit** — `.gitignore` memblokir `.env*`.

| Variabel                        | Sisi            | Prefix NEXT*PUBLIC*               | Keterangan                                                     |
| ------------------------------- | --------------- | --------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Client + Server | Ya (bukan secret)                 | URL project Supabase                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Ya (bukan secret, dilindungi RLS) | Anon/publishable key                                           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Server only     | **DILARANG**                      | Service role — hanya `src/lib/supabase/admin.ts` (server-only) |
| `OPENAI_API_KEY`                | Server only     | **DILARANG**                      | Hanya AI provider adapter server-only                          |

Aturan (LOCKED — SEC-002):

1. Jangan menyimpan secret di source code.
2. Jangan menggunakan prefix `NEXT_PUBLIC_` untuk secret.
3. OpenAI API key hanya tersedia server-side.
4. Supabase service role hanya tersedia server-side.

## 5. Alamat Pengembangan

- Lokal: `http://localhost:3000` (LOCK-TECH-004). Port tidak diganti kecuali ada konflik nyata dan pengguna menyetujui.

## 6. Deployment (Terencana — PHASE 15)

- Frontend + Next.js server: **Vercel**
- Database, Auth, Storage, pgvector: **Supabase**
