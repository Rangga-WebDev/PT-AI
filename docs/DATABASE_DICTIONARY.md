<!-- @format -->

# DATABASE DICTIONARY — PT-AI LMS

Status: **USULAN PHASE 4A.** Pendamping [DATABASE.md](DATABASE.md).

Kolom standar yang **tidak diulang** di setiap tabel:

- `id uuid pk default gen_random_uuid()`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()` — hanya pada tabel mutable, dengan trigger `set_updated_at()`

Legenda: **AO** = append-only (tanpa `UPDATE`/`DELETE`) · **SD** = soft delete (`deleted_at`) · **FK** = foreign key.

---

## Domain 1 — Identity

### `organizations` — institusi penyelenggara

Alasan: akar multi-institusi (§13 no. 12); seluruh data akademik bermuara ke sini.

| Kolom       | Tipe    | Constraint                        |
| ----------- | ------- | --------------------------------- |
| `name`      | text    | not null, length > 0              |
| `code`      | text    | not null, **unique**              |
| `kind`      | text    | not null default `'university'`   |
| `timezone`  | text    | not null default `'Asia/Jakarta'` |
| `is_active` | boolean | not null default true             |

Index: `uq_organizations_code`.

### `faculties` — fakultas

Alasan: struktur akademik yang dikelola admin (ROLE-ADMIN).

| Kolom             | Tipe | Constraint                                       |
| ----------------- | ---- | ------------------------------------------------ |
| `organization_id` | uuid | FK → organizations, not null, on delete restrict |
| `name`            | text | not null                                         |
| `code`            | text | not null, unique bersama `organization_id`       |

### `study_programs` — program studi

| Kolom          | Tipe | Constraint                              |
| -------------- | ---- | --------------------------------------- |
| `faculty_id`   | uuid | FK → faculties, not null                |
| `name`         | text | not null                                |
| `code`         | text | not null, unique bersama `faculty_id`   |
| `degree_level` | text | not null, check ∈ (`d3`,`s1`,`s2`,`s3`) |

### `profiles` — identitas pengguna aplikasi

Alasan: memperluas `auth.users` tanpa menduplikasi kredensial.

| Kolom              | Tipe    | Constraint                                               |
| ------------------ | ------- | -------------------------------------------------------- |
| `id`               | uuid    | **PK**, FK → `auth.users(id)` on delete cascade          |
| `organization_id`  | uuid    | FK → organizations, not null                             |
| `study_program_id` | uuid    | FK → study_programs, nullable (dosen/admin boleh kosong) |
| `full_name`        | text    | not null, length > 0                                     |
| `identifier`       | text    | not null (NIM/NIDN), unique bersama `organization_id`    |
| `avatar_path`      | text    | nullable (Supabase Storage)                              |
| `is_active`        | boolean | not null default true                                    |

Catatan: **tidak menyimpan email atau password** — keduanya milik `auth.users`.

### `roles` — kamus peran

| Kolom         | Tipe       | Constraint           |
| ------------- | ---------- | -------------------- |
| `key`         | `role_key` | not null, **unique** |
| `name`        | text       | not null             |
| `description` | text       | nullable             |

Berisi tepat tiga baris (seed): student, lecturer, admin.

### `role_assignments` — pemberian peran

Alasan: peran ganda dan jejak pencabutan; peran tidak pernah dipercaya dari klien (SEC-004).

| Kolom             | Tipe        | Constraint                   |
| ----------------- | ----------- | ---------------------------- |
| `profile_id`      | uuid        | FK → profiles, not null      |
| `role_id`         | uuid        | FK → roles, not null         |
| `organization_id` | uuid        | FK → organizations, not null |
| `granted_by`      | uuid        | FK → profiles, not null      |
| `granted_at`      | timestamptz | not null default now()       |
| `revoked_at`      | timestamptz | nullable                     |
| `revoked_by`      | uuid        | FK → profiles, nullable      |

Index: partial unique `(profile_id, role_id, organization_id) where revoked_at is null`; `idx_role_assignments_profile`.

---

## Domain 2 — Academic

### `academic_periods` — periode akademik

| Kolom                     | Tipe    | Constraint                              |
| ------------------------- | ------- | --------------------------------------- |
| `organization_id`         | uuid    | FK, not null                            |
| `name`                    | text    | not null (mis. "Ganjil 2026/2027")      |
| `code`                    | text    | not null, unique bersama organization   |
| `start_date` / `end_date` | date    | not null, check `end_date > start_date` |
| `is_active`               | boolean | not null default false                  |

### `courses` — mata kuliah — **SD**

| Kolom              | Tipe        | Constraint                            |
| ------------------ | ----------- | ------------------------------------- |
| `organization_id`  | uuid        | FK, not null                          |
| `study_program_id` | uuid        | FK, not null                          |
| `code`             | text        | not null, unique bersama organization |
| `name`             | text        | not null                              |
| `description`      | text        | nullable                              |
| `credits`          | smallint    | not null, check 1–8                   |
| `created_by`       | uuid        | FK → profiles, not null               |
| `deleted_at`       | timestamptz | nullable                              |

### `classes` — kelas — **SD**

| Kolom                | Tipe                 | Constraint                                                 |
| -------------------- | -------------------- | ---------------------------------------------------------- |
| `course_id`          | uuid                 | FK, not null                                               |
| `academic_period_id` | uuid                 | FK, not null                                               |
| `code`               | text                 | not null, unique bersama `(course_id, academic_period_id)` |
| `name`               | text                 | not null                                                   |
| `capacity`           | smallint             | check > 0, nullable                                        |
| `status`             | `publication_status` | not null default `draft`                                   |
| `created_by`         | uuid                 | FK, not null                                               |
| `deleted_at`         | timestamptz          | nullable                                                   |

### `class_lecturers` — penugasan dosen

Alasan: **sumber kebenaran otorisasi dosen**; seluruh policy dosen bergantung padanya.

| Kolom           | Tipe        | Constraint                                 |
| --------------- | ----------- | ------------------------------------------ |
| `class_id`      | uuid        | FK, not null                               |
| `lecturer_id`   | uuid        | FK → profiles, not null                    |
| `role_in_class` | text        | not null, check ∈ (`coordinator`,`member`) |
| `assigned_by`   | uuid        | FK, not null                               |
| `assigned_at`   | timestamptz | not null default now()                     |

Unique `(class_id, lecturer_id)`; index `(lecturer_id)`.

### `enrollments` — pendaftaran mahasiswa

Alasan: **sumber kebenaran otorisasi mahasiswa**.

| Kolom         | Tipe                | Constraint                |
| ------------- | ------------------- | ------------------------- |
| `class_id`    | uuid                | FK, not null              |
| `student_id`  | uuid                | FK → profiles, not null   |
| `status`      | `enrollment_status` | not null default `active` |
| `enrolled_by` | uuid                | FK, not null              |
| `enrolled_at` | timestamptz         | not null default now()    |

Unique `(class_id, student_id)`; index `(student_id, status)`.

---

## Domain 3 — Content

### `modules` — modul dalam kelas — **SD**

| Kolom         | Tipe                 | Constraint                                     |
| ------------- | -------------------- | ---------------------------------------------- |
| `class_id`    | uuid                 | FK, not null                                   |
| `title`       | text                 | not null                                       |
| `description` | text                 | nullable                                       |
| `sequence`    | integer              | not null, check > 0, unique bersama `class_id` |
| `status`      | `publication_status` | not null default `draft`                       |
| `created_by`  | uuid                 | FK, not null                                   |

### `learning_units` — unit pembelajaran — **SD**

| Kolom                    | Tipe                 | Constraint                                                        |
| ------------------------ | -------------------- | ----------------------------------------------------------------- |
| `module_id`              | uuid                 | FK, not null                                                      |
| `title`                  | text                 | not null                                                          |
| `objective`              | text                 | not null                                                          |
| `sequence`               | integer              | not null, unique bersama `module_id`                              |
| `status`                 | `publication_status` | not null default `draft`                                          |
| `opens_at` / `closes_at` | timestamptz          | nullable, check `closes_at > opens_at`                            |
| `unit_kind`              | text                 | not null default `core`, check ∈ (`core`,`remedial`,`enrichment`) |
| `created_by`             | uuid                 | FK, not null                                                      |

`unit_kind` memungkinkan unit remedial/pengayaan memakai struktur yang sama tanpa tabel duplikat.

### `cases` — kasus kewarganegaraan — **SD**

| Kolom              | Tipe | Constraint                                                   |
| ------------------ | ---- | ------------------------------------------------------------ |
| `learning_unit_id` | uuid | FK, not null, **unique** (satu kasus utama per unit — DB-07) |
| `title`            | text | not null                                                     |
| `context`          | text | not null                                                     |
| `body`             | text | not null                                                     |
| `key_question`     | text | not null                                                     |
| `created_by`       | uuid | FK, not null                                                 |

### `learning_stages` — enam tahap per unit

Alasan: menegakkan LOCK-PED-002 di level data.

| Kolom              | Tipe        | Constraint                               |
| ------------------ | ----------- | ---------------------------------------- |
| `learning_unit_id` | uuid        | FK, not null                             |
| `stage_key`        | `stage_key` | not null, unique bersama unit            |
| `sequence`         | integer     | not null, check 1–6, unique bersama unit |
| `title`            | text        | not null                                 |
| `focus`            | text        | not null                                 |
| `is_enabled`       | boolean     | not null default true                    |

Dibuat otomatis (6 baris) oleh trigger `seed_learning_stages()`. Tidak ada jalur aplikasi untuk `INSERT`/`DELETE` manual.

### `activities` — aktivitas dalam tahap — **SD**

| Kolom                        | Tipe                 | Constraint                                                                                |
| ---------------------------- | -------------------- | ----------------------------------------------------------------------------------------- |
| `learning_stage_id`          | uuid                 | FK, not null                                                                              |
| `title`                      | text                 | not null                                                                                  |
| `prompt`                     | text                 | not null                                                                                  |
| `activity_type`              | text                 | not null, check ∈ (`written_response`,`claim_mapping`,`source_verification`,`reflection`) |
| `rubric_id`                  | uuid                 | FK → rubrics, nullable                                                                    |
| `mastery_threshold`          | numeric(5,2)         | nullable, check 0–100; rujukan penilaian dosen, tidak menjadi gerbang otomatis            |
| `allows_ai`                  | boolean              | not null default false                                                                    |
| `allowed_ai_functions`       | `ai_function[]`      | not null default `'{}'`                                                                   |
| `requires_attempt_before_ai` | boolean              | not null default **true**                                                                 |
| `due_at`                     | timestamptz          | nullable                                                                                  |
| `sequence`                   | integer              | not null, unique bersama stage                                                            |
| `status`                     | `publication_status` | not null default `draft`                                                                  |
| `created_by`                 | uuid                 | FK, not null                                                                              |

`requires_attempt_before_ai` default `true` dan diperiksa server sebelum panggilan AI; menonaktifkannya adalah keputusan sadar dosen yang tercatat di `audit_logs`.

### `activity_instructions` — instruksi terpisah per audiens

| Kolom         | Tipe    | Constraint                               |
| ------------- | ------- | ---------------------------------------- |
| `activity_id` | uuid    | FK, not null                             |
| `audience`    | text    | not null, check ∈ (`student`,`lecturer`) |
| `content`     | text    | not null                                 |
| `sequence`    | integer | not null                                 |

Alasan: catatan pedagogis dosen tidak boleh terbaca mahasiswa — dipisah agar RLS bisa memfilternya.

### `learning_resources` — bahan pendukung — **SD**

| Kolom              | Tipe | Constraint                                       |
| ------------------ | ---- | ------------------------------------------------ |
| `learning_unit_id` | uuid | FK, nullable                                     |
| `activity_id`      | uuid | FK, nullable                                     |
| `title`            | text | not null                                         |
| `resource_type`    | text | not null, check ∈ (`link`,`file`,`video`,`note`) |
| `url`              | text | nullable                                         |
| `storage_path`     | text | nullable                                         |
| `created_by`       | uuid | FK, not null                                     |

Check: tepat satu induk terisi; dan (`url` atau `storage_path`) terisi.

---

## Domain 4 — Sources

### `sources` — sumber terkurasi — **SD**

| Kolom             | Tipe          | Constraint            |
| ----------------- | ------------- | --------------------- |
| `organization_id` | uuid          | FK, not null          |
| `title`           | text          | not null              |
| `authors`         | text          | nullable              |
| `publisher`       | text          | nullable              |
| `source_type`     | `source_type` | not null              |
| `published_at`    | date          | nullable              |
| `url`             | text          | nullable              |
| `language`        | text          | not null default `id` |
| `curation_note`   | text          | nullable              |
| `is_curated`      | boolean       | not null default true |
| `created_by`      | uuid          | FK, not null          |

Index: GIN `pg_trgm` pada `title`.

### `source_versions` — versi sumber

Alasan: kutipan AI harus tetap terlacak walau sumber diperbarui (LOCK-PED-007).

| Kolom           | Tipe        | Constraint                              |
| --------------- | ----------- | --------------------------------------- |
| `source_id`     | uuid        | FK, not null                            |
| `version_label` | text        | not null, unique bersama `source_id`    |
| `retrieved_at`  | timestamptz | not null                                |
| `checksum`      | text        | nullable                                |
| `content_text`  | text        | nullable (teks yang di-chunk untuk RAG) |
| `notes`         | text        | nullable                                |
| `created_by`    | uuid        | FK, not null                            |

### `source_files` — berkas sumber di Storage

| Kolom               | Tipe   | Constraint                                              |
| ------------------- | ------ | ------------------------------------------------------- |
| `source_version_id` | uuid   | FK, not null                                            |
| `storage_bucket`    | text   | not null default `sources`                              |
| `storage_path`      | text   | not null, **unique**                                    |
| `original_filename` | text   | not null                                                |
| `mime_type`         | text   | not null, check ∈ daftar putih (pdf, docx, txt, gambar) |
| `size_bytes`        | bigint | not null, check > 0 dan ≤ 26214400 (25 MB)              |
| `uploaded_by`       | uuid   | FK, not null                                            |

Validasi MIME dan ukuran di database melengkapi validasi aplikasi (SEC butir 10).

### `source_chunks` — potongan + embedding (RAG)

| Kolom               | Tipe           | Constraint                       |
| ------------------- | -------------- | -------------------------------- |
| `source_version_id` | uuid           | FK, not null                     |
| `chunk_index`       | integer        | not null, unique bersama version |
| `content`           | text           | not null                         |
| `token_count`       | integer        | nullable                         |
| `embedding`         | `vector(1536)` | nullable (lihat DB-03)           |
| `embedded_at`       | timestamptz    | nullable                         |

Index: HNSW `vector_cosine_ops` pada `embedding`.

### `case_sources` — source pack sebuah kasus

| Kolom         | Tipe    | Constraint            |
| ------------- | ------- | --------------------- |
| `case_id`     | uuid    | FK, not null          |
| `source_id`   | uuid    | FK, not null          |
| `sequence`    | integer | not null              |
| `is_required` | boolean | not null default true |

Unique `(case_id, source_id)`. Menjadi **batas scope RAG**: AI hanya boleh mengambil dari sumber yang terlampir pada kasus.

### `claims` — klaim yang dianalisis

| Kolom         | Tipe           | Constraint                                                |
| ------------- | -------------- | --------------------------------------------------------- |
| `case_id`     | uuid           | FK, nullable                                              |
| `activity_id` | uuid           | FK, nullable                                              |
| `author_id`   | uuid           | FK → profiles, nullable (null bila berasal dari kasus/AI) |
| `origin`      | `claim_origin` | not null                                                  |
| `text`        | text           | not null                                                  |

Check: minimal satu dari `case_id`/`activity_id` terisi.

### `claim_source_links` — penautan klaim ke bukti

| Kolom               | Tipe              | Constraint              |
| ------------------- | ----------------- | ----------------------- |
| `claim_id`          | uuid              | FK, not null            |
| `source_id`         | uuid              | FK, not null            |
| `source_version_id` | uuid              | FK, nullable            |
| `link_type`         | `claim_link_type` | not null                |
| `note`              | text              | nullable                |
| `linked_by`         | uuid              | FK → profiles, not null |

Unique `(claim_id, source_id, linked_by)`.

### `source_verifications` — penilaian kredibilitas sumber — **AO**

| Kolom               | Tipe                   | Constraint                                                                                  |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| `source_id`         | uuid                   | FK, not null                                                                                |
| `source_version_id` | uuid                   | FK, nullable                                                                                |
| `student_id`        | uuid                   | FK, not null                                                                                |
| `activity_id`       | uuid                   | FK, not null                                                                                |
| `verdict`           | `verification_verdict` | not null                                                                                    |
| `checklist`         | jsonb                  | not null — enam kunci: credibility, relevance, sufficiency, traceability, consistency, bias |
| `note`              | text                   | not null, length ≥ 10                                                                       |

Check: `checklist ?& array['credibility','relevance','sufficiency','traceability','consistency','bias']` — memastikan seluruh kriteria LOCK-PED-007 terisi.

---

## Domain 5 — Rubrics

### `rubrics` — **SD**

| Kolom             | Tipe                 | Constraint               |
| ----------------- | -------------------- | ------------------------ |
| `organization_id` | uuid                 | FK, not null             |
| `title`           | text                 | not null                 |
| `description`     | text                 | nullable                 |
| `is_template`     | boolean              | not null default false   |
| `status`          | `publication_status` | not null default `draft` |
| `created_by`      | uuid                 | FK, not null             |

### `rubric_criteria`

| Kolom         | Tipe           | Constraint                      |
| ------------- | -------------- | ------------------------------- |
| `rubric_id`   | uuid           | FK, not null                    |
| `code`        | text           | not null, unique bersama rubric |
| `description` | text           | not null                        |
| `dimension`   | `ct_dimension` | not null                        |
| `weight`      | numeric(5,2)   | not null, check > 0             |
| `sequence`    | integer        | not null                        |

`dimension` wajib agar skor rubrik dapat diagregasi menjadi profil enam dimensi tanpa tebakan.

### `rubric_levels`

| Kolom                 | Tipe         | Constraint                        |
| --------------------- | ------------ | --------------------------------- |
| `rubric_criterion_id` | uuid         | FK, not null                      |
| `level_order`         | integer      | not null, unique bersama kriteria |
| `label`               | text         | not null                          |
| `descriptor`          | text         | not null                          |
| `score`               | numeric(5,2) | not null                          |

---

## Domain 6 — Student Process

### `attempt_drafts` — autosave (satu-satunya tabel proses yang boleh ditimpa)

| Kolom         | Tipe        | Constraint            |
| ------------- | ----------- | --------------------- |
| `activity_id` | uuid        | FK, not null          |
| `student_id`  | uuid        | FK, not null          |
| `content`     | text        | not null default `''` |
| `updated_at`  | timestamptz | not null              |

Unique `(activity_id, student_id)`. Dihapus setelah dipromosikan menjadi `attempts`.

### `attempts` — respons awal — **AO**

Alasan: inti LOCK-PED-004.

| Kolom                  | Tipe        | Constraint                                                      |
| ---------------------- | ----------- | --------------------------------------------------------------- |
| `activity_id`          | uuid        | FK, not null                                                    |
| `student_id`           | uuid        | FK, not null                                                    |
| `attempt_number`       | integer     | not null, check > 0, unique bersama `(activity_id, student_id)` |
| `is_baseline`          | boolean     | not null default true                                           |
| `content`              | text        | not null, length > 0                                            |
| `content_hash`         | text        | not null (deteksi duplikasi/idempotency)                        |
| `submitted_at`         | timestamptz | not null default now()                                          |
| `client_submission_id` | uuid        | nullable, unique — proteksi double-submit (SEC butir 18–19)     |

Partial unique `(activity_id, student_id) where is_baseline`; trigger `prevent_mutation()`.

### `attempt_answers` — jawaban terstruktur — **AO**

| Kolom          | Tipe    | Constraint                       |
| -------------- | ------- | -------------------------------- |
| `attempt_id`   | uuid    | FK, not null                     |
| `question_key` | text    | not null, unique bersama attempt |
| `content`      | text    | not null                         |
| `sequence`     | integer | not null                         |

Dipakai untuk aktivitas berformat multi-bagian (mis. claim mapping).

### `revisions` — versi perbaikan — **AO**

| Kolom                  | Tipe        | Constraint                                  |
| ---------------------- | ----------- | ------------------------------------------- |
| `attempt_id`           | uuid        | FK, not null                                |
| `student_id`           | uuid        | FK, not null                                |
| `revision_number`      | integer     | not null, check > 0, unique bersama attempt |
| `content`              | text        | not null, length > 0                        |
| `submitted_at`         | timestamptz | not null default now()                      |
| `client_submission_id` | uuid        | nullable, unique                            |

### `revision_reasons` — alasan perubahan — **AO**

| Kolom            | Tipe | Constraint                                                                                                                     |
| ---------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| `revision_id`    | uuid | FK, not null                                                                                                                   |
| `reason_type`    | text | not null, check ∈ (`ai_suggestion_accepted`,`ai_suggestion_rejected`,`new_evidence`,`lecturer_feedback`,`self_review`,`other`) |
| `detail`         | text | not null, length ≥ 10                                                                                                          |
| `ai_feedback_id` | uuid | FK → ai_feedback, nullable                                                                                                     |

Menghubungkan revisi dengan saran AI yang diterima/ditolak (LOCK-PED-011).

### `feedback_records` — umpan balik — **AO**

| Kolom               | Tipe              | Constraint                                  |
| ------------------- | ----------------- | ------------------------------------------- |
| `attempt_id`        | uuid              | FK, nullable                                |
| `revision_id`       | uuid              | FK, nullable                                |
| `source`            | `feedback_source` | not null                                    |
| `author_id`         | uuid              | FK → profiles, nullable (null bila dari AI) |
| `ai_interaction_id` | uuid              | FK, nullable                                |
| `content`           | text              | not null                                    |
| `rubric_id`         | uuid              | FK, nullable                                |

Check: tepat satu dari `attempt_id`/`revision_id`; bila `source = 'lecturer'` maka `author_id` wajib; bila `source = 'ai'` maka `ai_interaction_id` wajib.

### `verifications` — penelusuran klaim/saran AI ke sumber — **AO**

| Kolom                | Tipe                   | Constraint                                |
| -------------------- | ---------------------- | ----------------------------------------- |
| `activity_id`        | uuid                   | FK, not null                              |
| `student_id`         | uuid                   | FK, not null                              |
| `subject_kind`       | text                   | not null, check ∈ (`ai_feedback`,`claim`) |
| `subject_id`         | uuid                   | not null                                  |
| `outcome`            | `verification_outcome` | not null                                  |
| `evidence_source_id` | uuid                   | FK → sources, nullable                    |
| `note`               | text                   | not null, length ≥ 10                     |

Menegakkan LOCK-PED-006: saran AI harus diverifikasi, bukan diterima begitu saja.

### `reflections` — refleksi & regulasi diri — **AO**

Alasan: LOCK-PED-011 mendaftar sepuluh unsur wajib; semuanya menjadi kolom, bukan satu blok teks bebas.

| Kolom                      | Tipe        | Constraint             |
| -------------------------- | ----------- | ---------------------- |
| `activity_id`              | uuid        | FK, not null           |
| `student_id`               | uuid        | FK, not null           |
| `attempt_id`               | uuid        | FK, not null           |
| `revision_id`              | uuid        | FK, nullable           |
| `initial_summary`          | text        | not null               |
| `feedback_summary`         | text        | not null               |
| `verified_sources_summary` | text        | not null               |
| `final_summary`            | text        | not null               |
| `change_reason`            | text        | not null               |
| `ai_accepted`              | text        | not null               |
| `ai_rejected`              | text        | not null               |
| `bias_found`               | text        | not null               |
| `next_strategy`            | text        | not null               |
| `submitted_at`             | timestamptz | not null default now() |

Seluruh kolom teks: check `length(btrim(...)) >= 10`. Unique `(activity_id, student_id, attempt_id)`.

### `mastery_results` — hasil ketuntasan — **AO**

| Kolom             | Tipe              | Constraint                           |
| ----------------- | ----------------- | ------------------------------------ |
| `activity_id`     | uuid              | FK, not null                         |
| `student_id`      | uuid              | FK, not null                         |
| `evaluator_kind`  | `evaluator_kind`  | not null                             |
| `evaluator_id`    | uuid              | FK, nullable (wajib bila `lecturer`) |
| `outcome`         | `mastery_outcome` | not null                             |
| `score`           | numeric(5,2)      | nullable, check 0–100                |
| `rubric_id`       | uuid              | FK, nullable                         |
| `criteria_scores` | jsonb             | not null default `'{}'`              |
| `is_final`        | boolean           | not null default false               |
| `decided_at`      | timestamptz       | not null default now()               |

Hasil sistem dan keputusan dosen sama-sama disimpan sebagai baris terpisah; keputusan dosen menang melalui `is_final` + `lecturer_overrides`. **Tidak ada jalur AI menulis ke tabel ini.**

---

## Domain 7 — Adaptive Learning

### `error_categories` — kamus jenis kesalahan penalaran

Alasan: branching didasarkan jenis kesalahan (LOCK-PED-009), bukan sekadar skor.

| Kolom             | Tipe           | Constraint                            |
| ----------------- | -------------- | ------------------------------------- |
| `organization_id` | uuid           | FK, nullable (null = kategori global) |
| `key`             | text           | not null, **unique**                  |
| `name`            | text           | not null                              |
| `description`     | text           | not null                              |
| `dimension`       | `ct_dimension` | nullable                              |

Seed awal mengikuti daftar LOCK-PED-009 (konteks tak dipahami, klaim tercampur fakta, asumsi tak dikenali, sumber tak kredibel, sumber tak terlacak, bukti tak relevan, inferensi terlalu luas, kontraargumen diabaikan, AI diterima tanpa verifikasi, refleksi dangkal).

### `branching_rules`

| Kolom               | Tipe               | Constraint                    |
| ------------------- | ------------------ | ----------------------------- |
| `activity_id`       | uuid               | FK, not null                  |
| `error_category_id` | uuid               | FK, nullable                  |
| `condition`         | jsonb              | not null                      |
| `action`            | `branching_action` | not null                      |
| `target_unit_id`    | uuid               | FK → learning_units, nullable |
| `priority`          | integer            | not null default 100          |
| `explanation`       | text               | **not null**, length ≥ 10     |
| `is_active`         | boolean            | not null default true         |
| `created_by`        | uuid               | FK, not null                  |

### `branching_decisions` — **AO**

| Kolom               | Tipe               | Constraint                |
| ------------------- | ------------------ | ------------------------- |
| `student_id`        | uuid               | FK, not null              |
| `activity_id`       | uuid               | FK, not null              |
| `branching_rule_id` | uuid               | FK, nullable              |
| `error_category_id` | uuid               | FK, nullable              |
| `action`            | `branching_action` | not null                  |
| `reason`            | text               | **not null**, length ≥ 10 |
| `evidence`          | jsonb              | not null default `'{}'`   |
| `decided_by`        | `evaluator_kind`   | not null                  |
| `decided_at`        | timestamptz        | not null default now()    |

Mahasiswa **boleh membaca** baris miliknya sendiri — keputusan adaptif tidak boleh menjadi kotak hitam.

### `remedial_units` / `enrichment_units`

| Kolom               | Tipe | Constraint                                 |
| ------------------- | ---- | ------------------------------------------ |
| `learning_unit_id`  | uuid | FK, not null (unit ber-`unit_kind` sesuai) |
| `error_category_id` | uuid | FK — hanya pada `remedial_units`, not null |
| `trigger_criteria`  | text | not null — hanya pada `enrichment_units`   |
| `title`             | text | not null                                   |
| `description`       | text | not null                                   |
| `created_by`        | uuid | FK, not null                               |

### `lecturer_overrides` — **AO**

Alasan: aturan §13 no. 11 secara eksplisit.

| Kolom            | Tipe               | Constraint                |
| ---------------- | ------------------ | ------------------------- |
| `lecturer_id`    | uuid               | FK, **not null**          |
| `subject_kind`   | `override_subject` | not null                  |
| `subject_id`     | uuid               | not null                  |
| `previous_value` | jsonb              | **not null**              |
| `new_value`      | jsonb              | **not null**              |
| `reason`         | text               | **not null**, length ≥ 10 |
| `created_at`     | timestamptz        | not null default now()    |

---

## Domain 8 — AI

### `ai_prompt_templates`

| Kolom                  | Tipe          | Constraint                          |
| ---------------------- | ------------- | ----------------------------------- |
| `organization_id`      | uuid          | FK, nullable                        |
| `function`             | `ai_function` | not null                            |
| `version`              | integer       | not null, unique bersama `function` |
| `system_prompt`        | text          | not null                            |
| `user_prompt_template` | text          | not null                            |
| `model`                | text          | not null                            |
| `parameters`           | jsonb         | not null default `'{}'`             |
| `is_active`            | boolean       | not null default false              |
| `created_by`           | uuid          | FK, not null                        |

Prompt disimpan **berversi** agar hasil penelitian dapat direproduksi. Tidak menyimpan API key (SEC butir 13 pada DATABASE.md; §13 no. 13).

### `ai_interactions` — **AO**

| Kolom                            | Tipe                    | Constraint                                                       |
| -------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| `student_id`                     | uuid                    | FK, not null                                                     |
| `activity_id`                    | uuid                    | FK, not null                                                     |
| `attempt_id`                     | uuid                    | FK, **not null** ← penegak attempt-first                         |
| `function`                       | `ai_function`           | not null                                                         |
| `prompt_template_id`             | uuid                    | FK, not null                                                     |
| `model`                          | text                    | not null                                                         |
| `purpose`                        | text                    | not null                                                         |
| `request_digest`                 | text                    | not null (ringkasan/hash, **bukan** salinan mentah data pribadi) |
| `input_tokens` / `output_tokens` | integer                 | nullable                                                         |
| `latency_ms`                     | integer                 | nullable                                                         |
| `status`                         | `ai_interaction_status` | not null                                                         |
| `error_code`                     | text                    | nullable                                                         |

Index `(student_id, created_at desc)`, `(activity_id)`.

### `ai_feedback`

| Kolom               | Tipe                | Constraint                                                                                         |
| ------------------- | ------------------- | -------------------------------------------------------------------------------------------------- |
| `ai_interaction_id` | uuid                | FK, not null                                                                                       |
| `kind`              | text                | not null, check ∈ (`guiding_question`,`strength`,`gap`,`counter_argument`,`hint`,`recommendation`) |
| `title`             | text                | not null                                                                                           |
| `body`              | text                | not null                                                                                           |
| `dimension`         | `ct_dimension`      | nullable                                                                                           |
| `student_action`    | `ai_student_action` | not null default `pending`                                                                         |
| `acted_at`          | timestamptz         | nullable                                                                                           |

Satu-satunya kolom yang boleh berubah adalah `student_action`/`acted_at` (Terima/Abaikan/Laporkan) — dibatasi policy `UPDATE` berkolom.

### `ai_citations`

| Kolom                 | Tipe    | Constraint             |
| --------------------- | ------- | ---------------------- |
| `ai_feedback_id`      | uuid    | FK, not null           |
| `source_id`           | uuid    | FK, nullable           |
| `source_version_id`   | uuid    | FK, nullable           |
| `source_chunk_id`     | uuid    | FK, nullable           |
| `quoted_text`         | text    | not null               |
| `is_traceable`        | boolean | **not null**           |
| `verified_by_student` | boolean | not null default false |

Check: bila `is_traceable = true` maka `source_version_id` wajib terisi. Kutipan yang tidak dapat ditelusuri **tetap disimpan** dengan `is_traceable = false` agar terlihat, bukan disembunyikan.

### `ai_incidents`

| Kolom             | Tipe              | Constraint              |
| ----------------- | ----------------- | ----------------------- |
| `reporter_id`     | uuid              | FK, not null            |
| `ai_feedback_id`  | uuid              | FK, not null            |
| `class_id`        | uuid              | FK, not null            |
| `reason`          | text              | not null, length ≥ 10   |
| `status`          | `incident_status` | not null default `open` |
| `handled_by`      | uuid              | FK, nullable            |
| `handled_at`      | timestamptz       | nullable                |
| `resolution_note` | text              | nullable                |

### `ai_disclosures` — **AO**

| Kolom            | Tipe            | Constraint              |
| ---------------- | --------------- | ----------------------- |
| `student_id`     | uuid            | FK, not null            |
| `activity_id`    | uuid            | FK, not null            |
| `attempt_id`     | uuid            | FK, nullable            |
| `revision_id`    | uuid            | FK, nullable            |
| `statement`      | text            | not null                |
| `functions_used` | `ai_function[]` | not null default `'{}'` |

Pernyataan mahasiswa tentang bantuan AI yang dipakai — bagian dari integritas akademik.

---

## Domain 9 — Assessment & Analytics

### `assessments`

| Kolom                    | Tipe              | Constraint          |
| ------------------------ | ----------------- | ------------------- |
| `class_id`               | uuid              | FK, not null        |
| `activity_id`            | uuid              | FK, nullable        |
| `title`                  | text              | not null            |
| `assessment_type`        | `assessment_type` | not null            |
| `rubric_id`              | uuid              | FK, nullable        |
| `max_score`              | numeric(5,2)      | not null, check > 0 |
| `weight`                 | numeric(5,2)      | not null default 0  |
| `opens_at` / `closes_at` | timestamptz       | nullable            |
| `created_by`             | uuid              | FK, not null        |

### `assessment_scores`

| Kolom             | Tipe         | Constraint                  |
| ----------------- | ------------ | --------------------------- |
| `assessment_id`   | uuid         | FK, not null                |
| `student_id`      | uuid         | FK, not null                |
| `scored_by`       | uuid         | FK → profiles, **not null** |
| `score`           | numeric(5,2) | not null, check ≥ 0         |
| `criteria_scores` | jsonb        | not null default `'{}'`     |
| `comment`         | text         | nullable                    |
| `scored_at`       | timestamptz  | not null default now()      |
| `is_final`        | boolean      | not null default false      |

Unique `(assessment_id, student_id)`. Perubahan nilai wajib melalui `lecturer_overrides` sehingga riwayat lama tidak hilang.

### `critical_thinking_scores`

| Kolom                | Tipe           | Constraint                                        |
| -------------------- | -------------- | ------------------------------------------------- |
| `student_id`         | uuid           | FK, not null                                      |
| `class_id`           | uuid           | FK, not null                                      |
| `dimension`          | `ct_dimension` | not null                                          |
| `score`              | numeric(5,2)   | not null, check 0–100                             |
| `measurement_source` | text           | not null, check ∈ (`rubric`,`pretest`,`posttest`) |
| `assessment_id`      | uuid           | FK, nullable                                      |
| `measured_at`        | timestamptz    | not null default now()                            |

Selalu terikat waktu dan sumber pengukuran — bukan label permanen (§13 no. 14).

### `learning_events` — **AO**

| Kolom         | Tipe        | Constraint              |
| ------------- | ----------- | ----------------------- |
| `student_id`  | uuid        | FK, not null            |
| `class_id`    | uuid        | FK, not null            |
| `activity_id` | uuid        | FK, nullable            |
| `event_type`  | text        | not null                |
| `payload`     | jsonb       | not null default `'{}'` |
| `occurred_at` | timestamptz | not null default now()  |

Index `(class_id, occurred_at desc)`, `(student_id, occurred_at desc)`. Retensi diatur DB-05.

### `fidelity_records` — keterlaksanaan desain pembelajaran

| Kolom              | Tipe    | Constraint   |
| ------------------ | ------- | ------------ |
| `class_id`         | uuid    | FK, not null |
| `checklist_key`    | text    | not null     |
| `observed_by`      | uuid    | FK, not null |
| `observation_date` | date    | not null     |
| `is_implemented`   | boolean | not null     |
| `note`             | text    | nullable     |

Kebutuhan penelitian (PHASE 14): mengukur apakah model pembelajaran benar-benar dijalankan.

---

## Domain 10 — Governance

### `consent_records`

| Kolom              | Tipe             | Constraint   |
| ------------------ | ---------------- | ------------ |
| `profile_id`       | uuid             | FK, not null |
| `study_key`        | text             | not null     |
| `status`           | `consent_status` | not null     |
| `document_version` | text             | not null     |
| `consented_at`     | timestamptz      | nullable     |
| `withdrawn_at`     | timestamptz      | nullable     |

Unique `(profile_id, study_key)`. Check: `status='granted'` ⇒ `consented_at` terisi; `status='withdrawn'` ⇒ `withdrawn_at` terisi.

### `data_retention_rules`

| Kolom             | Tipe               | Constraint                        |
| ----------------- | ------------------ | --------------------------------- |
| `organization_id` | uuid               | FK, not null                      |
| `domain_key`      | text               | not null (mis. `learning_events`) |
| `retention_days`  | integer            | not null, check > 0               |
| `action`          | `retention_action` | not null                          |
| `is_active`       | boolean            | not null default true             |

### `audit_logs` — **AO**

| Kolom             | Tipe       | Constraint                          |
| ----------------- | ---------- | ----------------------------------- |
| `actor_id`        | uuid       | FK, nullable (null = proses sistem) |
| `actor_role`      | `role_key` | nullable                            |
| `action`          | text       | not null                            |
| `subject_table`   | text       | not null                            |
| `subject_id`      | uuid       | nullable                            |
| `before`          | jsonb      | nullable                            |
| `after`           | jsonb      | nullable                            |
| `ip_hash`         | text       | nullable                            |
| `user_agent_hash` | text       | nullable                            |

**Tidak pernah** menyimpan password, token, atau API key (SEC butir 14). Alamat IP disimpan dalam bentuk hash.

### `notifications`

| Kolom          | Tipe        | Constraint   |
| -------------- | ----------- | ------------ |
| `recipient_id` | uuid        | FK, not null |
| `kind`         | text        | not null     |
| `title`        | text        | not null     |
| `body`         | text        | not null     |
| `link_path`    | text        | nullable     |
| `read_at`      | timestamptz | nullable     |

---

## Schema `research`

### `research.participants`

| Kolom               | Tipe        | Constraint                          |
| ------------------- | ----------- | ----------------------------------- |
| `profile_id`        | uuid        | FK → profiles, not null, **unique** |
| `pseudonym`         | text        | not null, **unique**                |
| `consent_record_id` | uuid        | FK → consent_records, not null      |
| `enrolled_at`       | timestamptz | not null default now()              |

**Satu-satunya** tempat pemetaan identitas ↔ pseudonim. Tidak terbaca oleh admin biasa.

### Views export (contoh)

| View                         | Isi                                                              | Yang **tidak** disertakan     |
| ---------------------------- | ---------------------------------------------------------------- | ----------------------------- |
| `research.v_attempt_metrics` | pseudonym, activity, jumlah revisi, selisih waktu attempt→revisi | nama, NIM, isi jawaban mentah |
| `research.v_ct_scores`       | pseudonym, dimensi, skor, waktu ukur                             | identitas                     |
| `research.v_ai_usage`        | pseudonym, fungsi AI, jumlah, tingkat penerimaan saran           | isi prompt                    |

Seluruh view memfilter `consent_status = 'granted'`, sehingga pencabutan consent langsung berlaku.
