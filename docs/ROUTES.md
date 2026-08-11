<!-- @format -->

# ROUTES — PT-AI Learning Management System

## 1. Route Aktif (PHASE 3)

> ⚠️ **Peringatan:** route group `(protected)` pada PHASE 3 **belum benar-benar terproteksi**. Tidak ada autentikasi, otorisasi, maupun RLS. Proteksi nyata dipasang pada PHASE 5.

### Publik

| URL                  | File                                        | Jenis                              | Keterangan                                         |
| -------------------- | ------------------------------------------- | ---------------------------------- | -------------------------------------------------- |
| `/`                  | `src/app/page.tsx`                          | Server Component, static           | Beranda + tautan ke prototipe                      |
| `/login`             | `src/app/(public)/login/page.tsx`           | Server Component, static           | Formulir visual; input & tombol dinonaktifkan      |
| `/forgot-password`   | `src/app/(public)/forgot-password/page.tsx` | Server Component, static           | Formulir visual; belum mengirim surel              |
| `/design-system`     | `src/app/design-system/page.tsx`            | Server Component, static           | **Preview internal**; digate/dihapus pada PHASE 15 |
| `*` (tidak cocok)    | `src/app/not-found.tsx`                     | Server Component                   | 404 Bahasa Indonesia                               |
| — (error boundary)   | `src/app/error.tsx`                         | Client Component (kontrak Next.js) | Error umum tanpa stack trace                       |
| — (loading boundary) | `src/app/loading.tsx`                       | Server Component                   | Indikator memuat                                   |

### Prototipe aplikasi (belum terproteksi)

| URL                                                      | File                              | Jenis   | Keterangan                                                                     |
| -------------------------------------------------------- | --------------------------------- | ------- | ------------------------------------------------------------------------------ |
| `/app`                                                   | `(protected)/app/page.tsx`        | Static  | Pemilih tampilan prototipe; **dihapus pada PHASE 5** (peran berasal dari sesi) |
| `/app/student/dashboard`                                 | `.../student/dashboard/page.tsx`  | Static  | Bento dashboard mahasiswa                                                      |
| `/app/student/classes`                                   | `.../student/classes/page.tsx`    | Static  | Daftar kelas                                                                   |
| `/app/student/classes/[classId]`                         | `.../[classId]/page.tsx`          | Dynamic | Detail kelas                                                                   |
| `/app/student/learn/[unitId]`                            | `.../learn/[unitId]/page.tsx`     | Dynamic | Redirect ke tahap berjalan                                                     |
| `/app/student/learn/[unitId]/stage/[stageKey]`           | `.../stage/[stageKey]/page.tsx`   | Dynamic | Ruang belajar 6 tahap + attempt gate                                           |
| `/app/student/sources/[sourceId]`                        | `.../sources/[sourceId]/page.tsx` | Dynamic | Verifikasi sumber                                                              |
| `/app/student/progress`                                  | `.../student/progress/page.tsx`   | Static  | Progres 6 dimensi + remedial/pengayaan                                         |
| `/app/lecturer/dashboard`                                | `.../lecturer/dashboard/page.tsx` | Static  | Dashboard dosen                                                                |
| `/app/lecturer/classes`                                  | `.../lecturer/classes/page.tsx`   | Static  | Kelas yang diampu                                                              |
| `/app/lecturer/classes/[classId]`                        | `.../[classId]/page.tsx`          | Dynamic | Detail kelas dosen                                                             |
| `/app/lecturer/classes/[classId]/builder`                | `.../builder/page.tsx`            | Dynamic | Perancang materi: modul dan unit                                               |
| `/app/lecturer/classes/[classId]/builder/units/[unitId]` | `.../units/[unitId]/page.tsx`     | Dynamic | Kasus, enam tahap, aktivitas, instruksi                                        |
| `/app/lecturer/rubrics`                                  | `.../lecturer/rubrics/page.tsx`   | Dynamic | Rubrik, kriteria per dimensi, dan level                                        |
| `/app/lecturer/review`                                   | `.../lecturer/review/page.tsx`    | Static  | Antrean review                                                                 |

Boundary area: `(protected)/app/student/{loading,error}.tsx` dan `(protected)/app/lecturer/{loading,error}.tsx`.

## 2. Route Map Target (LOCKED — dibangun bertahap)

URL publik tidak memakai nama route group. Struktur lengkap ada di [ARCHITECTURE.md](ARCHITECTURE.md) bagian 5.

| Segmen                     | Fase       | Contoh URL                                                               |
| -------------------------- | ---------- | ------------------------------------------------------------------------ |
| `(public)`                 | PHASE 3/5  | `/login`, `/forgot-password`, `/reset-password`                          |
| `(protected)/app`          | PHASE 3+   | `/app`                                                                   |
| `(protected)/app/student`  | PHASE 3, 8 | `/app/student/dashboard`, `/app/student/learn/[unitId]/stage/[stageKey]` |
| `(protected)/app/lecturer` | PHASE 3, 7 | `/app/lecturer/dashboard`, `/app/lecturer/classes/[classId]/builder`     |
| `(protected)/app/admin`    | PHASE 6    | `/app/admin/users`, `/app/admin/audit`                                   |
| `api/ai/*`                 | PHASE 10   | `/api/ai/feedback` (Route Handler, server-only AI)                       |
| `api/exports/research`     | PHASE 14   | Export penelitian anonim                                                 |
| `api/health`               | PHASE 15   | Health check                                                             |

## 3. Aturan Routing

1. Hanya App Router file-system routing (LOCK-TECH-005); React Router dilarang (REJECTED).
2. Route group `(public)`/`(protected)` tidak mengubah URL.
3. Proteksi route: proxy hanya lapisan ringan; authorization sesungguhnya di Server Component/Action/Handler + RLS (LOCK-TECH-009).
4. Setiap area route protected wajib memiliki `loading.tsx` dan `error.tsx` sendiri secara bertahap.
5. Halaman dinamis memakai `PageProps<"/path/[param]">` yang dihasilkan `next typegen`; `params` di-await.
6. Route bertanda prototipe (`/app`, `/design-system`) wajib dihapus atau digate sebelum produksi (PHASE 15).
