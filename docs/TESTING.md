<!-- @format -->

# TESTING — PT-AI Learning Management System

## 1. Toolchain (LOCK-TECH-024)

| Lapisan                                        | Alat                                                                               | Konfigurasi            |
| ---------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------- |
| Unit test                                      | Vitest 4                                                                           | `vitest.config.mts`    |
| Component test                                 | React Testing Library + jest-dom + user-event                                      | `src/test/setup.ts`    |
| End-to-end                                     | Playwright — project `setup`, `guest`, `student`, `lecturer` dengan `storageState` | `playwright.config.ts` |
| Database/RLS test                              | pgTAP via driver `pg` — `npm run test:db` (**18/18 lulus**)                        | `supabase/tests/`      |
| Business logic Server Actions / Route Handlers | Vitest — skema Zod & guard peran (PHASE 5)                                         | Vitest                 |

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

## 4. Status Saat Ini (PHASE 7)

| Suite                                 | Jumlah  | Hasil terakhir |
| ------------------------------------- | ------- | -------------- |
| Unit dan component (Vitest, 13 file)  | 67 test | ✅ lulus       |
| SQL/pgTAP `rls.test.sql`              | 18 test | ✅ lulus       |
| SQL/pgTAP `academic-access.test.sql`  | 8 test  | ✅ lulus       |
| SQL/pgTAP `content-access.test.sql`   | 10 test | ✅ lulus       |
| E2E (guest, student, lecturer, admin) | 38 test | ✅ lulus       |

Total: 67 unit/component + 36 SQL + 38 E2E. Build menghasilkan 28 route.

Berkas pengujian PHASE 7: `src/test/content-validation.test.ts`, `supabase/tests/content-access.test.sql`, `e2e/builder.spec.ts`.

### Catatan pengujian yang mudah menyesatkan

- Zod v4 `.uuid()` menolak UUID di luar versi 1–8; gunakan UUID v4 yang sah pada fixture.
- Playwright memperlakukan `<option>` sebagai tidak terlihat, sehingga `getByText(...).first()` dapat memilih opsi select dan gagal. Persempit asersi ke elemen daftar.
- `page.url()` tepat setelah `click()` dapat masih berisi URL lama; tunggu dengan `expect(page).toHaveURL()`.
- `testMatch` setiap project Playwright bersifat eksplisit — berkas spec baru harus didaftarkan atau tidak akan pernah dijalankan.

## 5. Rencana Berikutnya

- PHASE 8: E2E alur attempt → feedback → verify → revise → mastery dengan data nyata.
- PHASE 10: pengujian batas peran AI (attempt-first, larangan jawaban final).
- PHASE 11: pengujian pembukaan tahap berbasis kriteria kinerja.
