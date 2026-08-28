<!-- @format -->

# PROGRESS — PT-AI Learning Management System

Dokumen ini mencatat kemajuan setiap fase. Diperbarui pada akhir setiap fase atau saat terjadi perubahan signifikan.

## Status Fase

| Fase | Nama                                | Status                                     | Mulai      | Selesai    |
| ---- | ----------------------------------- | ------------------------------------------ | ---------- | ---------- |
| 0    | Repository Audit and Planning       | ✅ SELESAI — disetujui                     | 2026-08-05 | 2026-08-05 |
| 1    | Next.js Foundation                  | ✅ SELESAI — disetujui                     | 2026-08-05 | 2026-08-05 |
| 2    | Design System and Application Shell | ✅ SELESAI — disetujui                     | 2026-08-05 | 2026-08-05 |
| 3    | Visual Prototype                    | ✅ SELESAI — menunggu persetujuan PHASE 4  | 2026-08-11 | 2026-08-11 |
| 4    | Database Architecture               | ✅ SELESAI — menunggu persetujuan PHASE 5  | 2026-08-11 | 2026-08-12 |
| 5    | Supabase SSR Authentication         | ✅ SELESAI — menunggu persetujuan PHASE 6  | 2026-08-12 | 2026-08-12 |
| 6    | Academic Structure                  | ✅ SELESAI — disetujui                     | 2026-08-12 | 2026-08-12 |
| 7    | Course Builder                      | ✅ SELESAI — disetujui                     | 2026-08-12 | 2026-08-12 |
| 8    | Student Learning Workspace          | ✅ SELESAI — disetujui                     | 2026-08-28 | 2026-08-28 |
| 9    | Source Verification                 | ✅ SELESAI — disetujui                     | 2026-08-28 | 2026-08-28 |
| 10   | AI Coach and RAG                    | ✅ SELESAI — disetujui                     | 2026-08-28 | 2026-08-28 |
| 11   | Mastery and Branching               | ✅ SELESAI — disetujui                     | 2026-08-28 | 2026-08-28 |
| 12   | Revision and Reflection             | ✅ SELESAI — disetujui                     | 2026-08-28 | 2026-08-28 |
| 13   | Analytics                           | ✅ SELESAI — disetujui                     | 2026-08-28 | 2026-08-28 |
| 14   | Research and Governance             | ✅ SELESAI — menunggu persetujuan PHASE 15 | 2026-08-29 | 2026-08-29 |
| 15   | Production Hardening                | ⬜ Belum dimulai                           | —          | —          |

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 15 — Production Hardening.

## Log PHASE 14 — Research and Governance (2026-08-29)

### Keputusan etis fase ini

**Penghapusan data dilakukan dengan memutus tautan identitas, bukan menghapus jejak.** Trigger `prevent_mutation()` menolak DELETE dari koneksi mana pun, termasuk `service_role` — sudah terbukti pada uji PHASE 12. Artinya aturan retensi beraksi `delete` pada `attempts`, `learning_events`, `ai_interactions`, dan `audit_logs` **tidak mungkin** dijalankan. Membangun tombol "hapus data saya" di atas kenyataan itu akan menjadi janji palsu kepada partisipan.

Yang dijalankan: menarik persetujuan menghapus baris `research.participants` — satu-satunya pemetaan identitas ke pseudonim. Sesudahnya jejak belajar tetap ada untuk keperluan akademik tetapi tidak dapat lagi dikaitkan kepada seseorang oleh siapa pun, termasuk admin. Konsekuensi ini dinyatakan apa adanya pada lembar persetujuan, bukan disamarkan.

**Ekspor hanya untuk admin.** Ekspor melintasi kelas dan bukan bagian dari kewenangan mengajar, sehingga dosen tidak diberi akses.

### Yang dikerjakan

- **Persetujuan berdasarkan informasi** di `/app/student/consent`: lima keterangan wajib, tombol terkunci sampai mahasiswa mengakui telah membacanya, dan dapat diubah kapan saja. **Dosen tidak memiliki policy membaca `consent_records`** agar keikutsertaan tidak memengaruhi perlakuan akademik.
- **Pseudonim acak**, bukan turunan NIM atau nama. Turunan identitas dapat dibalik dengan menebak, sehingga bukan anonimisasi.
- **Pretest dan posttest** di `/app/lecturer/classes/[classId]/instruments`; skornya masuk `critical_thinking_scores` dengan `measurement_source` yang benar sehingga perbandingan sebelum dan sesudah perlakuan tetap sah.
- **Ekspor anonim** lewat `/api/research/export`. Schema `research` tidak diekspos PostgREST dan `pg` hanya devDependency, sehingga jalurnya adalah fungsi `security definer` yang hak eksekusinya dicabut dari peran klien.
- **Serialisasi CSV menolak bekerja** bila menemukan kolom beridentitas atau kehilangan kolom `pseudonym`. Gagal lebih baik daripada berkas ekspor yang membocorkan mahasiswa.
- **Retensi data** di `/app/admin/retention` dan `npm run data:retention` yang **dry-run secara bawaan**; perubahan nyata menuntut `--apply`.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                                  |
| ---------------------------- | ---------------------------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                                              |
| `npm run test`               | ✅ 20 file, **157 test** lulus                                         |
| `npm run test:db`            | ✅ **121/121** lulus (+14 tata kelola penelitian)                      |
| `npm run test:e2e`           | ✅ **88/88** lulus; dijalankan dua kali berturut-turut dan tetap hijau |
| `npm run build`              | ✅ 39 route, exit 0                                                    |
| `npm run data:retention`     | ✅ dry-run berjalan, nol baris diubah                                  |
| `npm run check:secrets`      | ✅ nol kebocoran (47 bundel klien dipindai)                            |
| `npm run check:sql`          | ✅ 7/7 pemeriksaan bersih                                              |

### Masalah yang ditemukan dan diperbaiki

1. **Fungsi `security definer` dapat dieksekusi siapa pun secara bawaan.** PostgreSQL memberi `EXECUTE` kepada `PUBLIC`; tanpa pencabutan eksplisit, mahasiswa mana pun dapat memanggil fungsi ekspor dan menembus batas schema `research` yang justru dibuat untuk memisahkannya. Pencabutan itu kini diuji langsung dengan `has_function_privilege`.
2. **`npm run db:migrate` tanpa argumen mencoba menerapkan ulang migration pertama** dan gagal pada `type "role_key" already exists`, karena pencatatan `ops.applied_migrations` tidak memuat migration lama. Migration baru diterapkan dengan menyebut berkasnya secara eksplisit.
3. **Tipe RPC Supabase tidak ikut terbarui otomatis**, sehingga `supabase.rpc()` untuk lima fungsi baru gagal typecheck sampai `src/lib/supabase/types.ts` dilengkapi.
4. **`getByRole("alert")` cocok ke dua elemen** pada halaman retensi dan membuat Playwright menolak dalam strict mode. Asersi dipersempit ke formulir terkait, bukan dilonggarkan.

### Utang teknis yang dicatat

- Base UI memperingatkan setiap `Button` yang dirender sebagai `Link`; perbaikan yang benar adalah `Link` + `buttonVariants` (PHASE 15).
- `nanoid` high-severity lewat `postcss` (transitif, build-time) — PHASE 15.
- Aksi retensi `anonymize` pada domain append-only belum melakukan transformasi baris apa pun; saat ini anonimisasi hanya terjadi lewat pemutusan pemetaan peserta. Perlu ditinjau pada PHASE 15.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 15 — Production Hardening.

## Log PHASE 13 — Analytics (2026-08-28)

### Keputusan pedagogis fase ini

**Belum diukur bukan nol.** Dimensi yang belum pernah dinilai tidak ditampilkan sebagai skor 0, melainkan sebagai keadaan kosong. Ini dashboard yang dipakai mahasiswa untuk melihat dirinya sendiri; angka 0 akan terbaca "kemampuan Anda nol" padahal artinya "belum ada pengukuran".

**Sistem melaporkan fakta, bukan melabeli orang.** Pengamatan proses berbunyi "belum mengirim respons awal" atau "skor turun dari 80 ke 65 antar-pengukuran", bukan "stagnan" atau "lemah". Label melekat pada orang, sedangkan yang diukur adalah kinerja pada satu waktu — dan tabelnya memang dirancang demikian (`measured_at`, `measurement_source`).

### Yang dikerjakan

- **Telemetri nyata.** `learning_events` sebelumnya tidak pernah ditulis siapa pun, sehingga "analisis pola" hanya akan menjadi grafik kosong yang tampak berisi. Peristiwa kini dicatat pada enam titik: respons awal, revisi, refleksi, verifikasi sumber, permintaan bantuan AI, dan keputusan ketuntasan.
- **Penulisan lewat service role** karena `learning_events` sengaja tidak memiliki policy INSERT — peristiwa tidak boleh dipalsukan dari sesi pengguna. Kegagalan pencatatan dicatat ke log server dan **tidak** membatalkan pekerjaan mahasiswa.
- **Tinjauan laporan respons AI** di `/app/lecturer/incidents` — utang yang tercatat sejak PHASE 10. Penanganannya wewenang dosen kelas, bukan admin, karena menilai kualitas bantuan AI adalah penilaian akademik.
- **Analitik kelas** di `/app/lecturer/classes/[classId]/analytics`: distribusi ketuntasan, peristiwa tercatat, pengamatan proses, dan checklist keterlaksanaan model untuk kebutuhan penelitian.
- **Seluruh mock dihapus.** `src/mocks/` tidak lagi ada.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                                  |
| ---------------------------- | ---------------------------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                                              |
| `npm run test`               | ✅ 19 file, **137 test** lulus                                         |
| `npm run test:db`            | ✅ **107/107** lulus (+12 analitik)                                    |
| `npm run test:e2e`           | ✅ **80/80** lulus; dijalankan dua kali berturut-turut dan tetap hijau |
| `npm run build`              | ✅ 35 route, exit 0                                                    |
| `npm run check:secrets`      | ✅ nol kebocoran (43 bundel klien dipindai)                            |
| `npm run check:sql`          | ✅ 7/7 pemeriksaan bersih                                              |

### Masalah yang ditemukan dan diperbaiki

1. **Tabel telemetri kosong sejak PHASE 4.** `learning_events` punya tabel, index, dan policy `select`, tetapi tidak ada satu pun kode yang menulisinya. Membangun grafik pola di atasnya tanpa memeriksa ini akan menghasilkan dashboard yang terlihat berfungsi padahal selalu kosong.
2. **Dua kartu rekomendasi memakai alasan yang dikarang.** `RemedialCard` dan `EnrichmentCard` pada halaman progres menampilkan kalimat seperti "dua dari tiga klaim Anda belum ditautkan" sebagai teks tetap — terbaca sebagai hasil analisis padahal bukan. Keduanya dihapus; rekomendasi nyata sudah ditampilkan dari `branching_decisions` beserta alasan yang benar-benar dicatat dosen.
3. **Saya sempat menyunting berkas lewat skrip shell** untuk membuang komponen mati, dan Node gagal mem-parsing string berisi tanda kutip. Ini melanggar aturan yang sudah saya catat sendiri sejak PHASE 10; pekerjaannya diulang memakai perkakas edit.
4. **Menghapus `MockBanner` memutus satu pengujian** di `verification-checklist.test.tsx`. Pengujiannya dihapus bersama komponennya, bukan dibiarkan menguji sesuatu yang tidak ada.

### Utang teknis yang dicatat

- Base UI memperingatkan setiap `Button` yang dirender sebagai `Link`; perbaikan yang benar adalah `Link` + `buttonVariants` (PHASE 15).
- `nanoid` high-severity lewat `postcss` (transitif, build-time) — PHASE 15.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 14 — Research and Governance.

## Log PHASE 12 — Revision and Reflection (2026-08-28)

### Keputusan pedagogis fase ini

**Refleksi bukan gerbang keras.** Refleksi yang belum diisi muncul sebagai kriteria proses yang belum lengkap dan terbaca dosen, tetapi tidak memblokir tahap berikutnya. Menjadikannya gerbang otomatis akan mengubah maknanya dari alat metakognisi menjadi formalitas yang dikejar demi membuka tahap — dan itu bertentangan dengan alasan refleksi diwajibkan (LOCK-PED-011).

**Alasan revisi wajib.** Setiap revisi menuntut satu `revision_reasons` dengan detail minimal 10 karakter, ditegakkan constraint database. Bila alasannya menerima atau menolak saran AI, sarannya harus ditunjuk (`ai_feedback_id`) — inilah yang membuat LOCK-PED-006 terbukti, bukan sekadar dinyatakan.

### Yang dikerjakan

- **Revisi sebagai versi baru.** Respons awal tidak pernah ditimpa; setiap revisi menaikkan `revision_number` dan tersimpan permanen (LOCK-PED-004).
- **Diff kata-per-kata** dihitung di `src/lib/revision/diff.ts` dengan LCS, tanpa dependency baru. Perubahan ditampilkan terhadap versi sebelumnya, bukan hanya terhadap respons awal, agar langkah perubahannya terlihat satu per satu.
- **Refleksi sembilan unsur** sebagai field terpisah, bukan satu kotak teks. Satu refleksi per (aktivitas, mahasiswa, respons awal); yang kedua ditolak database.
- **Umpan balik dosen per revisi** tersimpan di `feedback_records` dengan `source='lecturer'`; koreksi ditulis sebagai catatan baru karena tabel ini append-only.
- Halaman penilaian dosen kini menampilkan riwayat revisi, diff, dan refleksi mahasiswa dalam satu layar.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                                                                                      |
| `npm run test`               | ✅ 18 file, **122 test** lulus                                                                                 |
| `npm run test:db`            | ✅ **95/95** lulus (18 RLS + 8 akademik + 10 konten + 10 attempt + 11 sumber + 12 AI + 12 mastery + 14 revisi) |
| `npm run test:e2e`           | ✅ **74/74** lulus; dijalankan dua kali berturut-turut dan tetap hijau                                         |
| `npm run build`              | ✅ 33 route                                                                                                    |
| `npm run check:secrets`      | ✅ nol kebocoran                                                                                               |
| `npm run check:sql`          | ✅ 7/7 pemeriksaan bersih                                                                                      |

### Masalah yang ditemukan dan diperbaiki

1. **Append-only ternyata punya dua lapis, dan uji pertama saya menguji lapis yang salah.** `throws_ok` atas `update public.revisions` dari sesi mahasiswa **gagal** — bukan karena trigger tidak terpasang, melainkan karena tidak ada policy UPDATE sehingga RLS membuat perintah itu tidak mengenai baris mana pun, tanpa error. Bila saya menyimpulkan dari kegagalan itu bahwa perlindungannya bocor, kesimpulannya salah. Pengujian diperbaiki menjadi dua skenario: RLS diuji dengan memeriksa isi baris tidak berubah, trigger diuji dengan `throws_ok` sebagai `service_role`.
2. **Menambah kriteria proses memecahkan dua test lama** di `mastery-access.test.ts` yang mengasumsikan tepat tiga kriteria. Ekspektasinya diperbarui, bukan kriterianya yang dibatalkan.
3. **Komponen klien baru menarik Server Action ke lingkungan uji.** `attempt-gate.test.tsx` gagal memuat sampai `@/actions/learning/revisions` ikut di-mock, karena modul itu mengimpor kode `server-only`.

### Utang teknis yang dicatat

- Base UI memperingatkan setiap `Button` yang dirender sebagai `Link`; perbaikan yang benar adalah `Link` + `buttonVariants` (PHASE 15).
- Belum ada halaman dosen untuk `ai_incidents`.

### Mock yang masih tersisa

`src/mocks/{analytics,users}.ts` — dihapus pada PHASE 13.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 13 — Analytics.

## Log PHASE 11 — Mastery and Branching (2026-08-28)

### Keputusan pedagogis fase ini

**Sistem mengusulkan, dosen memutuskan.** Sistem hanya menilai **kelengkapan proses** — apakah respons awal terkirim, sumber wajib terverifikasi, umpan balik AI tertanggapi. Bila lengkap, sistem menulis `mastery_results` dengan `evaluator_kind = 'system'`, `outcome = 'partially_met'`, dan `is_final = false`, lalu membuka tahap berikutnya **sementara** dengan label "menunggu konfirmasi dosen".

Mutu penalaran dinilai dosen lewat rubrik. Hanya keputusan dosen yang `is_final = true` (LOCK-PED-008, LOCK-PED-010). Constraint `ck_mastery_results_evaluator` menegakkan pembagian ini di database: penilai `lecturer` **wajib** menyertakan `evaluator_id`, penilai `system` **dilarang** menyertakannya — sehingga keputusan otomatis tidak dapat menyamar sebagai keputusan dosen.

### Yang dikerjakan

- **Logika akses tahap** dipisah ke `src/lib/mastery/access.ts` sebagai fungsi murni tanpa I/O, sehingga aturan pedagogis dapat diuji langsung tanpa database atau browser.
- **Penilaian rubrik dosen** di `/app/lecturer/review/[attemptId]`: skor per kriteria, pratinjau skor terbobot, hasil ketuntasan, dan catatan minimal 10 karakter. Skor tersimpan ke `critical_thinking_scores` per dimensi berpikir kritis.
- **Keputusan jalur belajar** (`branching_decisions`) selalu menyertakan alasan; alasan itu ditampilkan kepada mahasiswa di halaman progres (LOCK-PED-009).
- **Aturan percabangan kelas** di `/app/lecturer/classes/[classId]/branching` dengan prioritas dan kategori kesalahan.
- **Override dosen** menulis `lecturer_overrides` (nilai lama, nilai baru, alasan) lalu menerbitkan `mastery_results` baru — riwayatnya utuh karena kedua tabel append-only.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                                                              |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                                                                          |
| `npm run test`               | ✅ 17 file, **109 test** lulus                                                                     |
| `npm run test:db`            | ✅ **81/81** lulus (18 RLS + 8 akademik + 10 konten + 10 attempt + 11 sumber + 12 AI + 12 mastery) |
| `npm run test:e2e`           | ✅ **67/67** lulus; dijalankan dua kali berturut-turut dan tetap hijau                             |
| `npm run build`              | ✅ 33 route                                                                                        |
| `npm run check:secrets`      | ✅ nol kebocoran (41 bundel klien dipindai)                                                        |
| `npm run check:sql`          | ✅ 7/7 pemeriksaan bersih                                                                          |

### Masalah yang ditemukan dan diperbaiki

1. **Suntingan berkas tidak sampai ke disk.** `e2e/mastery.spec.ts` di editor berbeda isinya dengan berkas di disk, sehingga versi asersi lama yang dijalankan. Akibatnya test melaporkan lulus padahal respons awal tidak pernah terkirim. Sejak itu setiap suntingan diverifikasi ulang dengan membaca berkas dari disk.
2. **Asersi yang lulus karena alasan yang salah.** `expect(getByText(/tidak dapat diubah/i))` juga cocok dengan teks yang muncul **sebelum** pengiriman. Diganti `expect(getByLabel(/Tuliskan jawaban Anda/i)).toHaveCount(0)` yang hanya benar setelah editor terkunci.
3. **E2E di atas `next dev` mengukur waktu kompilasi, bukan aplikasi.** Halaman perancang materi melewati 60 detik pada akses pertama dan satu rangkaian penuh memakan 6,6 menit dengan 11 kegagalan. Setelah `webServer` diganti ke `npm run build && npm run start`, rangkaian yang sama selesai **1,4 menit dengan 67/67 lulus**.
4. **`nativeButton={false}` mengubah semantik tautan.** Upaya membungkam peringatan Base UI justru menambahkan `role="button"` pada `Link`, sehingga tautan navigasi diumumkan sebagai tombol. Perubahan dikembalikan; peringatan itu tercatat sebagai utang teknis, bukan ditutupi.
5. **Balapan `uq_learning_units_sequence`** saat dua spec membuat unit sekali pakai bersamaan. Fixture kini mencoba urutan berikutnya.
6. **Asersi warisan yang usang.** `review.spec.ts` masih menuntut tombol "Nilai" nonaktif dan `student.spec.ts` masih mencari kalimat penguncian versi lama. Keduanya diperbarui mengikuti perilaku PHASE 11.

### Utang teknis yang dicatat

- Base UI memperingatkan setiap `Button` yang dirender sebagai `Link`. Perbaikan yang benar adalah menata `Link` memakai `buttonVariants`, bukan membungkusnya dengan `Button`. Ditunda ke PHASE 15 agar tidak mencampur perubahan lintas fase.
- Belum ada halaman dosen untuk `ai_incidents`; RLS sudah mengizinkan pembacaannya.

### Mock yang masih tersisa

`src/mocks/{analytics,users}.ts` — dihapus pada PHASE 13.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 12 — Revision and Reflection.

## Log PHASE 10 — AI Coach and RAG (2026-08-28)

### Yang dikerjakan

- **Adapter penyedia** `src/server/ai/provider.ts` (`server-only`) memakai `@google/genai`. Satu-satunya titik keluar ke Gemini; dilarang dipanggil dari browser (LOCK-TECH-022 rev. CR-001).
- **Retrieval RAG** lewat migration `20260828100016_ai_retrieval.sql`. `source_chunks` tetap tertutup RLS, sehingga pencarian memakai fungsi `security definer` `match_source_chunks()` yang memeriksa sendiri `can_access_activity()`. Cakupannya dibatasi source pack kasus — AI tidak dapat mengutip di luar sumber yang dilampirkan dosen.
- **Pseudonimisasi (syarat CR-001).** Prompt hanya memuat kasus, rubrik, potongan sumber, dan jawaban anonim. Tanpa nama, NIM, atau surel. `ai_interactions.request_digest` menyimpan SHA-256 prompt, bukan salinannya.
- **Enam fungsi AI** tersedia sesuai izin dosen per aktivitas, dengan structured output yang divalidasi Zod. Keluaran yang tidak sesuai skema dicatat `schema_rejected` dan **tidak pernah ditampilkan**.
- **Kutipan tak terlacak tetap terlihat.** Kutipan yang `chunkId`-nya di luar potongan yang diberikan disimpan `is_traceable = false` dan ditandai jelas di UI, bukan disembunyikan (LOCK-PED-005).
- **Sikap mahasiswa dicatat**: terima, abaikan, laporkan; laporan masuk `ai_incidents`. Verifikasi kutipan dan pernyataan penggunaan AI (`ai_disclosures`) tersedia (LOCK-PED-011).
- Skrip baru: `npm run db:migrate`, `npm run ai:index`, `npm run ai:check`.
- `src/mocks/ai-feedback.ts` **dihapus** beserta `AIFeedbackCard` dan tipe `AIFeedbackItem` yang menjadi kode mati.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                                                                     |
| `npm run test`               | ✅ 16 file, **97 test** lulus                                                                 |
| `npm run test:db`            | ✅ **69/69** lulus (18 RLS + 8 akademik + 10 konten + 10 attempt + 11 sumber + 12 AI)         |
| `npm run test:e2e`           | ✅ **60/60** lulus; `ai-coach.spec.ts` dijalankan dua kali dan tetap hijau                    |
| `npm run ai:check`           | ✅ embedding 1536, retrieval 2 potongan, batas akses 0 potongan tanpa sesi, structured output |
| `npm run build`              | ✅ 29 route                                                                                   |
| `npm run check:secrets`      | ✅ nol kebocoran (5 nilai rahasia dipindai, termasuk `GEMINI_API_KEY`)                        |
| `npm run check:sql`          | ✅ 7/7 pemeriksaan bersih                                                                     |

### Masalah yang ditemukan dan diperbaiki

1. **Kunci Gemini pertama diblokir di tingkat project.** `models.list` tetap 200 OK sementara seluruh endpoint inferensi 403 — sehingga `models.list` **tidak boleh** dipakai sebagai uji kesehatan kunci. Diselesaikan dengan kunci baru.
2. **Embedding 1536 tidak ternormalisasi** (norma L2 ≈ 0,6965). Adapter menormalisasi ulang; diuji di `ai-schema.test.ts`.
3. **Skrip migration sempat membuat `public._applied_migrations` tanpa RLS**, dan uji RLS nomor 18 menangkapnya. Tabel dipindahkan ke schema `ops`.
4. **Encoding `docs/DECISIONS.md` rusak** karena `Get-Content -Raw` di PowerShell 5.1 membaca UTF-8 sebagai ANSI. Berkas dipulihkan dari commit bersih; aturan barunya: berkas disunting lewat perkakas edit, bukan skrip shell.
5. **`npx` menggantung** menunggu konfirmasi pemasangan versi CLI baru; versi kini dipin.

### Mock yang masih tersisa

`src/mocks/{analytics,users}.ts` — dihapus pada PHASE 13.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 11 — Mastery and Branching.

## Log PHASE 9 — Source Verification (2026-08-28)

### Yang dikerjakan

- **Kurasi sumber dosen** di `/app/lecturer/sources`: sumber, metadata, dan versi. Versi dipisahkan agar kutipan tetap dapat ditelusuri saat sumber diperbarui.
- **Source pack kasus** dikelola dari halaman unit perancang materi. Sumber yang dilampirkan menjadi batas bukti — dan nanti menjadi batas cakupan RAG.
- **Klaim kasus** (`origin='case'`) dibuat dosen sebagai bahan penautan bukti.
- **Verifikasi enam kriteria** tersimpan ke `source_verifications`. Constraint `ck_source_verifications_checklist` menuntut keenam kunci ada, sehingga checklist setengah jadi ditolak database, bukan hanya oleh UI.
- **Penautan klaim ke bukti** lewat `claim_source_links` dengan tiga jenis tautan; penaut dapat mencabut tautannya sendiri karena menautkan bukti adalah kerja eksploratif, berbeda dari attempt.
- **Halaman tahap dan dashboard mahasiswa** menampilkan sumber nyata beserta status verifikasinya.
- `src/mocks/sources.ts` dan `src/mocks/claims.ts` **dihapus**; tipe `SourceItem`, `SourceCredibility`, `VerificationCriterion`, dan `ClaimItem` dibuang dari `types/learning.ts`.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `npm run lint` / `typecheck` | ✅ exit 0                                                                      |
| `npm run test`               | ✅ 15 file, **84 test** lulus                                                  |
| `npm run test:db`            | ✅ **57/57** lulus (18 RLS + 8 akademik + 10 konten + 10 attempt + 11 sumber)  |
| `npm run test:e2e`           | ✅ **53/53** lulus; `verification.spec.ts` dijalankan dua kali dan tetap hijau |
| `npm run build`              | ✅ 29 route                                                                    |
| `npm run check:secrets`      | ✅ nol kebocoran                                                               |
| `npm run check:sql`          | ✅ 7/7 pemeriksaan bersih                                                      |

### Masalah yang ditemukan dan diperbaiki

1. **Runner pgTAP tidak memeriksa kecocokan `plan(n)`.** Berkas `source-access.test.sql` berisi 11 skenario tetapi ditulis `plan(10)`, dan runner tetap melaporkan lulus. Runner kini menolak berkas yang jumlah testnya berbeda dari plan-nya — tanpa itu, test yang berhenti di tengah jalan bisa lolos diam-diam.
2. **`source_verifications` ternyata append-only.** Sama seperti `attempts`, tabel ini memakai trigger `prevent_mutation()`. Fixture E2E diperluas agar juga membuat sumber dan klaim sekali pakai.
3. **Test warisan memakai id sumber mock.** `student.spec.ts` masih membuka `/app/student/sources/sumber-berita-daring`; pengujian checklist dipindahkan ke `verification.spec.ts` yang memiliki konteks aktivitas.

### Mock yang masih tersisa

`src/mocks/{ai-feedback,analytics,users}.ts` — dihapus pada PHASE 10 dan 13.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 10 — AI Coach and RAG.

## Log PHASE 8 — Student Learning Workspace (2026-08-28)

### Yang dikerjakan

- **Attempt-first menjadi jaminan database.** `attempt_drafts` (mutable) dipakai untuk autosave, `attempts` (append-only) untuk baseline. Setelah baseline tersimpan, editor hilang permanen dan draf dihapus agar tidak ada dua sumber kebenaran.
- **Repository** `src/server/repositories/attempts.ts`: keadaan kerja per aktivitas, riwayat pengiriman mahasiswa, dan antrean tinjauan dosen.
- **Server Actions** `src/actions/learning/attempts.ts`: `saveDraftAction` dan `submitAttemptAction`. `content_hash` dihitung di server dengan `node:crypto`; nilai dari klien tidak dipercaya.
- **Idempotensi pengiriman.** `client_submission_id` dibuat sekali per sesi editor. Kiriman ulang dengan penanda sama dijawab sebagai berhasil, bukan galat, sehingga klik ganda tidak menghasilkan baseline ganda.
- **`AnswerEditor`** dengan autosave ter-debounce 1,5 detik, indikator status `role="status"`, dan penghitung karakter.
- **Halaman progres mahasiswa** dan **antrean tinjauan dosen** membaca respons nyata. Halaman dosen tidak menyediakan satu pun kendali ubah.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                                        |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                                                    |
| `npm run test`               | ✅ 14 file, **73 test** lulus                                                |
| `npm run test:db`            | ✅ **46/46** lulus (18 RLS + 8 akademik + 10 konten + 10 integritas attempt) |
| `npm run test:e2e`           | ✅ **45/45** lulus; `attempt.spec.ts` dijalankan dua kali dan tetap hijau    |
| `npm run build`              | ✅ 28 route                                                                  |
| `npm run check:secrets`      | ✅ nol kebocoran                                                             |
| `npm run check:sql`          | ✅ 7/7 pemeriksaan bersih                                                    |

### Masalah yang ditemukan dan diperbaiki

1. **Proyek Supabase sempat tidak dapat dijangkau.** Host proyek gagal diresolusi lewat DNS lokal maupun 8.8.8.8 dan 1.1.1.1, sementara host Supabase lain normal — proyek dijeda. Verifikasi ditahan dan PHASE 8 **tidak** dinyatakan selesai sampai `test:db` dan `test:e2e` benar-benar dijalankan.
2. **Uji E2E saling merusak keadaan.** Setelah pengiriman menjadi nyata, `student.spec.ts` warisan PHASE 7 ikut membuat baseline sungguhan sehingga `attempt.spec.ts` kehilangan editornya. Karena baseline append-only dan tidak dapat dihapus siapa pun, pengujian attempt kini memakai **unit sekali pakai** yang dibuat fixture `e2e/fixtures/learning-content.ts`. Asersi penguncian AI dipindahkan sepenuhnya ke `attempt.spec.ts`.
3. **Asersi teks ganda.** `getByText(/Draf tersimpan/i)` cocok ke indikator status sekaligus kalimat penjelasan di bawah editor; asersi dipersempit ke `role="status"`.
4. **Timeout kompilasi awal.** Eksekusi E2E pertama setelah server dev dingin menghasilkan dua kegagalan `waitForURL`; keduanya hijau setelah server terkompilasi. Bukan cacat aplikasi.

### Mock yang masih tersisa

`src/mocks/{sources,claims,ai-feedback,analytics,users}.ts` — dihapus pada PHASE 9, 10, dan 13.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 9 — Source Verification.

## Log PHASE 7 — Course Builder (2026-08-12)

### Yang dikerjakan

- **Konstanta tahap**: `src/lib/constants/stages.ts` memetakan enum `stage_key` berbahasa Inggris (DB-02) ke label Indonesia, sekaligus menyediakan `resolveStageAccess()`. `LearningStageKey` pada `src/types/learning.ts` disamakan dengan enum database sehingga URL tahap dapat dipetakan langsung tanpa penerjemahan.
- **Validasi konten**: `src/lib/validation/content.ts` — skema Zod untuk modul, unit, kasus, aktivitas, instruksi, tahap, rubrik, kriteria, dan level. Skema tahap **sengaja tidak memuat** `stageKey` maupun `sequence` agar urutan LOCK-PED-002 tidak dapat diubah lewat formulir.
- **Repository**: `src/server/repositories/content.ts` dan `rubrics.ts` (`server-only`), termasuk pandangan khusus mahasiswa yang hanya memuat aktivitas terbit dan instruksi beraudiens mahasiswa.
- **Server Actions**: `src/actions/courses/{content,rubrics}.ts`, seluruhnya berpagar `requireLecturerOfClass()` atau `requireRoleOrThrow("lecturer")`.
- **Publikasi berjenjang**: unit ditolak terbit bila belum memiliki kasus atau belum memiliki satu pun aktivitas, dengan pesan Indonesia yang menjelaskan langkah perbaikan.
- **UI dosen**: `/app/lecturer/classes/[classId]/builder` (modul dan unit) serta `/builder/units/[unitId]` (kasus, enam tahap, aktivitas, instruksi), dan `/app/lecturer/rubrics` (rubrik, kriteria per dimensi, level).
- **Ruang belajar mahasiswa memakai data nyata**: dashboard, detail kelas, `/app/student/learn/[unitId]`, dan `/stage/[stageKey]` membaca modul, unit, kasus, tahap, serta aktivitas dari database.
- **Mock dihapus**: `src/mocks/units.ts` dan `src/mocks/cases.ts` dihapus; `MOCK_CLAIMS` dipindah ke `src/mocks/claims.ts` untuk dipakai PHASE 9.
- Seed pengembangan diperluas dengan modul, unit, kasus, aktivitas, dan instruksi agar pengujian E2E deterministik.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                                  |
| `npm run test`               | ✅ 13 file, **67 test** lulus                              |
| `npm run test:db`            | ✅ **36/36** lulus (18 RLS + 8 akademik + 10 akses konten) |
| `npm run test:e2e`           | ✅ **38/38** lulus                                         |
| `npm run build`              | ✅ 28 route                                                |
| `npm run check:secrets`      | ✅ nol kebocoran                                           |
| `npm run check:sql`          | ✅ 7/7 pemeriksaan bersih                                  |

### Masalah yang ditemukan dan diperbaiki

1. **Zod v4 menolak UUID yang bukan versi 1–8.** UUID contoh pada pengujian sempat membuat kasus uji gagal padahal skemanya benar; diganti dengan UUID v4 yang sah.
2. **SQLSTATE `protect_stage_order()` adalah `23001`, bukan `P0001`.** Ekspektasi pgTAP dikoreksi setelah membaca keluaran uji, bukan sebaliknya.
3. **`Set-Content -Encoding UTF8` pada PowerShell 5.1 menyisipkan BOM** sehingga PostgreSQL menolak berkas SQL. Penulisan ulang memakai `UTF8Encoding($false)`.
4. **Playwright menganggap `<option>` tidak terlihat**, sehingga `getByText(...).first()` memilih opsi select dan gagal. Asersi dipersempit ke daftar rubrik.
5. **`page.url()` tepat setelah `click()` masih mengembalikan URL lama**; navigasi ditunggu lebih dulu dengan `expect(page).toHaveURL()`.
6. **Spesifikasi E2E baru tidak berjalan** karena `testMatch` project Playwright bersifat eksplisit; `builder.spec.ts` didaftarkan ke project `lecturer`.

### Mock yang masih tersisa

`src/mocks/{sources,claims,ai-feedback,analytics,users}.ts` — dihapus pada PHASE 9, 10, dan 13. Halaman yang masih memakainya tetap menampilkan `MockBanner`.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 8 — Student Learning Workspace.

## Log PHASE 6 — Academic Structure (2026-08-12)

### Yang dikerjakan

- **Lapisan data**: `src/server/repositories/` (organizations, academic-periods, courses, classes, profiles) bertanda `server-only`, dengan helper `unwrap()` agar galat mentah database tidak pernah bocor ke pengguna.
- **Service akun**: `createAccount()`, `grantRole()`, `revokeRole()` — seluruhnya lewat `withAuditedAdmin()` sehingga tercatat di `audit_logs`. Pembuatan profil yang gagal membatalkan akun auth agar tidak meninggalkan akun yatim.
- **Server Actions**: fakultas, program studi, periode akademik, mata kuliah, kelas, status publikasi, penugasan dosen, enrollment — semua divalidasi Zod dan diperiksa `requireAdminAccess()`.
- **Area admin**: dashboard, pengguna, organisasi, periode akademik, mata kuliah, kelas, dan detail kelas; ber-guard `requireAdminAccess()` dengan `loading.tsx`/`error.tsx`.
- **Penggantian mock**: `/app/student/classes` dan `/app/lecturer/classes` beserta detailnya kini membaca database. `src/mocks/classes.ts` **dihapus**; `ClassCard` menggantikan `CourseCard` berbasis mock.
- **Guard akses kelas**: detail kelas mahasiswa memanggil `requireClassAccess()`, detail kelas dosen memanggil `requireLecturerOfClass()`.
- Skrip `npm run db:seed:academics` menyiapkan mata kuliah, kelas terbit, penugasan dosen, dan enrollment untuk akun dev.

### Hasil verifikasi (dijalankan nyata)

| Perintah                     | Hasil                                                |
| ---------------------------- | ---------------------------------------------------- |
| `npm run lint` / `typecheck` | ✅ exit 0                                            |
| `npm run test`               | ✅ 12 file, **58 test** lulus                        |
| `npm run test:db`            | ✅ **26/26** lulus (18 RLS + 8 akses akademik)       |
| `npm run test:e2e`           | ✅ **30/30** lulus (guest, student, lecturer, admin) |
| `npm run build`              | ✅ 25 route                                          |
| `npm run check:secrets`      | ✅ nol kebocoran                                     |

### Masalah yang ditemukan dan diperbaiki

1. **Relasi ambigu PostgREST.** `class_lecturers` dan `enrollments` masing-masing punya dua foreign key ke `profiles`, dan `role_assignments` punya tiga. Query harus menunjuk kolom eksplisit (`profiles!lecturer_id`, `role_assignments!profile_id`).
2. **`process.loadEnvFile()` di `playwright.config.ts` tidak terbaca worker**, sehingga seluruh project ber-sesi hilang diam-diam. Env kini dimuat proses induk lewat skrip `test:e2e`.
3. **Rate limit auth disamarkan sebagai "kata sandi salah".** Kini status 429 dijawab pesan sendiri — rate limit bukan informasi sensitif, dan menyamarkannya menyesatkan pengguna.
4. **Kredensial dev pernah tidak sinkron** antara `.env.local` dan database. Skrip seed kini **memverifikasi** setiap kredensial dapat dipakai masuk sebelum menyatakan berhasil.
5. `Remove-Item` pada path dengan kurung siku memerlukan `-LiteralPath` di PowerShell.

### Mock yang masih tersisa

`src/mocks/{sources,ai-feedback,analytics}.ts` masih dipakai untuk konten pembelajaran dan analitik — dihapus pada PHASE 9 s.d. 13. Halaman yang masih memakainya tetap menampilkan `MockBanner`.

### Checkpoint

✅ **DISETUJUI.** PHASE 7 — Course Builder dilanjutkan.

## Log PHASE 5 — Supabase SSR Authentication (2026-08-12)

### Yang dikerjakan

- Tiga klien Supabase: `client.ts` (browser), `server.ts` (cookie SSR), `admin.ts` (service role, `server-only`, seluruh pemakaian dibungkus `withAuditedAdmin()` yang menulis `audit_logs`).
- `src/proxy.ts`: menyegarkan cookie sesi + redirect optimistik. Sesuai panduan Next.js 16, proxy **tidak** dipakai sebagai lapisan otorisasi.
- Data Access Layer `lib/supabase/auth.ts`: `getCurrentUser` (memakai `getUser()`, bukan `getSession()`), `requireUser`, `requireRole`/`requireRoleOrThrow`, `requireClassAccess`, `requireLecturerOfClass`, `requireAdminAccess`. Dibungkus `cache()` agar satu render satu pemeriksaan.
- Logika peran murni dipisah ke `lib/permissions/roles.ts` agar dapat diuji tanpa melanggar `server-only`.
- Server Actions: `sign-in`, `sign-out`, `request-password-reset`, `update-password` — seluruhnya divalidasi Zod di server.
- Route Handler `/auth/callback` untuk menukar kode tautan surel menjadi sesi.
- Halaman fungsional: `/login`, `/forgot-password`, `/reset-password`, `/app/forbidden`.
- Domain error (`lib/errors`) dengan `publicMessage` terpisah dari detail internal.
- Skrip `npm run db:seed:users` (akun pengembangan) dan `npm run check:secrets` (pemindaian bundel klien).

### Utang teknis PHASE 3 yang dilunasi

- Route `/app` **tidak lagi** meminta pengguna memilih peran; peran diambil dari sesi server lalu dialihkan (SEC-004).
- Identitas pada Topbar dan dashboard mahasiswa beralih dari `MOCK_STUDENT`/`MOCK_LECTURER` ke profil nyata.

### Hasil verifikasi (dijalankan nyata)

| Perintah                | Hasil                                           |
| ----------------------- | ----------------------------------------------- |
| `npm run lint`          | ✅ exit 0                                       |
| `npm run typecheck`     | ✅ exit 0                                       |
| `npm run test`          | ✅ 11 file, **50 test** lulus                   |
| `npm run test:e2e`      | ✅ **24 test** lulus (guest, student, lecturer) |
| `npm run test:db`       | ✅ 18/18 lulus                                  |
| `npm run build`         | ✅ 20 route; Proxy terdaftar                    |
| `npm run check:secrets` | ✅ 30 berkas bundel dipindai, **nol kebocoran** |

### Masalah yang ditemukan dan diperbaiki

1. **`server-only` memblokir unit test** — justru bukti proteksi bekerja. Logika peran murni dipindah ke `lib/permissions/roles.ts`.
2. **Rate limit Supabase Auth** saat 8 worker login bersamaan. Diganti pola `storageState`: login sekali di project `setup`, sesinya dipakai ulang.
3. **Test logout mencabut sesi test lain.** `signOut()` Supabase default ber-scope global sehingga mencabut refresh token di semua perangkat. Diubah menjadi `scope: "local"` — sekaligus keputusan produk: keluar di satu perangkat tidak mengeluarkan perangkat lain. Test logout juga diisolasi dengan sesinya sendiri.
4. **Selector `getByRole("alert")` ambigu** karena Next.js menambahkan route announcer ber-role `alert`.

### Catatan

- Alur surel reset password belum diuji ujung ke ujung karena bergantung pada konfigurasi SMTP Supabase; yang diuji adalah bahwa halaman tidak membocorkan surel terdaftar.
- Akun pengembangan memakai kata sandi acak yang ditulis langsung ke `.env.local` oleh skrip, tidak dicetak di terminal.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 6 — Academic Structure.

## Log PHASE 4B — Implementasi Database (2026-08-11 s.d. 2026-08-12)

> ✅ **SELESAI.** Seluruh migration diterapkan ke Supabase Cloud dan 18 skenario test RLS lulus — dijalankan nyata, bukan diklaim.

### Persetujuan yang tercatat

ERD disetujui 2026-08-11; DB-01 s.d. DB-07 diterima sesuai usulan dan berstatus LOCKED di [DECISIONS.md](DECISIONS.md).

### Yang diterapkan

| Berkas                                               | Isi                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `supabase/migrations/…0001_extensions_and_types.sql` | 3 ekstensi + 23 enum                                                                       |
| `…0002` s.d. `…0012`                                 | 60 tabel dalam 10 domain + schema `research` (3 view export berpseudonim)                  |
| `…0013_functions_and_triggers.sql`                   | 19 fungsi, 15 trigger append-only, trigger seed 6 tahap, penegak baseline/AI/penilai dosen |
| `…0014_rls_policies.sql`                             | RLS aktif seluruh tabel + policy per peran                                                 |
| `…0015_indexes.sql`                                  | 45 index, termasuk HNSW pgvector                                                           |
| `supabase/seed/0001_development_seed.sql`            | Struktur akademik minimal                                                                  |
| `supabase/tests/rls.test.sql`                        | 18 skenario pgTAP                                                                          |
| `src/lib/supabase/types.ts`                          | Generated types — 3.583 baris, 63 definisi Row                                             |

### Hasil verifikasi (dijalankan nyata)

| Perintah                                        | Hasil                                                                                                                       |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `npx supabase db push`                          | ✅ 15/15 migration diterapkan, **nol error SQL**                                                                            |
| `npm run test:db`                               | ✅ **18 lulus, 0 gagal**                                                                                                    |
| `npm run db:seed`                               | ✅ organizations 1, faculties 1, study_programs 1, academic_periods 1, roles 3, error_categories 10, data_retention_rules 2 |
| `npx supabase gen types`                        | ✅ 63 Row (60 tabel + 3 view)                                                                                               |
| `npm run lint` / `typecheck` / `test` / `build` | ✅ exit 0; 35 test lulus; 17 route                                                                                          |
| `npm run check:sql`                             | ✅ 7/7 pemeriksaan konsistensi                                                                                              |

### Masalah yang ditemukan dan diperbaiki selama fase

1. **Dua kebocoran policy** (ditemukan saat telaah sendiri sebelum push): `learning_units_lecturer_write` memiliki `with check (... or true)` sehingga pemeriksaan tulis selalu lolos; `lecturer_overrides_select` memberi seluruh mahasiswa akses ke seluruh override. Keduanya diperbaiki.
2. **`types.ts` tersimpan UTF-16LE** karena perilaku redirect `>` pada PowerShell 5.1 — dikonversi ke UTF-8 (221 KB → 107 KB).
3. **`supabase test db --linked` ternyata tetap memerlukan Docker.** Dibuat runner sendiri (`npm run test:db`) memakai driver `pg`, sehingga test dapat diulang dan siap dipakai CI.
4. **`pooler-url` hasil `link` tidak memuat kredensial** — penyusun connection string diperbaiki agar mengambil username dari `project-ref`.
5. **9 dari 10 kegagalan test pertama adalah kesalahan penulisan test**, bukan celah keamanan: `throws_ok(sql, deskripsi)` membuat pgTAP menafsirkan argumen kedua sebagai pesan error yang diharapkan. Diperbaiki menjadi `throws_ok(sql, SQLSTATE, null, deskripsi)` sehingga kini menguji kode error spesifik.
6. **Temuan nyata dari test:** mahasiswa yang menjalankan `UPDATE` pada baseline tidak menerima error karena RLS membuatnya mengenai nol baris. Data tetap aman, tetapi test diubah agar memverifikasi isi baseline benar-benar tidak berubah.

### Catatan keamanan

Password database sempat ditulis literal di terminal sehingga terekspos pada riwayat dan konteks. Pengguna telah diberi tahu untuk melakukan reset password. Kredensial tidak pernah dikirim melalui percakapan; berkas `.env*` tetap tidak terlacak git (diverifikasi).

### Dependency baru

`pg` dan `@types/pg` (devDependency) — diperlukan untuk menjalankan test pgTAP tanpa Docker.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 5 — Supabase SSR Authentication.

## Log PHASE 4A — Database Design (2026-08-11)

### Keputusan lingkungan (dipilih pengguna)

- **Supabase Cloud** (Docker tidak terpasang, dan tidak diperlukan).
- **Seluruh domain sekaligus** — 60 tabel, bukan bertahap.
- **ERD ditinjau lebih dahulu** sebelum satu baris SQL ditulis.

### Yang dikerjakan (dokumen saja — tanpa SQL, tanpa dependency)

- [DATABASE.md](DATABASE.md) — prinsip, konvensi, 23 enum, ERD Mermaid per 10 domain, aturan integritas, fungsi/trigger RLS, rencana index, rencana migration 15 file + rollback, pemetaan requirement→mekanisme, 7 keputusan terbuka.
- [DATABASE_DICTIONARY.md](DATABASE_DICTIONARY.md) — kamus data 60 tabel + schema `research`: kolom, tipe, constraint, index, alasan keberadaan.
- [RLS_MATRIX.md](RLS_MATRIX.md) — hak SELECT/INSERT/UPDATE/DELETE per peran untuk seluruh tabel + 18 skenario uji yang akan dijalankan pada 4B.

### Keputusan desain utama

1. **`attempt_drafts` dipisah dari `attempts`** — autosave butuh tulis berulang, sementara baseline tidak boleh ditimpa. Pemisahan ini menyelesaikan konflik tanpa melanggar LOCK-PED-004.
2. **Trigger `prevent_mutation()`, bukan hanya RLS** — `service_role` Supabase mem-bypass RLS, sehingga baseline hanya benar-benar aman bila dilindungi trigger.
3. **`ai_interactions.attempt_id NOT NULL`** — attempt-first menjadi kendala database, bukan sekadar aturan aplikasi.
4. **`explanation`/`reason` NOT NULL pada branching** — keputusan adaptif tanpa alasan tidak dapat disimpan.
5. **Admin ⛔ pada nilai dan jawaban** di matriks RLS (SEC-005).
6. **Schema `research` + pseudonim**, view memfilter consent aktif.

### Verifikasi

Tidak ada perintah yang dapat dijalankan pada 4A (tanpa kode). Validasi dilakukan dengan menelusuri seluruh butir requirement §13 dan LOCK-PED ke mekanisme database — hasilnya ada di tabel pemetaan [DATABASE.md](DATABASE.md) bagian 10.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan ERD dan jawaban atas DB-01…DB-07 sebelum PHASE 4B (menulis migration).

## Log PHASE 3 — Visual Prototype (2026-08-11)

### Yang dikerjakan

- Tipe domain + mock data berlabel (`src/types/learning.ts`, `src/mocks/*`).
- 10 card variant, `MockBanner`, komponen learning workspace (PhaseRail/PhaseStepper, CaseReader, AttemptGate, MasteryStatus), AI coach (AIBoundaryNotice, AIFeedbackPanel), verifikasi (SourceViewer, VerificationChecklist, ClaimEvidenceLinker).
- Route: `/login`, `/forgot-password`, `/app`, 6 halaman mahasiswa, 4 halaman dosen, plus `loading.tsx`/`error.tsx` per area.
- Attempt-first terlihat secara visual: panel AI terkunci sampai respons awal disimpan; baseline ditampilkan read-only; revisi sebagai bagian terpisah.

### Hasil verifikasi (dijalankan nyata, bukan klaim)

| Perintah            | Hasil                                                          |
| ------------------- | -------------------------------------------------------------- |
| `npm run lint`      | ✅ exit 0                                                      |
| `npm run typecheck` | ✅ exit 0                                                      |
| `npm run test`      | ✅ 9 file, 35 test lulus                                       |
| `npm run build`     | ✅ 17 route (12 static, 5 dynamic)                             |
| `npm run test:e2e`  | ✅ 11 test lulus (3 gagal pada percobaan pertama → diperbaiki) |

### Utang teknis yang harus dibereskan pada fase berikutnya

1. **Hapus `src/mocks/` dan seluruh `MockBanner`** ketika data nyata tersedia (PHASE 6+).
2. **Hapus route `/app`** (pemilih peran prototipe) pada PHASE 5 — peran wajib berasal dari sesi server.
3. Pasang proteksi nyata pada route group `(protected)` (PHASE 5).
4. Ganti aksi yang dinonaktifkan (`Simpan verifikasi`, `Simpan revisi`, `Tinjau`, aksi AI) dengan Server Action pada fase terkait.
5. Gate atau hapus `/design-system` sebelum produksi (PHASE 15).

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 4 — Database Architecture (ERD wajib disetujui sebelum migration).

## Log PHASE 2 — Design System and Application Shell (2026-08-05)

### Yang dikerjakan

- Design tokens Civic Intelligence lengkap di `globals.css`: palet shell gelap + reading canvas hangat (scope `.reading-surface`), token semantik (aqua/violet/amber/mint/coral/blue), skala tipografi LOCKED (display→caption), dimensi layout (sidebar 272/80, topbar 72, context panel 360, max 1600, reading 760), radius dasar 12px, utility `reading-prose`.
- Tema tunggal gelap: block `.dark` dihapus, class `dark` dipasang di `<html>` (NOTE-006).
- Button dikustomisasi penuh: primary aqua 44px/12px/600, ai violet tinted, outline, ghost, danger coral, link; `data-variant` untuk testing.
- Komponen shadcn ditambahkan + terkena token kustom: card, badge, skeleton, sheet, separator, tooltip (tanpa paket npm baru).
- `StatusBadge` 9 varian semantik; 6 komponen state (Loading/Skeleton/Empty/Error/Forbidden/Locked) berbasis `StateShell` server-compatible.
- AppShell responsif: `Sidebar`+`SidebarNav` (272↔80px, tooltip saat rail, indikator aktif aqua), `Topbar` 72px, `MobileNavigation` bottom nav ≥44px, drawer Sheet mobile, skip link, `PageContainer`, `PageHeader`, `BentoGrid` asimetris; navigasi berbasis icon key yang serializable (`src/lib/navigation.ts`).
- Halaman galeri `/design-system` berlabel "Preview internal" (bukan fitur produk).

### Hasil verifikasi (dijalankan nyata, bukan klaim)

| Perintah            | Hasil                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `npm run lint`      | ✅ exit 0                                                                                |
| `npm run typecheck` | ✅ exit 0 (1 error exactOptionalPropertyTypes ditemukan lalu diperbaiki)                 |
| `npm run test`      | ✅ 6 file, 23 test lulus                                                                 |
| `npm run build`     | ✅ sukses; route `/`, `/_not-found`, `/design-system` static                             |
| `npm run test:e2e`  | ✅ 5 test lulus — termasuk ukur sidebar 272↔80px & touch target ≥44px (viewport 390×844) |

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 3 — Visual Prototype.

## Log PHASE 1 — Next.js Foundation (2026-08-05)

### Yang dikerjakan

- Next.js 16.3.0 App Router + TypeScript + Tailwind v4 + ESLint 9, `src/` + alias `@/*` (scaffold via subfolder sementara `pt-ai-lms`, dipindah ke root).
- TS strict penuh: `noImplicitAny`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — aktif tanpa merusak dependency.
- Font tema via `next/font/google` di `src/lib/fonts.ts` + wiring token `font-heading`/`font-sans`/`font-mono` di `globals.css`.
- shadcn/ui init (base-nova, neutral, CSS variables, Lucide).
- Halaman placeholder `/` Bahasa Indonesia (Server Component); `error.tsx`, `not-found.tsx`, `loading.tsx` Bahasa Indonesia.
- Vitest 4 + RTL (5 test) dan Playwright (2 smoke test) + `.env.example` + script npm baru.
- Dokumen baru: CHANGELOG, TESTING, ROUTES, SECURITY.

### Hasil verifikasi (dijalankan nyata, bukan klaim)

| Perintah                                           | Hasil                                              |
| -------------------------------------------------- | -------------------------------------------------- |
| `npm run lint`                                     | ✅ exit 0                                          |
| `npm run typecheck`                                | ✅ exit 0                                          |
| `npm run test`                                     | ✅ 2 file, 5 test lulus                            |
| `npm run build`                                    | ✅ sukses; route `/` dan `/_not-found` static      |
| `npx playwright install chromium`                  | ✅ exit 0                                          |
| `npm run test:e2e`                                 | ✅ 2 test lulus (26.9s)                            |
| `npm run dev` + `Invoke-WebRequest localhost:3000` | ✅ Ready 643ms; HTTP 200; judul aplikasi ditemukan |

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 2 — Design System and Application Shell.

## Log PHASE 0 — Repository Audit and Planning (2026-08-05)

### Hasil audit

- Folder `d:\PT-AI` kosong total (0 item termasuk file tersembunyi) — diverifikasi via `Get-ChildItem -Force -Recurse`.
- Belum ada git repository (`git status` → "not a git repository").
- Tidak ada `package.json`, tidak ada file environment, tidak ada kode Vite/React lama.
- Tidak ada konflik dengan Next.js App Router.
- **Kesimpulan: greenfield project. Tidak diperlukan migration plan dari Vite.**

### Environment terverifikasi

- Node.js: v24.14.0
- npm: 11.9.0
- git: 2.45.1.windows.1
- OS: Windows

### Artefak yang dibuat

- `docs/DECISIONS.md` — Decision Log dengan seluruh keputusan LOCKED/OPEN/DEFERRED/REJECTED.
- `docs/MASTER_PLAN.md` — Rencana induk 16 fase.
- `docs/PROGRESS.md` — Dokumen ini.
- `docs/ARCHITECTURE.md` — Arsitektur target dan proposed folder tree.
- `docs/ENVIRONMENT.md` — Versi environment dan variabel environment terencana.

### Tindakan yang TIDAK dilakukan (sesuai protokol)

- Tidak menghapus file apapun (tidak ada file untuk dihapus).
- Tidak menginstal dependency.
- Tidak menginisialisasi Next.js.
- Tidak membuat migration database.

### Checkpoint

⛔ **BERHENTI.** Menunggu persetujuan pengguna untuk masuk PHASE 1 — Next.js Foundation.
