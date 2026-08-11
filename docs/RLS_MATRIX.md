<!-- @format -->

# RLS MATRIX — PT-AI LMS

Status: **USULAN PHASE 4A.** Pendamping [DATABASE.md](DATABASE.md) dan [DATABASE_DICTIONARY.md](DATABASE_DICTIONARY.md).

---

## 1. Cara Membaca

| Simbol | Arti                                                                              |
| ------ | --------------------------------------------------------------------------------- |
| ✅     | Diizinkan tanpa syarat tambahan (dalam organisasinya)                             |
| 🔒     | Diizinkan **hanya untuk baris miliknya sendiri**                                  |
| 🎓     | Diizinkan **hanya untuk kelas yang diampu** (`is_lecturer_of_class`)              |
| 📚     | Diizinkan **hanya untuk kelas yang diikuti** dan konten `published`               |
| ⛔     | Ditolak                                                                           |
| ⚙️     | Hanya melalui Server Action/Route Handler dengan `service_role`, bukan dari klien |

Kolom peran: **S** = student · **L** = lecturer · **A** = admin.

Catatan penting: `service_role` Supabase memiliki `BYPASSRLS`. Karena itu tabel append-only **tidak** hanya mengandalkan policy, melainkan juga trigger `prevent_mutation()` yang berlaku untuk semua koneksi.

---

## 2. Prinsip yang Ditegakkan Matriks Ini

1. **Mahasiswa tidak pernah melihat data mahasiswa lain** — tidak ada satu pun ✅ pada kolom S untuk tabel artefak.
2. **Admin tidak menyentuh substansi akademik** — pada `attempts`, `revisions`, `reflections`, `mastery_results`, `assessment_scores`, kolom A adalah ⛔ untuk semua operasi tulis, dan ⛔ untuk baca isi (SEC-005).
3. **Dosen dibatasi kelas yang ditugaskan** — tidak ada akses lintas kelas.
4. **Baseline attempt tidak dapat diubah siapa pun** — kolom UPDATE/DELETE seluruhnya ⛔.
5. **Keputusan adaptif transparan bagi mahasiswa** — `branching_decisions` dapat dibaca 🔒 oleh mahasiswa terkait.

---

## 3. Domain 1 — Identity

| Tabel              | SELECT (S/L/A)  | INSERT (S/L/A) | UPDATE (S/L/A) | DELETE (S/L/A) |
| ------------------ | --------------- | -------------- | -------------- | -------------- |
| `organizations`    | ✅/✅/✅        | ⛔/⛔/✅       | ⛔/⛔/✅       | ⛔/⛔/⛔       |
| `faculties`        | ✅/✅/✅        | ⛔/⛔/✅       | ⛔/⛔/✅       | ⛔/⛔/✅       |
| `study_programs`   | ✅/✅/✅        | ⛔/⛔/✅       | ⛔/⛔/✅       | ⛔/⛔/✅       |
| `profiles`         | 🔒 + 👥¹/🎓²/✅ | ⛔/⛔/⚙️³      | 🔒⁴/⛔/✅      | ⛔/⛔/⛔       |
| `roles`            | ✅/✅/✅        | ⛔/⛔/⛔       | ⛔/⛔/⛔       | ⛔/⛔/⛔       |
| `role_assignments` | 🔒/🔒/✅        | ⛔/⛔/✅       | ⛔/⛔/✅⁵      | ⛔/⛔/⛔       |

¹ Mahasiswa hanya melihat `full_name` dosen pengampu kelasnya melalui view terbatas, bukan tabel penuh.
² Dosen melihat profil mahasiswa yang terdaftar di kelasnya saja.
³ Pembuatan akun melalui admin client server-only (LOCK-TECH-021), tercatat di `audit_logs`.
⁴ Mahasiswa hanya boleh mengubah `avatar_path`; `identifier`, `organization_id`, dan `is_active` dikunci policy berkolom.
⁵ Pencabutan peran = mengisi `revoked_at`, bukan menghapus baris.

---

## 4. Domain 2 — Academic

| Tabel              | SELECT   | INSERT   | UPDATE    | DELETE          |
| ------------------ | -------- | -------- | --------- | --------------- |
| `academic_periods` | ✅/✅/✅ | ⛔/⛔/✅ | ⛔/⛔/✅  | ⛔/⛔/⛔        |
| `courses`          | ✅/✅/✅ | ⛔/⛔/✅ | ⛔/⛔/✅  | ⛔/⛔/✅ (soft) |
| `classes`          | 📚/🎓/✅ | ⛔/⛔/✅ | ⛔/🎓⁶/✅ | ⛔/⛔/✅ (soft) |
| `class_lecturers`  | 📚/🎓/✅ | ⛔/⛔/✅ | ⛔/⛔/✅  | ⛔/⛔/✅        |
| `enrollments`      | 🔒/🎓/✅ | ⛔/⛔/✅ | ⛔/🎓⁷/✅ | ⛔/⛔/⛔        |

⁶ Dosen boleh mengubah `status` (draft ↔ published) dan `name`, bukan memindahkan kelas ke periode lain.
⁷ Dosen boleh mengubah `status` enrollment (mis. `dropped`), tidak boleh menambah/menghapus baris.

---

## 5. Domain 3 — Content

| Tabel                   | SELECT     | INSERT     | UPDATE     | DELETE          |
| ----------------------- | ---------- | ---------- | ---------- | --------------- |
| `modules`               | 📚⁸/🎓/⛔⁹ | ⛔/🎓/⛔   | ⛔/🎓/⛔   | ⛔/🎓 (soft)/⛔ |
| `learning_units`        | 📚⁸/🎓/⛔  | ⛔/🎓/⛔   | ⛔/🎓/⛔   | ⛔/🎓 (soft)/⛔ |
| `cases`                 | 📚⁸/🎓/⛔  | ⛔/🎓/⛔   | ⛔/🎓/⛔   | ⛔/🎓 (soft)/⛔ |
| `learning_stages`       | 📚/🎓/⛔   | ⛔/⚙️¹⁰/⛔ | ⛔/🎓¹¹/⛔ | ⛔/⛔/⛔        |
| `activities`            | 📚⁸/🎓/⛔  | ⛔/🎓/⛔   | ⛔/🎓/⛔   | ⛔/🎓 (soft)/⛔ |
| `activity_instructions` | 📚¹²/🎓/⛔ | ⛔/🎓/⛔   | ⛔/🎓/⛔   | ⛔/🎓/⛔        |
| `learning_resources`    | 📚⁸/🎓/⛔  | ⛔/🎓/⛔   | ⛔/🎓/⛔   | ⛔/🎓 (soft)/⛔ |

⁸ Hanya bila `status = 'published'` **dan** (`opens_at` null atau sudah lewat). Konten draft dosen tidak bocor ke mahasiswa.
⁹ Admin tidak membaca isi materi akademik; kewenangannya adalah struktur (organisasi, akun, kelas), bukan substansi.
¹⁰ Enam tahap dibuat trigger, bukan `INSERT` manual.
¹¹ Dosen hanya boleh mengubah `title`, `focus`, `is_enabled` — **bukan** `stage_key` maupun `sequence` (LOCK-PED-002).
¹² Mahasiswa hanya melihat baris `audience = 'student'`.

---

## 6. Domain 4 — Sources

| Tabel                  | SELECT          | INSERT   | UPDATE     | DELETE          |
| ---------------------- | --------------- | -------- | ---------- | --------------- |
| `sources`              | 📚¹³/🎓+✅¹⁴/⛔ | ⛔/✅/⛔ | ⛔/🔒¹⁵/⛔ | ⛔/🔒 (soft)/⛔ |
| `source_versions`      | 📚¹³/✅/⛔      | ⛔/✅/⛔ | ⛔/🔒/⛔   | ⛔/⛔/⛔        |
| `source_files`         | 📚¹³/✅/⛔      | ⛔/✅/⛔ | ⛔/⛔/⛔   | ⛔/🔒/⛔        |
| `source_chunks`        | ⛔¹⁶/⛔/⛔      | ⚙️/⚙️/⛔ | ⚙️/⛔/⛔   | ⚙️/⛔/⛔        |
| `case_sources`         | 📚/🎓/⛔        | ⛔/🎓/⛔ | ⛔/🎓/⛔   | ⛔/🎓/⛔        |
| `claims`               | 📚 + 🔒¹⁷/🎓/⛔ | 🔒/🎓/⛔ | 🔒¹⁸/🎓/⛔ | ⛔/🎓/⛔        |
| `claim_source_links`   | 🔒 + 📚/🎓/⛔   | 🔒/🎓/⛔ | 🔒/🎓/⛔   | 🔒/🎓/⛔        |
| `source_verifications` | 🔒/🎓/⛔        | 🔒/⛔/⛔ | ⛔/⛔/⛔   | ⛔/⛔/⛔        |

¹³ Sumber hanya terbaca mahasiswa bila terlampir pada kasus di kelasnya (`case_sources`).
¹⁴ Dosen membaca seluruh pustaka sumber organisasinya untuk kurasi.
¹⁵ Hanya sumber yang ia buat (`created_by`).
¹⁶ Embedding tidak pernah dikirim ke browser; retrieval dilakukan server-side.
¹⁷ Klaim dari kasus terbaca semua peserta kelas; klaim buatan mahasiswa hanya terbaca pemiliknya dan dosen.
¹⁸ Hanya sebelum attempt terkait tersimpan; sesudahnya menjadi bagian jejak.

---

## 7. Domain 5 — Rubrics

| Tabel             | SELECT     | INSERT   | UPDATE   | DELETE          |
| ----------------- | ---------- | -------- | -------- | --------------- |
| `rubrics`         | 📚¹⁹/✅/⛔ | ⛔/✅/⛔ | ⛔/🔒/⛔ | ⛔/🔒 (soft)/⛔ |
| `rubric_criteria` | 📚¹⁹/✅/⛔ | ⛔/🔒/⛔ | ⛔/🔒/⛔ | ⛔/🔒/⛔        |
| `rubric_levels`   | 📚¹⁹/✅/⛔ | ⛔/🔒/⛔ | ⛔/🔒/⛔ | ⛔/🔒/⛔        |

¹⁹ Mahasiswa **berhak melihat rubrik** aktivitas yang dikerjakannya — kriteria penilaian tidak boleh disembunyikan. Yang dibatasi adalah mengubahnya (ROLE-STUDENT).

---

## 8. Domain 6 — Student Process (inti)

| Tabel              | SELECT     | INSERT     | UPDATE       | DELETE       |
| ------------------ | ---------- | ---------- | ------------ | ------------ |
| `attempt_drafts`   | 🔒/⛔²⁰/⛔ | 🔒/⛔/⛔   | 🔒/⛔/⛔     | 🔒/⛔/⛔     |
| `attempts`         | 🔒/🎓/⛔   | 🔒²¹/⛔/⛔ | **⛔/⛔/⛔** | **⛔/⛔/⛔** |
| `attempt_answers`  | 🔒/🎓/⛔   | 🔒/⛔/⛔   | **⛔/⛔/⛔** | **⛔/⛔/⛔** |
| `revisions`        | 🔒/🎓/⛔   | 🔒²²/⛔/⛔ | **⛔/⛔/⛔** | **⛔/⛔/⛔** |
| `revision_reasons` | 🔒/🎓/⛔   | 🔒/⛔/⛔   | **⛔/⛔/⛔** | **⛔/⛔/⛔** |
| `feedback_records` | 🔒/🎓/⛔   | ⚙️²³/🎓/⛔ | ⛔/⛔/⛔     | ⛔/⛔/⛔     |
| `verifications`    | 🔒/🎓/⛔   | 🔒/⛔/⛔   | ⛔/⛔/⛔     | ⛔/⛔/⛔     |
| `reflections`      | 🔒/🎓/⛔   | 🔒²⁴/⛔/⛔ | ⛔/⛔/⛔     | ⛔/⛔/⛔     |
| `mastery_results`  | 🔒/🎓/⛔   | ⚙️/🎓/⛔   | ⛔²⁵/⛔²⁵/⛔ | ⛔/⛔/⛔     |

²⁰ Draft yang belum disimpan bukan artefak akademik; dosen tidak mengintip ketikan berjalan.
²¹ Hanya bila mahasiswa terdaftar aktif di kelas, aktivitas `published`, dan belum lewat `due_at` (atau dosen mengizinkan).
²² Hanya bila `attempts` baseline miliknya sudah ada — revisi tanpa attempt mustahil.
²³ Feedback AI ditulis Route Handler server-only setelah validasi schema; mahasiswa tidak dapat menulisnya sendiri.
²⁴ Satu refleksi per (activity, student, attempt); sepuluh kolom wajib terisi.
²⁵ Perubahan hasil dilakukan dengan **menambah baris baru** + `lecturer_overrides`, bukan `UPDATE`.

**Baris paling penting di seluruh dokumen ini:** `attempts` memiliki ⛔ pada UPDATE dan DELETE untuk **semua** peran, diperkuat trigger yang juga mengikat `service_role`. Inilah wujud teknis LOCK-PED-004.

---

## 9. Domain 7 — Adaptive Learning

| Tabel                 | SELECT     | INSERT   | UPDATE   | DELETE   |
| --------------------- | ---------- | -------- | -------- | -------- |
| `error_categories`    | ✅²⁶/✅/✅ | ⛔/⛔/✅ | ⛔/⛔/✅ | ⛔/⛔/⛔ |
| `branching_rules`     | ⛔/🎓/⛔   | ⛔/🎓/⛔ | ⛔/🎓/⛔ | ⛔/🎓/⛔ |
| `branching_decisions` | 🔒²⁷/🎓/⛔ | ⚙️/🎓/⛔ | ⛔/⛔/⛔ | ⛔/⛔/⛔ |
| `remedial_units`      | 📚/🎓/⛔   | ⛔/🎓/⛔ | ⛔/🎓/⛔ | ⛔/🎓/⛔ |
| `enrichment_units`    | 📚/🎓/⛔   | ⛔/🎓/⛔ | ⛔/🎓/⛔ | ⛔/🎓/⛔ |
| `lecturer_overrides`  | 🔒²⁸/🎓/⛔ | ⛔/🎓/⛔ | ⛔/⛔/⛔ | ⛔/⛔/⛔ |

²⁶ Mahasiswa perlu membaca nama dan penjelasan kategori kesalahan agar keputusan branching dapat dipahami.
²⁷ **Wajib** — LOCK-PED-009 menuntut keputusan dapat dilihat pengguna yang dikenainya.
²⁸ Mahasiswa melihat override yang menyangkut dirinya, termasuk alasannya.

---

## 10. Domain 8 — AI

| Tabel                 | SELECT       | INSERT   | UPDATE     | DELETE   |
| --------------------- | ------------ | -------- | ---------- | -------- |
| `ai_prompt_templates` | ⛔²⁹/🎓³⁰/✅ | ⛔/⛔/✅ | ⛔/⛔/✅   | ⛔/⛔/⛔ |
| `ai_interactions`     | 🔒³¹/🎓/⛔   | ⚙️/⛔/⛔ | ⛔/⛔/⛔   | ⛔/⛔/⛔ |
| `ai_feedback`         | 🔒/🎓/⛔     | ⚙️/⛔/⛔ | 🔒³²/⛔/⛔ | ⛔/⛔/⛔ |
| `ai_citations`        | 🔒/🎓/⛔     | ⚙️/⛔/⛔ | 🔒³³/⛔/⛔ | ⛔/⛔/⛔ |
| `ai_incidents`        | 🔒/🎓/✅³⁴   | 🔒/⛔/⛔ | ⛔/🎓³⁵/⛔ | ⛔/⛔/⛔ |
| `ai_disclosures`      | 🔒/🎓/⛔     | 🔒/⛔/⛔ | ⛔/⛔/⛔   | ⛔/⛔/⛔ |

²⁹ Prompt sistem tidak dibuka ke mahasiswa (mencegah prompt gaming).
³⁰ Dosen membaca template yang aktif di kelasnya untuk memeriksa perilaku AI (LOCK-PED-010: dosen berhak memeriksa feedback AI).
³¹ Mahasiswa melihat riwayat pemakaian AI-nya sendiri — bagian dari transparansi.
³² Hanya kolom `student_action` dan `acted_at` (Terima/Abaikan/Laporkan).
³³ Hanya kolom `verified_by_student`.
³⁴ Admin melihat metadata insiden untuk kepentingan operasional; penanganan substansi tetap di dosen.
³⁵ Dosen mengubah `status`, `handled_by`, `handled_at`, `resolution_note`.

---

## 11. Domain 9 — Assessment & Analytics

| Tabel                      | SELECT           | INSERT   | UPDATE         | DELETE   |
| -------------------------- | ---------------- | -------- | -------------- | -------- |
| `assessments`              | 📚/🎓/⛔         | ⛔/🎓/⛔ | ⛔/🎓/⛔       | ⛔/🎓/⛔ |
| `assessment_scores`        | 🔒³⁶/🎓/**⛔**³⁷ | ⛔/🎓/⛔ | ⛔/🎓³⁸/**⛔** | ⛔/⛔/⛔ |
| `critical_thinking_scores` | 🔒/🎓/⛔         | ⚙️/🎓/⛔ | ⛔/⛔/⛔       | ⛔/⛔/⛔ |
| `learning_events`          | 🔒/🎓³⁹/⛔       | ⚙️/⛔/⛔ | ⛔/⛔/⛔       | ⛔/⛔/⛔ |
| `fidelity_records`         | ⛔/🎓/✅         | ⛔/🎓/⛔ | ⛔/🎓/⛔       | ⛔/⛔/⛔ |

³⁶ Hanya setelah `is_final = true` — nilai sementara tidak bocor.
³⁷ **Admin tidak dapat membaca maupun mengubah nilai** (SEC-005).
³⁸ Wajib disertai baris `lecturer_overrides` dalam transaksi yang sama; ditegakkan Server Action, diverifikasi test.
³⁹ Dosen melihat peristiwa kelasnya untuk analitik, dalam bentuk teragregasi di UI.

---

## 12. Domain 10 — Governance

| Tabel                  | SELECT       | INSERT   | UPDATE     | DELETE   |
| ---------------------- | ------------ | -------- | ---------- | -------- |
| `consent_records`      | 🔒/⛔⁴⁰/✅⁴¹ | 🔒/⛔/⛔ | 🔒⁴²/⛔/⛔ | ⛔/⛔/⛔ |
| `data_retention_rules` | ⛔/⛔/✅     | ⛔/⛔/✅ | ⛔/⛔/✅   | ⛔/⛔/⛔ |
| `audit_logs`           | ⛔/⛔/✅⁴³   | ⚙️/⚙️/⚙️ | ⛔/⛔/⛔   | ⛔/⛔/⛔ |
| `notifications`        | 🔒/🔒/🔒     | ⚙️/⚙️/⚙️ | 🔒⁴⁴/🔒/🔒 | 🔒/🔒/🔒 |

⁴⁰ Dosen tidak boleh mengetahui siapa yang bersedia menjadi partisipan penelitian — mencegah bias perlakuan dan tekanan pada mahasiswa.
⁴¹ Admin melihat status agregat/administratif, bukan isi data penelitian.
⁴² Hanya untuk mencabut consent (`status → withdrawn`).
⁴³ Sesuai izin operasional; akses terhadap audit itu sendiri juga tercatat.
⁴⁴ Hanya kolom `read_at`.

---

## 13. Schema `research`

| Objek                   | SELECT                                                                      | Tulis |
| ----------------------- | --------------------------------------------------------------------------- | ----- |
| `research.participants` | ⛔ untuk S/L/A — hanya peran `researcher` khusus atau ⚙️                    | ⚙️    |
| `research.v_*` (views)  | ⛔ untuk S/L/A — akses melalui Route Handler export dengan otorisasi khusus | —     |

Peran `researcher` diusulkan **tidak** dibuat pada MVP; ekspor dilakukan lewat Route Handler `/api/exports/research` yang memerlukan otorisasi eksplisit dan mencatat setiap akses ke `audit_logs` (PHASE 14).

---

## 14. Skenario Uji yang Akan Dijalankan (PHASE 4B)

Setiap baris di bawah menjadi satu test SQL yang **dijalankan nyata**, bukan diklaim.

| #   | Skenario                                                | Ekspektasi                       |
| --- | ------------------------------------------------------- | -------------------------------- |
| 1   | Mahasiswa A membaca `attempts` mahasiswa B              | 0 baris                          |
| 2   | Mahasiswa `UPDATE` attempt-nya sendiri                  | Error dari trigger               |
| 3   | `service_role` `UPDATE` attempt                         | Error dari trigger               |
| 4   | Mahasiswa `INSERT` revisi tanpa attempt                 | Gagal (FK/policy)                |
| 5   | Dosen membaca attempt di kelas yang tidak diampu        | 0 baris                          |
| 6   | Dosen menulis nilai di kelas yang tidak diampu          | Ditolak                          |
| 7   | Admin membaca `assessment_scores`                       | 0 baris                          |
| 8   | Admin `UPDATE` `mastery_results`                        | Ditolak                          |
| 9   | `INSERT` `branching_decisions` tanpa `reason`           | Ditolak check constraint         |
| 10  | `INSERT` `lecturer_overrides` tanpa `previous_value`    | Ditolak                          |
| 11  | `INSERT` `ai_interactions` tanpa `attempt_id`           | Ditolak (attempt-first)          |
| 12  | Mahasiswa membaca `branching_decisions` miliknya        | Berhasil (transparansi)          |
| 13  | Mahasiswa membaca konten `draft`                        | 0 baris                          |
| 14  | Mahasiswa membaca `activity_instructions` audiens dosen | 0 baris                          |
| 15  | Dosen membaca `consent_records`                         | 0 baris                          |
| 16  | `INSERT` `reflections` dengan kolom kosong              | Ditolak                          |
| 17  | Dua baseline attempt untuk (activity, student)          | Ditolak unique                   |
| 18  | Setiap tabel publik memiliki RLS aktif                  | Query katalog: 0 tabel tanpa RLS |
