<!-- @format -->

# CHANGELOG — PT-AI Learning Management System

Mencatat perubahan arsitektur dan perubahan signifikan per fase.

## [Halaman masuk] — 2026-08-29

### Diubah

- **`/` menjadi permukaan masuk**, bukan halaman pemasaran. Komposisi terbagi 45/55: kolom kiri memuat identitas sistem, kolom kanan memuat formulir masuk. Kartu prinsip, deretan tahap berbingkai, dan tautan dokumentasi dihapus karena tidak melayani tujuan halaman.
- `/` dan `/login` kini merender komponen yang sama (`src/features/auth/components/auth-screen.tsx`). `/login` tetap menerima `redirectTo` dan `error` dari proxy, sehingga alur pengalihan tidak berubah.
- `AUTH_ROUTES` di `src/proxy.ts` menyertakan `/` agar pengguna yang sudah bersesi tidak mendarat di formulir masuk. Ini satu-satunya perubahan perilaku proxy; logika sesi, peran, dan pengalihan lain tidak disentuh.
- Tata letak ponsel dirancang ulang, bukan ditumpuk: blok identitas dipangkas menjadi tiga elemen, panel masuk mengisi sisa ruang, dan seluruh formulir termasuk tautan lupa kata sandi muat tanpa menggulir pada viewport 390×844.
- Autentikasi tidak berubah: `SignInForm`, Server Action `signIn`, dan skema validasi tetap apa adanya. Tidak ada SSO atau "ingat saya" yang ditambahkan karena keduanya memang tidak didukung.

## [Penyelarasan proposal] — 2026-08-29

### Diubah

- **Checklist keterlaksanaan diperluas dari 6 ke 10 komponen** mengikuti Lampiran 4 proposal. Butir baru: `claim_analysis`, `alternatives_tested`, `adaptive_branching`, `dose_ethics_incident`. Enam kunci lama dipertahankan agar catatan observasi yang sudah ada tetap terbaca; sebagian labelnya diperluas. `fidelityRate()` menghitung terhadap sepuluh butir, sehingga ambang §Y ("komponen inti terlaksana ≥ 80%") kini diukur atas basis yang dijanjikan proposal.
- Formulir fidelity dikelompokkan menjadi Persiapan, Sintaks, dan Tata kelola. Sepuluh kotak berbingkai diganti tiga daftar bergaris agar penambahan butir tidak menambah kebisingan visual.
- `activities.mastery_threshold` didokumentasikan sebagai **rujukan penilaian dosen, bukan gerbang otomatis**. Kolom ini memang tidak dibaca `computeStageAccess`; tanpa keterangan, perilaku itu terbaca sebagai fitur yang belum selesai.

### Diperbaiki

- Halaman depan kembali menyebut tujuan **kemampuan berpikir kritis**. Penulisan ulang halaman depan sebelumnya menghapus frasa itu dan memutus `home-page.test.tsx`; regresi ini tidak terdeteksi karena pengujian belum dijalankan ulang setelah commit tersebut.

## [PHASE 15] — 2026-08-29 — Production Hardening

### Ditambahkan

- **Header keamanan** di `src/proxy.ts`: CSP dengan nonce per permintaan, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, dan `Permissions-Policy`.
- **Kuota bantuan AI** (`src/lib/ai/quota.ts`): 20 permintaan per jam dan 80 per hari per mahasiswa, diperiksa **sebelum** penyedia dipanggil.
- **Audit aksesibilitas** `e2e/accessibility.spec.ts` memakai `@axe-core/playwright` pada delapan halaman kunci; pelanggaran serious/critical menggagalkan pengujian.
- `scripts/check-security-headers.mjs` beserta `npm run check:headers`.
- `docs/DEPLOYMENT.md` — prasyarat, urutan rilis, prosedur rollback, dan pencabutan kunci.
- Test: `ai-quota.test.ts` (7), `accessibility.spec.ts` (8).

### Diubah

- Seluruh `Button` yang dirender sebagai `Link` diganti `Link` bergaya `buttonVariants`. Peringatan Base UI hilang dan tautan navigasi kembali diumumkan sebagai tautan, bukan tombol.
- Halaman publik (`/`, `/design-system`, `/forgot-password`, `/reset-password`) dipaksa dinamis; halaman statis tidak dapat membawa nonce CSP sehingga skrip hidrasinya diblokir.
- Token warna `text-subtle` dinaikkan kontrasnya agar memenuhi WCAG AA.
- **Retensi pada domain append-only kini ditolak sepenuhnya**, bukan diterima lalu diam-diam tidak berjalan. Formulir hanya menawarkan domain yang benar-benar tunduk retensi dan menyatakan batas itu secara terbuka.
- `nanoid` dipaksa ke `^3.3.18` lewat `overrides`; `npm audit --omit=dev` melaporkan 0 kerentanan.

## [PHASE 14] — 2026-08-29 — Research and Governance

### Ditambahkan

- `supabase/migrations/20260829100017_research_export.sql` — fungsi `security definer` pembungkus view `research.*`, hak eksekusinya **dicabut** dari `public`, `anon`, dan `authenticated`, lalu diberikan hanya kepada `service_role`.
- `src/lib/research/{consent,export}.ts` — keadaan persetujuan, pseudonim acak, validasi retensi, dan serialisasi CSV yang menolak kolom beridentitas.
- `src/server/research/participants.ts`, `src/actions/research/{consent,instruments,retention}.ts`.
- `src/features/research/components/{consent-form,instrument-forms,retention-form}.tsx`.
- Route `/app/student/consent`, `/app/lecturer/classes/[classId]/instruments`, `/app/admin/retention`, dan Route Handler `/api/research/export`.
- `scripts/apply-retention.mjs` beserta `npm run data:retention` — **dry-run secara bawaan**.
- Test: `research-governance.test.ts` (20), `research-governance.test.sql` (14), `consent.spec.ts` (8).

### Diubah

- Navigasi mahasiswa menambahkan "Persetujuan penelitian"; navigasi admin menambahkan "Retensi data"; detail kelas menambahkan tautan "Instrumen".
- `src/lib/supabase/types.ts` menambahkan tipe untuk lima fungsi RPC baru.

### Keputusan

- Penghapusan data penelitian dilakukan dengan **memutus pemetaan identitas** (`research.participants`), bukan menghapus jejak belajar. Jejak itu append-only dan tidak dapat dihapus koneksi mana pun, termasuk `service_role` (LOCK-PED-012).
- Ekspor penelitian **hanya untuk admin**; setiap akses tercatat di `audit_logs`.

## [PHASE 13] — 2026-08-28 — Analytics

### Ditambahkan

- `src/lib/analytics/aggregate.ts` — `summarizeDimensions()`, `summarizeMasteryDistribution()`, `deriveObservations()`, `fidelityRate()`. Fungsi murni tanpa I/O.
- `src/server/analytics/events.ts` — penulis `learning_events` lewat service role. Tabel itu sengaja tidak punya policy INSERT agar peristiwa tidak dapat dipalsukan klien.
- `src/server/repositories/analytics.ts`, `src/actions/assessment/incidents.ts`.
- `src/features/analytics/components/{analytics-cards,incident-resolution-form,fidelity-form}.tsx`.
- Route `/app/lecturer/incidents` (tinjauan laporan respons AI) dan `/app/lecturer/classes/[classId]/analytics` (distribusi, peristiwa, pengamatan proses, checklist keterlaksanaan).
- Test: `analytics-aggregate.test.ts` (16), `analytics-access.test.sql` (12), `analytics.spec.ts` (6).

### Diubah

- Dashboard mahasiswa, halaman progres, dan dashboard dosen memakai data nyata. Dimensi yang belum pernah diukur **tidak** ditampilkan sebagai nol, melainkan sebagai keadaan kosong.
- `DimensionBars` menerima hasil pengukuran nyata dan menampilkan perubahan antar-pengukuran.
- Peristiwa dicatat pada pengiriman respons awal, revisi, refleksi, verifikasi sumber, permintaan bantuan AI, dan keputusan ketuntasan. Kegagalan pencatatan tidak membatalkan pekerjaan mahasiswa.
- Navigasi dosen menambahkan "Laporan AI"; detail kelas menambahkan tautan "Analitik" dan "Percabangan".

### Dihapus

- `src/mocks/` (seluruh folder), `MockBanner` beserta pengujiannya.
- `RemedialCard` dan `EnrichmentCard` — keduanya hanya dipakai dengan alasan rekomendasi yang dikarang; rekomendasi nyata sudah ditampilkan dari `branching_decisions`.
- Tipe mati `DimensionProgress`, `MasteryDistributionItem`, `IncidentItem`, `ReviewQueueItem`, `CriticalThinkingDimension`.

## [PHASE 12] — 2026-08-28 — Revision and Reflection

### Ditambahkan

- `src/lib/revision/diff.ts` — diff kata-per-kata berbasis LCS. Fungsi murni tanpa dependency baru; teks asli tidak pernah ditulis ulang.
- `src/lib/validation/revision.ts` — skema revisi, alasan revisi, sembilan unsur refleksi, dan umpan balik dosen.
- `src/server/repositories/revisions.ts`, `src/actions/learning/revisions.ts`, `src/actions/assessment/feedback.ts`.
- `src/features/learning-workspace/components/{revision-form,revision-history,reflection-form}.tsx`.
- `src/features/assessment/components/lecturer-feedback-form.tsx`.
- Test: `revision-reflection.test.ts` (13), `revision-reflection.test.sql` (14), `revision.spec.ts` (7).

### Diubah

- `AttemptGate` menerima riwayat revisi dan refleksi; placeholder "Simpan revisi (PHASE 12)" diganti fungsi nyata.
- `evaluateProcessCriteria()` menambahkan kriteria refleksi. Refleksi **tidak** menjadi gerbang keras — ketidaklengkapannya ditampilkan kepada dosen, keputusan tetap di tangan dosen.
- Halaman `/app/lecturer/review/[attemptId]` menampilkan riwayat revisi, diff, refleksi sembilan unsur, dan formulir umpan balik per revisi.

### Tidak diubah

- Tidak ada migration baru. Tabel, constraint, dan trigger untuk revisi serta refleksi sudah ada sejak PHASE 4.

## [PHASE 11] — 2026-08-28 — Mastery and Branching

### Ditambahkan

- `src/lib/mastery/access.ts` — `computeStageAccess()`, `evaluateProcessCriteria()`, `weightedRubricScore()`. Logika murni tanpa I/O sehingga dapat diuji langsung.
- `src/lib/validation/assessment.ts` — skema penilaian rubrik, aturan percabangan, keputusan percabangan, dan override.
- `src/server/repositories/mastery.ts`, `src/actions/assessment/{scoring,branching}.ts`.
- `src/features/assessment/components/{scoring-form,branching-rule-form}.tsx`.
- Route `/app/lecturer/review/[attemptId]` (penilaian rubrik, keputusan jalur, override) dan `/app/lecturer/classes/[classId]/branching` (aturan percabangan kelas).
- Test: `mastery-access.test.ts` (12), `mastery-branching.test.sql` (12), `mastery.spec.ts` (7).

### Diubah

- Halaman tahap mahasiswa memakai `computeStageAccess()`; status `provisional` ditampilkan sebagai "menunggu konfirmasi dosen", bukan sebagai kelulusan.
- `MasteryStatus` menerima hasil ketuntasan nyata beserta jenis penilai dan kriteria proses.
- Halaman progres mahasiswa menampilkan hasil ketuntasan dan alasan keputusan jalur belajar.
- **`playwright.config.ts` menjalankan E2E di atas server produksi** (`npm run build && npm run start`), bukan `next dev`. Kompilasi Turbopack pada akses pertama membuat halaman berat melewati 60 detik, sehingga E2E mengukur waktu kompilasi alih-alih perilaku aplikasi.
- `e2e/fixtures/learning-content.ts` mencoba ulang saat `uq_learning_units_sequence` bentrok antar-spec paralel.

### Dihapus

- `resolveStageAccess()` dan tipe `StageAccess` dari `src/lib/constants/stages.ts`, digantikan modul mastery.

## [PHASE 10] — 2026-08-28 — AI Coach and RAG

### Ditambahkan

- `supabase/migrations/20260828100016_ai_retrieval.sql` — `match_source_chunks()` (`security definer`, dibatasi source pack) dan `pending_embedding_count()`.
- `src/server/ai/{provider,types,fake-provider,prompts,schemas,coach}.ts` — adapter Gemini, prompt berpseudonim, validasi keluaran, dan orkestrator interaksi.
- `src/lib/ai/vector.ts` — normalisasi vektor embedding.
- `src/actions/ai/coach.ts` dan `src/server/repositories/ai.ts`.
- `src/features/ai-coach/components/ai-disclosure-form.tsx`; panel AI ditulis ulang memakai data nyata.
- Skrip: `db:migrate`, `ai:index`, `ai:check`.
- Test: `ai-schema.test.ts` (10), `ai-policy.test.sql` (12), `ai-coach.spec.ts` (7).

### Diubah

- `AttemptGate` menerima izin AI, riwayat umpan balik, dan pernyataan penggunaan AI.
- `playwright.config.ts` menjalankan server E2E dengan `AI_PROVIDER_MODE=fake`.
- `scripts/seed-dev-academics.mjs` mengaktifkan tiga fungsi AI pada aktivitas seed.
- `.env.example` memakai `GEMINI_API_KEY`; `check:secrets` memindainya.

### Dihapus

- `src/mocks/ai-feedback.ts`, komponen `AIFeedbackCard`, dan tipe `AIFeedbackItem`.

### Dependency baru

- `@google/genai@^2.19.0`

## [PHASE 9] — 2026-08-28 — Source Verification

### Ditambahkan

- `src/lib/constants/verification.ts` — enam kriteria LOCK-PED-007 dengan kunci yang sama seperti constraint database.
- `src/lib/validation/sources.ts`, `src/server/repositories/sources.ts`.
- `src/actions/sources/{curation,verification}.ts` — kurasi sumber, source pack, klaim kasus, verifikasi, penautan bukti.
- Rute `/app/lecturer/sources`; source pack dan klaim pada halaman unit perancang materi.
- Test: `source-validation.test.ts` (9), `source-access.test.sql` (11), `verification.spec.ts` (6), `curation.spec.ts` (3).

### Diubah

- `VerificationChecklist` dan `ClaimEvidenceLinker` menyimpan ke database, bukan state lokal.
- `SourceViewer` dan `EvidenceCard` memakai data sumber nyata beserta status verifikasi mahasiswa.
- Halaman sumber menerima parameter `?activity=` karena verifikasi selalu tercatat dalam konteks tugas.
- `scripts/run-db-tests.mjs` menolak berkas pgTAP yang jumlah testnya tidak cocok dengan `plan(n)`.
- `scripts/seed-dev-academics.mjs` menyeed dua sumber terkurasi dan dua klaim kasus.

### Dihapus

- `src/mocks/sources.ts` dan `src/mocks/claims.ts`; tipe sumber dan klaim dibuang dari `types/learning.ts`.

### Dependency baru

Tidak ada. Unggah berkas ke Supabase Storage ditunda — `source_files` sudah siap tetapi belum dibutuhkan.

## [PHASE 8] — 2026-08-28 — Student Learning Workspace

### Ditambahkan

- `src/server/repositories/attempts.ts` — keadaan kerja aktivitas, riwayat mahasiswa, antrean tinjauan dosen.
- `src/actions/learning/attempts.ts` — `saveDraftAction` dan `submitAttemptAction` dengan `content_hash` sisi server dan idempotensi `client_submission_id`.
- `src/lib/validation/attempts.ts` — skema Zod draf dan pengiriman respons awal.
- `src/features/learning-workspace/components/answer-editor.tsx` — autosave ter-debounce dengan indikator status.
- `e2e/fixtures/learning-content.ts` — pembuat unit sekali pakai untuk pengujian attempt yang dapat diulang.
- Test: `attempt-validation.test.ts` (5), `attempt-integrity.test.sql` (10), `attempt.spec.ts` (6), `review.spec.ts` (2).

### Diubah

- `AttemptGate` membaca draf dan baseline dari database; keadaan tidak lagi disimulasikan di klien.
- Halaman tahap mahasiswa memuat keadaan kerja aktivitas pertama tahap tersebut.
- `/app/student/progress` menampilkan respons yang sudah dikirim; `/app/lecturer/review` menampilkan antrean nyata tanpa kendali ubah.
- `student.spec.ts` tidak lagi mengirim baseline — penguncian AI diuji di `attempt.spec.ts` dengan data sekali pakai.
- `playwright.config.ts` mendaftarkan `attempt.spec.ts` dan `review.spec.ts`.

### Dependency baru

Tidak ada.

## [PHASE 7] — 2026-08-12 — Course Builder

### Ditambahkan

- `src/lib/constants/stages.ts` — pemetaan enum tahap dan dimensi ke label Indonesia serta `resolveStageAccess()`.
- `src/lib/validation/content.ts` — skema Zod untuk modul, unit, kasus, aktivitas, instruksi, tahap, dan rubrik.
- `src/server/repositories/{content,rubrics}.ts` — pembacaan materi untuk dosen dan mahasiswa secara terpisah.
- `src/actions/courses/{content,rubrics}.ts` — Server Actions materi dan rubrik dengan publikasi berjenjang.
- Rute `/app/lecturer/classes/[classId]/builder`, `.../builder/units/[unitId]`, dan `/app/lecturer/rubrics`.
- `src/features/course-builder/components/{builder-forms,rubric-forms}.tsx`.
- Test: `content-validation.test.ts` (9), `content-access.test.sql` (10), `builder.spec.ts` (5 skenario E2E).

### Diubah

- `LearningStageKey` mengikuti enum `stage_key` database (Inggris) agar URL tahap konsisten dengan basis data.
- Dashboard, detail kelas, dan ruang belajar mahasiswa membaca modul, unit, kasus, tahap, serta aktivitas dari database.
- Halaman kelas dosen menampilkan struktur materi nyata dan tautan ke perancang materi.
- `scripts/seed-dev-academics.mjs` menyeed modul, unit, kasus, aktivitas, dan instruksi.
- `playwright.config.ts` mendaftarkan `builder.spec.ts` pada project `lecturer`.

### Dihapus

- `src/mocks/units.ts` dan `src/mocks/cases.ts` — digantikan data nyata; `MOCK_CLAIMS` dipindah ke `src/mocks/claims.ts`.

### Dependency baru

Tidak ada.

## [PHASE 6] — 2026-08-12 — Academic Structure

### Ditambahkan

- `src/server/repositories/*` — lapisan akses data `server-only` dengan penanganan galat terpusat.
- `src/server/services/account-service.ts` — pembuatan akun dan pengelolaan peran melalui `withAuditedAdmin()`.
- `src/actions/administration/accounts.ts` dan `src/actions/academics/structure.ts` — Server Actions bervalidasi Zod dengan guard peran.
- Area `/app/admin/*`: dashboard, pengguna, organisasi, periode akademik, mata kuliah, kelas, detail kelas.
- `ClassCard` berbasis data nyata; skrip `npm run db:seed:academics`.
- Test: `academics-validation` (unit), `academic-access.test.sql` (8 skenario), `admin.spec.ts` (5 skenario E2E).

### Diubah

- Halaman kelas mahasiswa dan dosen membaca database, bukan mock.
- Detail kelas dilindungi `requireClassAccess()` / `requireLecturerOfClass()`.
- `signIn` membedakan rate limit (429) dari kredensial salah.
- `test:e2e` memuat `.env.local` di proses induk.
- Skrip seed akun memverifikasi kredensial dapat dipakai masuk.

### Dihapus

- `src/mocks/classes.ts` — digantikan data nyata.

### Dependency baru

Tidak ada.

### Status verifikasi

`lint` ✓ · `typecheck` ✓ · `test` 58/58 ✓ · `test:db` 26/26 ✓ · `test:e2e` 30/30 ✓ · `build` 25 route ✓ · `check:secrets` ✓.

## [PHASE 5] — 2026-08-12 — Supabase SSR Authentication

### Ditambahkan

- `src/lib/supabase/{client,server,admin}.ts` — tiga klien terpisah; `admin.ts` bertanda `server-only` dan seluruh operasinya dibungkus `withAuditedAdmin()` yang menulis `audit_logs`.
- `src/proxy.ts` — penyegaran cookie sesi + redirect optimistik, dengan matcher yang mengecualikan aset statis.
- `src/lib/supabase/auth.ts` — Data Access Layer otorisasi berbasis `getUser()`; `src/lib/permissions/roles.ts` untuk logika peran murni.
- `src/lib/errors/index.ts` — domain error dengan pemisahan `publicMessage` dan detail internal.
- `src/lib/validation/auth.ts` — skema Zod untuk masuk, permintaan reset, dan penetapan kata sandi baru.
- Server Actions `src/actions/auth/*` dan Route Handler `/auth/callback`.
- Halaman `/login`, `/forgot-password`, `/reset-password`, `/app/forbidden` yang fungsional.
- Skrip `npm run db:seed:users` dan `npm run check:secrets`.
- E2E terstruktur per peran memakai `storageState` (project `setup`, `guest`, `student`, `lecturer`).

### Diubah

- `/app` tidak lagi meminta pengguna memilih peran; peran diambil dari sesi server (SEC-004).
- Layout mahasiswa dan dosen memanggil `requireStudentAccess()` / `requireLecturerAccess()` serta menampilkan profil nyata.
- `signOut()` memakai `scope: "local"` agar keluar di satu perangkat tidak memutus sesi perangkat lain.

### Dependency baru

`@supabase/supabase-js`, `@supabase/ssr`, `zod`, `server-only`.

### Status verifikasi

`lint` ✓ · `typecheck` ✓ · `test` 50/50 ✓ · `test:e2e` 24/24 ✓ · `test:db` 18/18 ✓ · `build` (20 route) ✓ · `check:secrets` nol kebocoran ✓.

## [PHASE 4] — 2026-08-11 — Database Architecture

### 4A — Desain (selesai, disetujui)

- [DATABASE.md](DATABASE.md), [DATABASE_DICTIONARY.md](DATABASE_DICTIONARY.md), [RLS_MATRIX.md](RLS_MATRIX.md): ERD 10 domain, kamus data 60 tabel, matriks RLS, rencana migration dan rollback.
- OPEN-002 dan DB-01 s.d. DB-07 ditetapkan LOCKED.

### 4B — Implementasi (**selesai dan terverifikasi**)

- 15 file migration di `supabase/migrations/` (2.039 baris) **diterapkan ke Supabase Cloud tanpa error**: ekstensi + 23 enum, 60 tabel, schema `research` dengan 3 view berpseudonim, 19 fungsi `security definer`, 15 trigger append-only, policy RLS seluruh tabel, 45 index.
- `src/lib/supabase/types.ts` — generated types (3.583 baris, 63 Row).
- `supabase/seed/0001_development_seed.sql` dijalankan; `supabase/tests/rls.test.sql` **18/18 lulus**.
- Penegakan pedagogis di level database: `attempt_drafts` vs `attempts`, trigger `prevent_mutation()` yang juga mengikat `service_role`, `ai_interactions.attempt_id NOT NULL`, `reason`/`explanation` NOT NULL pada branching, `require_lecturer_scorer()`, `protect_stage_order()`.
- Skrip pendukung: `npm run test:db` (pgTAP via driver `pg`, tanpa Docker), `npm run db:seed`, `npm run check:sql`.

### Dependency baru

`pg` dan `@types/pg` (devDependency) — `supabase test db` mensyaratkan Docker yang tidak tersedia, sehingga runner sendiri diperlukan agar test RLS dapat dijalankan dan diulang.

### Perbaikan selama fase

- `learning_units_lecturer_write`: `with check (... or true)` → `class_of_module()` yang benar.
- `lecturer_overrides_select`: akses mahasiswa dipersempit ke artefak miliknya sendiri.
- `types.ts` dikonversi dari UTF-16LE ke UTF-8 (efek redirect `>` PowerShell 5.1).
- Pemakaian `throws_ok` diperbaiki menjadi `throws_ok(sql, SQLSTATE, null, deskripsi)` sehingga menguji kode error spesifik.
- Test baseline diubah: `UPDATE` oleh mahasiswa tidak melempar error (RLS membuatnya mengenai nol baris), sehingga yang diverifikasi adalah isi baseline tetap utuh.

### Status verifikasi

`db push` 15/15 ✓ · `test:db` 18/18 ✓ · `db:seed` ✓ · `lint`, `typecheck`, `test` (35), `build` (17 route), `check:sql` (7/7) semuanya exit 0.

## [PHASE 3] — 2026-08-11 — Visual Prototype

### Ditambahkan

- Tipe domain prototipe `src/types/learning.ts` (peran, 6 dimensi, 6 tahap, siklus attempt→mastery, kelas, unit, kasus, sumber, klaim, feedback AI, analitik).
- Mock data berlabel di `src/mocks/` (`users`, `classes`, `units`, `cases`, `sources`, `ai-feedback`, `analytics`) — konstanta ber-prefix `MOCK_`, header `MOCK`, nama fiktif.
- `MockBanner` dan 10 card variant: HeroLearningCard, CourseCard, CaseCard (`learning-cards`), EvidenceCard, AIFeedbackCard (`evidence-cards`), InsightCard, AnalyticsCard, DimensionBars (`insight-cards`), LockedCard, RemedialCard, EnrichmentCard (`pathway-cards`).
- Fitur learning workspace: `PhaseRail`/`PhaseStepper` (6 tahap berurutan), `CaseReader` (kanvas baca hangat), `AttemptGate` (attempt-first + baseline read-only + revisi), `MasteryStatus` (siklus + kriteria kinerja).
- Fitur AI coach: `AIBoundaryNotice`, `AIFeedbackPanel` (aksi Terima/Abaikan/Laporkan, dinonaktifkan pada prototipe).
- Fitur verifikasi: `SourceViewer` (metadata + kutipan), `VerificationChecklist` (6 kriteria interaktif), `ClaimEvidenceLinker`.
- Route publik `/login`, `/forgot-password`; route prototipe `/app`, `/app/student/*` (dashboard, classes, learn/stage, sources, progress), `/app/lecturer/*` (dashboard, classes, review) beserta `loading.tsx` dan `error.tsx` per area.
- Navigasi per peran (`STUDENT_NAV`, `LECTURER_NAV`) di `src/lib/navigation.ts`.
- Test baru: `attempt-gate`, `phase-navigation`, `verification-checklist` + `MockBanner` (RTL) dan `e2e/prototype.spec.ts` (5 skenario desktop + 1 mobile).

### Diubah

- `CardTitle` menerima prop `as` (`div` default, atau `h2`/`h3`/`h4`) agar judul kartu dapat menjadi heading semantik; `AnalyticsCard` memakai `as="h3"`.
- `src/app/page.tsx`: tautan ke halaman masuk, prototipe aplikasi, dan galeri design system.
- Komponen shadcn tambahan: `input`, `label`, `textarea`, `checkbox`, `progress`, `avatar`, `tabs` (disalin CLI, **tanpa** dependency npm baru).

### Catatan penting

- Route group `(protected)` **belum terproteksi**; halaman `/app` (pemilih peran) adalah alat prototipe dan dihapus pada PHASE 5.
- Tidak ada panggilan AI: isi `AIFeedbackPanel` berasal dari mock statis.

### Hasil verifikasi (dijalankan nyata)

- `npm run lint` → exit 0; `npm run typecheck` → exit 0.
- `npm run test` → 9 file, 35 test lulus.
- `npm run build` → sukses (17 route: 12 static, 5 dynamic).
- `npm run test:e2e` → 11 test lulus (3 kegagalan awal ditemukan dan diperbaiki: heading kartu non-semantik + selector teks terlalu longgar).

## [PHASE 2] — 2026-08-05 — Design System and Application Shell

### Ditambahkan

- Design tokens tema "Civic Intelligence" di `src/app/globals.css`: seluruh palet LOCKED (shell gelap + reading canvas hangat), token semantik aqua/violet/amber/mint/coral/blue, skala tipografi (display 48 → caption 12), dimensi layout (sidebar 17rem/5rem, topbar 4.5rem, context panel 22.5rem, container shell 100rem, reading 47.5rem), radius dasar 12px, scope `.reading-surface`, utility `reading-prose`.
- Kustomisasi penuh `Button` (primary aqua 44px/radius 12px/weight 600, ai violet tinted, outline, ghost, danger, link) — LOCK-TECH-011.
- Komponen shadcn: `card`, `badge`, `skeleton`, `sheet`, `separator`, `tooltip` (disalin via CLI, tanpa dependency npm baru).
- `StatusBadge` (9 status semantik), 6 komponen state (`LoadingState`, `SkeletonState`, `EmptyState`, `ErrorState`, `ForbiddenState`, `LockedState`) dengan `StateShell` bersama.
- Application shell: `AppShell`, `Sidebar`/`SidebarNav`, `Topbar`, `MobileNavigation`, `PageContainer`, `PageHeader`, `BentoGrid`; konfigurasi navigasi serializable `src/lib/navigation.ts`; skip link + focus-visible + toggle keyboard.
- Halaman galeri internal `/design-system` (berlabel, akan digate sebelum produksi).
- Test baru: `button`, `status-badge`, `states`, `app-shell` (RTL) dan `e2e/design-system.spec.ts` (desktop + viewport mobile).

### Diubah

- `src/app/layout.tsx`: class `dark` pada `<html>` (tema tunggal gelap — NOTE-006).
- `src/app/page.tsx`: badge fase + tautan ke galeri design system.
- `.dark` block dihapus dari globals.css; `:root` menjadi satu-satunya sumber token.

### Keputusan teknis dalam fase

- Tema aplikasi adalah gelap permanen; reading canvas adalah scope permukaan, bukan theme switch (NOTE-006).
- State collapse sidebar memakai React state lokal — Zustand belum diperlukan (LOCK-TECH-016: state lokal terlebih dahulu).
- Ikon navigasi dikirim lintas batas RSC sebagai string key (`NavIconKey`), bukan fungsi komponen.

### Hasil verifikasi (dijalankan nyata)

- `npm run lint` → exit 0; `npm run typecheck` → exit 0.
- `npm run test` → 6 file, 23 test lulus.
- `npm run build` → sukses (3 route static).
- `npm run test:e2e` → 5 test lulus (sidebar 272↔80px terukur; touch target ≥44px pada viewport 390×844).

## [PHASE 1] — 2026-08-05 — Next.js Foundation

### Ditambahkan

- Inisialisasi Next.js 16.3.0 App Router (Turbopack) dengan TypeScript, Tailwind CSS v4, ESLint 9 (flat config), `src/` directory, import alias `@/*`.
- TypeScript strict diperketat: `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — semuanya aktif dan lolos typecheck + build.
- Tipografi tema via `next/font/google` (`src/lib/fonts.ts`): Space Grotesk (heading), Source Sans 3 (body/UI), IBM Plex Mono (metadata) — terhubung ke token Tailwind `font-heading`, `font-sans`, `font-mono`.
- shadcn/ui diinisialisasi (style `base-nova`, base color neutral, CSS variables, icon library Lucide) — `components.json`, `src/lib/utils.ts` (`cn`).
- Halaman placeholder Bahasa Indonesia (`src/app/page.tsx`) — Server Component tanpa `"use client"`.
- Fondasi error global Bahasa Indonesia: `src/app/error.tsx` (Client Component sesuai kontrak Next.js, tanpa stack trace ke pengguna), `src/app/not-found.tsx`, `src/app/loading.tsx`.
- Toolchain testing: Vitest 4 + React Testing Library (`vitest.config.mts`, `src/test/setup.ts`) dan Playwright (`playwright.config.ts`, `e2e/smoke.spec.ts`, webServer otomatis di localhost:3000).
- `.env.example` tanpa nilai secret; `.gitignore` diperluas untuk artefak Playwright.
- Script npm: `typecheck`, `test`, `test:watch`, `test:e2e`.

### Keputusan teknis dalam fase

- `@vitejs/plugin-react-swc` dipilih menggantikan `@vitejs/plugin-react` karena konflik peer dependency Babel 8 pada rantai `@vitejs/plugin-react@6` — SWC juga konsisten dengan toolchain Next.js. (Catatan: Vitest memakai Vite hanya sebagai internal test transformer; bukan pelanggaran ARCH-010/ARCH-012.)
- `vite-tsconfig-paths` dihapus; resolusi alias memakai opsi native `resolve.tsconfigPaths` di Vite.
- Konfigurasi Vitest memakai ekstensi `.mts` sesuai anjuran ESM Vite.
- shadcn v4 default style `base-nova` menggunakan `@base-ui/react` (Base UI) sebagai primitive layer dan paket `shadcn` sebagai runtime CSS preset (`@import "shadcn/tailwind.css"`), bukan Radix per komponen.
- File template `AGENTS.md`, `CLAUDE.md`, `README.md`, dan asset `public/*.svg` bawaan scaffold dipertahankan (tidak dihapus tanpa audit).
- Scaffold dilakukan via subfolder sementara `pt-ai-lms` karena npm menolak nama folder berhuruf kapital `PT-AI`; seluruh isi dipindahkan ke root (nama package: `pt-ai-lms`).

### Hasil verifikasi (dijalankan nyata)

- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm run test` → 2 file, 5 test lulus.
- `npm run build` → sukses (route `/` dan `/_not-found` static).
- `npm run test:e2e` → 2 test Playwright lulus (beranda + 404).
- `npm run dev` → ready 643ms; HTTP 200 di http://localhost:3000 dengan konten terverifikasi.

## [PHASE 0] — 2026-08-05 — Repository Audit and Planning

- Audit repository: folder kosong, greenfield, tanpa kode Vite/React lama.
- Dokumen dasar dibuat: DECISIONS, MASTER_PLAN, PROGRESS, ARCHITECTURE, ENVIRONMENT.
