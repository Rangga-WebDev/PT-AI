<!-- @format -->

# MASTER PLAN — PT-AI Learning Management System

## 1. Identitas Proyek

- **Nama sementara:** PT-AI Learning Management System (PT-AI LMS)
- **Jenis:** Learning Management System berbasis pembelajaran terprogram yang mengintegrasikan AI untuk meningkatkan kemampuan berpikir kritis mahasiswa dalam pembelajaran Pendidikan Kewarganegaraan di perguruan tinggi.
- **Target pengguna:** Mahasiswa, Dosen, Administrator.
- **Outcome utama:** Kemampuan berpikir kritis mahasiswa (6 dimensi: Interpretasi, Analisis, Evaluasi, Inferensi, Eksplanasi, Regulasi diri).
- **Konteks pembelajaran:** Isu dan kasus kewarganegaraan autentik.
- **Bahasa MVP:** Bahasa Indonesia.
- **Lingkup institusi:** Satu universitas pada MVP; struktur database siap multi-institusi.

Aplikasi ini **bukan**: LMS pembagi file biasa, chatbot AI biasa, generator tugas/esai, Moodle clone, dashboard admin generik, sistem penilaian otomatis berbasis AI, atau aplikasi yang menjadikan AI sebagai otoritas akademik.

## 2. Prinsip Pengembangan

1. Bertahap — satu fase pada satu waktu, berhenti di setiap checkpoint.
2. Modular — feature-based architecture yang selaras dengan App Router.
3. Aman — server-side authorization berlapis + RLS.
4. Responsive — desktop, tablet, mobile.
5. Accessible — keyboard interaction, touch target ≥44px, kontras memadai.
6. Mudah diuji — business logic dapat diuji terpisah.
7. Mudah dipelihara — tanpa file monolitik, tanpa abstraction prematur.
8. Siap penelitian — jejak pembelajaran lengkap, export anonim, consent, fidelity.

## 3. Arsitektur Tingkat Tinggi

```
Browser
    ↓
Next.js Server Components
    ↓
Server Actions / Route Handlers
    ↓
Supabase client dengan user session
    ↓
PostgreSQL + RLS
```

Alur AI:

```
Browser
    ↓
Route Handler atau Server Action
    ↓
Server-only AI service
    ↓
AI provider adapter
    ↓
OpenAI API
    ↓
Schema validation
    ↓
Audit log
    ↓
Feedback formatif ke mahasiswa
```

## 4. Fase Pengembangan

| Fase | Nama                                | Status                         | Checkpoint Utama                                                        |
| ---- | ----------------------------------- | ------------------------------ | ----------------------------------------------------------------------- |
| 0    | Repository Audit and Planning       | SELESAI (menunggu persetujuan) | Audit report + dokumen dasar                                            |
| 1    | Next.js Foundation                  | BELUM                          | dev/lint/typecheck/test/build berhasil di localhost:3000                |
| 2    | Design System and Application Shell | BELUM                          | Tokens, AppShell, Sidebar, Topbar, states, responsive                   |
| 3    | Visual Prototype                    | BELUM                          | Login, dashboard, class list, learning workspace visual (mock berlabel) |
| 4    | Database Architecture               | BELUM                          | ERD disetujui → migrations, types, seed, DB tests                       |
| 5    | Supabase SSR Authentication         | BELUM                          | Login/logout/reset, route protection, role resolution, RLS              |
| 6    | Academic Structure                  | BELUM                          | Organisasi s.d. enrollment                                              |
| 7    | Course Builder                      | BELUM                          | Module s.d. draft/publish                                               |
| 8    | Student Learning Workspace          | BELUM                          | CaseReader, AnswerEditor, autosave, attempt baseline lock               |
| 9    | Source Verification                 | BELUM                          | Source library s.d. audit verifikasi                                    |
| 10   | AI Coach and RAG                    | BELUM                          | Provider adapter, pgvector, guiding questions, citations, rate limit    |
| 11   | Mastery and Branching               | BELUM                          | Mastery criteria, branching transparan, override                        |
| 12   | Revision and Reflection             | BELUM                          | Revision history, diff, reflection, penilaian dosen                     |
| 13   | Analytics                           | BELUM                          | Dashboard 6 dimensi, pattern, fidelity, incident review                 |
| 14   | Research and Governance             | BELUM                          | Consent, pretest/posttest, export anonim, retention                     |
| 15   | Production Hardening                | BELUM                          | A11y audit, security review, E2E, deployment, rollback docs             |

## 5. Protokol Setiap Fase

Sebelum menulis kode, tampilkan: nama fase, tujuan, scope, requirement LOCKED terkait, user stories, acceptance criteria, file dibuat/diubah, dependency baru, database impact, security impact, testing plan, risiko, out-of-scope. **Tunggu persetujuan.**

Setelah disetujui: kerjakan hanya fase aktif, tulis kode lengkap tanpa placeholder, jalankan lint + typecheck + test + build, perbaiki error, perbarui dokumentasi, berikan Phase Completion Report, **berhenti pada checkpoint**.

## 6. Definition of Done (Ringkas)

Fase selesai hanya jika: acceptance criteria terpenuhi; TypeScript, lint, test utama, dan build berhasil; loading/empty/error state tersedia; responsive; keyboard interaction dasar; authorization diuji; RLS diuji bila menyentuh database; tidak ada secret di client bundle; migration tersedia; dokumentasi + Decision Log + Progress diperbarui; requirement LOCKED tidak berubah; mock data tidak tersembunyi di fitur final; tidak ada klaim berhasil tanpa hasil perintah pengujian.

## 7. Larangan Global

Dilarang: Vite, React Router, Pages Router, seluruh aplikasi Client Components, "use client" tanpa kebutuhan, memanggil OpenAI dari browser, service role di frontend, menonaktifkan RLS, proxy sebagai satu-satunya authorization, mempercayai role dari request body, menimpa attempt awal, membuka AI sebelum attempt, AI membuat jawaban final, nilai final dari AI, branching black box, mengubah schema tanpa migration, `any` untuk menghilangkan error, dependency tanpa alasan, card seragam semua, button pill semua, gradient berlebihan, file monolitik, melewati checkpoint, klaim test berhasil tanpa menjalankannya.
