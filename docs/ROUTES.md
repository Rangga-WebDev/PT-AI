<!-- @format -->

# ROUTES — PT-AI Learning Management System

## 1. Route Aktif (PHASE 1)

| URL                  | File                    | Jenis                              | Akses  | Keterangan                           |
| -------------------- | ----------------------- | ---------------------------------- | ------ | ------------------------------------ |
| `/`                  | `src/app/page.tsx`      | Server Component, static           | Publik | Placeholder fondasi Bahasa Indonesia |
| `*` (tidak cocok)    | `src/app/not-found.tsx` | Server Component                   | Publik | 404 Bahasa Indonesia                 |
| — (error boundary)   | `src/app/error.tsx`     | Client Component (kontrak Next.js) | Publik | Error umum tanpa stack trace         |
| — (loading boundary) | `src/app/loading.tsx`   | Server Component                   | Publik | Indikator memuat                     |

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
