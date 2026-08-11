<!-- @format -->

# TESTING — PT-AI Learning Management System

## 1. Toolchain (LOCK-TECH-024)

| Lapisan                                        | Alat                                          | Konfigurasi            |
| ---------------------------------------------- | --------------------------------------------- | ---------------------- |
| Unit test                                      | Vitest 4                                      | `vitest.config.mts`    |
| Component test                                 | React Testing Library + jest-dom + user-event | `src/test/setup.ts`    |
| End-to-end                                     | Playwright (Chromium)                         | `playwright.config.ts` |
| Database/RLS test                              | (mulai PHASE 4)                               | `supabase/tests/`      |
| Business logic Server Actions / Route Handlers | (mulai PHASE 5+)                              | Vitest                 |

## 2. Perintah

| Perintah             | Fungsi                                                           |
| -------------------- | ---------------------------------------------------------------- |
| `npm run test`       | Menjalankan seluruh unit + component test sekali                 |
| `npm run test:watch` | Mode watch untuk pengembangan                                    |
| `npm run test:e2e`   | Playwright E2E; otomatis menyalakan dev server di localhost:3000 |

Prasyarat E2E sekali saja: `npx playwright install chromium`.

## 3. Konvensi

1. Unit test dikolokasi dengan source-nya: `src/lib/utils.test.ts` di samping `src/lib/utils.ts`.
2. Test halaman App Router diletakkan di `src/test/` (folder `src/app/` dijaga hanya berisi file routing) — contoh: `src/test/home-page.test.tsx`.
3. File E2E berada di `e2e/*.spec.ts`; Vitest hanya memindai `src/**/*.test.{ts,tsx}` sehingga tidak bentrok dengan Playwright.
4. Import Vitest eksplisit (`import { describe, it, expect } from "vitest"`) — tanpa globals, agar sesuai TypeScript strict.
5. Nama test dan assertion message menggunakan Bahasa Indonesia.
6. Setiap fase wajib menjalankan test nyata sebelum klaim selesai (Definition of Done butir 20).
7. Query RTL memprioritaskan role/label yang accessible (`getByRole`) — sekaligus menjaga aksesibilitas markup.

## 4. Status Saat Ini (PHASE 3)

| Suite                                                                 | Jumlah | Hasil terakhir |
| --------------------------------------------------------------------- | ------ | -------------- |
| Unit (`cn`)                                                           | 3 test | ✅ lulus       |
| Component (`HomePage`)                                                | 2 test | ✅ lulus       |
| Component (`Button`)                                                  | 5 test | ✅ lulus       |
| Component (`StatusBadge`)                                             | 4 test | ✅ lulus       |
| Component (states)                                                    | 5 test | ✅ lulus       |
| Component (`AppShell`)                                                | 4 test | ✅ lulus       |
| Component (`AttemptGate` — attempt-first)                             | 5 test | ✅ lulus       |
| Component (`PhaseRail` — urutan tahap)                                | 3 test | ✅ lulus       |
| Component (`VerificationChecklist` + `MockBanner`)                    | 4 test | ✅ lulus       |
| E2E smoke (beranda, 404)                                              | 2 test | ✅ lulus       |
| E2E design system (desktop + mobile 390×844)                          | 3 test | ✅ lulus       |
| E2E prototipe (login, dashboard, attempt gate, sumber, dosen, mobile) | 6 test | ✅ lulus       |

Total: 35 unit/component test + 11 E2E test.

## 5. Rencana Berikutnya

- PHASE 4: pgTAP/SQL test untuk schema dan RLS.
- PHASE 5: test authorization (Server Actions, route protection) + RLS integration.
- PHASE 8+: E2E alur attempt → feedback → verify → revise → mastery dengan data nyata.
