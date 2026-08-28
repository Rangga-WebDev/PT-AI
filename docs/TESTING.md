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

## 4. Status Saat Ini (PHASE 8)

| Suite                                  | Jumlah  | Hasil terakhir |
| -------------------------------------- | ------- | -------------- |
| Unit dan component (Vitest, 15 file)   | 84 test | ✅ lulus       |
| SQL/pgTAP `rls.test.sql`               | 18 test | ✅ lulus       |
| SQL/pgTAP `academic-access.test.sql`   | 8 test  | ✅ lulus       |
| SQL/pgTAP `content-access.test.sql`    | 10 test | ✅ lulus       |
| SQL/pgTAP `attempt-integrity.test.sql` | 10 test | ✅ lulus       |
| SQL/pgTAP `source-access.test.sql`     | 11 test | ✅ lulus       |
| E2E (guest, student, lecturer, admin)  | 53 test | ✅ lulus       |

Total: 84 unit/component + 57 SQL + 53 E2E. Build menghasilkan 29 route.

Berkas pengujian PHASE 9: `src/test/source-validation.test.ts`, `supabase/tests/source-access.test.sql`, `e2e/verification.spec.ts`, `e2e/curation.spec.ts`.

### Menguji data yang tidak dapat dibatalkan

`attempts` dan `source_verifications` bersifat append-only; trigger `prevent_mutation()` menolak UPDATE maupun DELETE dari koneksi mana pun, termasuk `service_role`. Karena itu pengujian tidak dapat membersihkan hasilnya.

Solusinya: `e2e/fixtures/learning-content.ts` membuat **unit, kasus, aktivitas, sumber, dan klaim sekali pakai** pada setiap eksekusi, sehingga `attempt.spec.ts` dan `verification.spec.ts` selalu bermula dari keadaan kosong. Spesifikasi lain dilarang mengirim baseline atau verifikasi agar tidak merusak keadaan bersama.

`plan(n)` pada berkas pgTAP diperiksa runner: jumlah test yang benar-benar berjalan harus sama dengan angka pada plan, agar berkas yang berhenti di tengah jalan tidak lolos diam-diam.

### Catatan pengujian yang mudah menyesatkan

- Zod v4 `.uuid()` menolak UUID di luar versi 1–8; gunakan UUID v4 yang sah pada fixture.
- Playwright memperlakukan `<option>` sebagai tidak terlihat, sehingga `getByText(...).first()` dapat memilih opsi select dan gagal. Persempit asersi ke elemen daftar.
- `page.url()` tepat setelah `click()` dapat masih berisi URL lama; tunggu dengan `expect(page).toHaveURL()`.
- `testMatch` setiap project Playwright bersifat eksplisit — berkas spec baru harus didaftarkan atau tidak akan pernah dijalankan.

## 5. Rencana Berikutnya

- PHASE 10: pengujian batas peran AI (attempt-first, larangan jawaban final, keterlacakan kutipan).
- PHASE 11: pengujian pembukaan tahap berbasis kriteria kinerja.
- PHASE 12: pengujian revisi sebagai versi baru tanpa menimpa baseline.
