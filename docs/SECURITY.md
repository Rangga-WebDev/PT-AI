<!-- @format -->

# SECURITY — PT-AI Learning Management System

Referensi keputusan: SEC-001 s.d. SEC-005 di [DECISIONS.md](DECISIONS.md). Seluruh 25 butir requirement security berstatus LOCKED.

## 1. Prinsip

1. Secret tidak pernah berada di source code, client bundle, atau variabel `NEXT_PUBLIC_`.
2. Authorization berlapis: Server Component → Server Action/Route Handler → RLS (pertahanan terakhir).
3. Identitas diambil dari sesi server — `userId`/role dari client tidak pernah dipercaya.
4. Validasi input dengan Zod di server; validasi browser hanya kenyamanan.
5. Least privilege; operasi sensitif tercatat (audit); password/token tidak pernah dicatat.
6. Error ke pengguna bersifat generik; detail hanya di server log.

## 2. Status Implementasi per Fase

| Kontrol                                                                                              | Status                                   | Fase          |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------- |
| `.env.example` tanpa nilai secret; `.gitignore` memblokir `.env*`                                    | ✅ Terpasang                             | PHASE 1       |
| Error boundary tanpa stack trace ke pengguna (`src/app/error.tsx`)                                   | ✅ Terpasang                             | PHASE 1       |
| Halaman placeholder tanpa data sensitif; tidak ada endpoint aktif                                    | ✅                                       | PHASE 1       |
| Prototipe visual tanpa data pribadi nyata (nama fiktif, tanpa persistensi, form login tanpa handler) | ✅                                       | PHASE 3       |
| ✅ Route group `(protected)` kini terproteksi; `/app` mengarahkan berdasarkan peran dari sesi server | ✅ diuji E2E                             | PHASE 5       |
| `npm audit` pada instalasi                                                                           | ✅ 0 vulnerabilities (terakhir: PHASE 5) | Berkelanjutan |
| Supabase server/browser/admin client terpisah; admin `server-only` + `withAuditedAdmin()`            | ✅                                       | PHASE 5       |
| Proxy hanya menyegarkan sesi dan redirect optimistik (bukan otorisasi utama)                         | ✅                                       | PHASE 5       |
| Identitas dari `getUser()`, bukan `getSession()` (SEC-004)                                           | ✅ diuji E2E                             | PHASE 5       |
| Pesan galat autentikasi generik (tidak membocorkan surel terdaftar)                                  | ✅ diuji E2E                             | PHASE 5       |
| Tidak ada rahasia di bundel klien                                                                    | ✅ `npm run check:secrets`               | PHASE 5       |
| Proteksi open redirect pada parameter `redirectTo`                                                   | ✅ hanya path `/app` internal            | PHASE 5       |
| RLS pada seluruh tabel pengguna + RLS test                                                           | ✅ 60 tabel, 18/18 test lulus            | PHASE 4       |
| Artefak berpikir append-only (trigger mengikat `service_role`)                                       | ✅ 15 tabel                              | PHASE 4       |
| Admin tidak dapat membaca/mengubah nilai dan jawaban (SEC-005)                                       | ✅ diuji                                 | PHASE 4       |
| Dosen tidak dapat membaca `consent_records`                                                          | ✅ diuji                                 | PHASE 4       |
| Rate limit AI + minimalisasi data pribadi ke AI                                                      | ⬜                                       | PHASE 10      |
| Sanitasi upload (ukuran, MIME, metadata) + signed URL                                                | ⬜                                       | PHASE 9       |
| Idempotency / proteksi duplicate submission                                                          | ⬜                                       | PHASE 8       |
| Audit log operasi sensitif                                                                           | ⬜                                       | PHASE 4+      |
| Security review menyeluruh + penetration checklist                                                   | ⬜                                       | PHASE 15      |

## 3. Aturan Baku untuk Kontributor

1. Modul yang membaca `SUPABASE_SERVICE_ROLE_KEY` atau `OPENAI_API_KEY` wajib `import "server-only"`.
2. Client Component dilarang mengimpor modul server-only, memanggil OpenAI, atau memakai service role.
3. Setiap Server Action wajib memeriksa autentikasi + otorisasi sebelum mutasi.
4. Destructive action memakai confirm dialog; artefak akademik memakai soft delete bila memungkinkan.
5. Jangan menampilkan raw database error, SQL, internal path, stack trace, atau raw AI provider response ke pengguna.
6. Role admin terpisah dari otoritas akademik (admin tidak mengubah nilai/jawaban).

## 4. Insiden dan Pelaporan

- Mekanisme incident report AI (mahasiswa melaporkan respons AI) dibangun pada PHASE 10–13.
- Audit error sensitif dicatat di server (PHASE 4+ setelah tabel `audit_logs` tersedia).
