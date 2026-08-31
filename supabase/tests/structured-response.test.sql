-- Test struktur argumen CER (migration 0020).
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create or replace function pg_temp.make_user(p_id uuid, p_email text)
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, '', now(), now(), now()
  );
end;
$$;

create or replace function pg_temp.act_as_service()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ' || quote_literal('{}');
end;
$$;

-- === Fixture ================================================================

select pg_temp.make_user('b1111111-1111-1111-1111-111111111111', 'cer.student@test.invalid');
select pg_temp.make_user('b3333333-3333-3333-3333-333333333333', 'cer.lecturer@test.invalid');
select pg_temp.make_user('b5555555-5555-5555-5555-555555555555', 'cer.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('b0000000-0000-0000-0000-000000000001', 'Universitas CER Uji', 'UCU');

insert into public.faculties (id, organization_id, name, code)
values ('b0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Fakultas CER', 'FC');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('b0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'Prodi CER', 'PC', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('b1111111-1111-1111-1111-111111111111', 'b0000000-0000-0000-0000-000000000001', 'Mahasiswa CER', 'C-1001'),
  ('b3333333-3333-3333-3333-333333333333', 'b0000000-0000-0000-0000-000000000001', 'Dosen CER', 'C-2001'),
  ('b5555555-5555-5555-5555-555555555555', 'b0000000-0000-0000-0000-000000000001', 'Admin CER', 'C-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'b0000000-0000-0000-0000-000000000001', 'b5555555-5555-5555-5555-555555555555'
from (values
  ('b1111111-1111-1111-1111-111111111111'::uuid, 'student'::public.role_key),
  ('b3333333-3333-3333-3333-333333333333'::uuid, 'lecturer'::public.role_key),
  ('b5555555-5555-5555-5555-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('b0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Ganjil CER', 'GCU', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('b0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'PKN-CER', 'PKn CER', 2, 'b5555555-5555-5555-5555-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('b0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000004', 'CA', 'Kelas CER', 'published', 'b5555555-5555-5555-5555-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('b0000000-0000-0000-0000-000000000006', 'b3333333-3333-3333-3333-333333333333', 'b5555555-5555-5555-5555-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('b0000000-0000-0000-0000-000000000006', 'b1111111-1111-1111-1111-111111111111', 'b5555555-5555-5555-5555-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('b0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000006', 'Modul CER', 1, 'published', 'b3333333-3333-3333-3333-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('b0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000010', 'Unit CER', 'Tujuan unit CER.', 1, 'published', 'b3333333-3333-3333-3333-333333333333');

-- Aktivitas argumentatif pada tahap Eksplanasi.
insert into public.activities (id, learning_stage_id, title, prompt, activity_type, response_schema, sequence, status, created_by)
select 'b0000000-0000-0000-0000-000000000020', ls.id, 'Argumen Akhir', 'Susun posisi Anda.', 'written_response', 'cer', 1, 'published', 'b3333333-3333-3333-3333-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'b0000000-0000-0000-0000-000000000011' and ls.stage_key = 'explanation';

-- Aktivitas naratif biasa pada tahap Interpretasi.
insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select 'b0000000-0000-0000-0000-000000000021', ls.id, 'Interpretasi Awal', 'Rumuskan masalahnya.', 'written_response', 1, 'published', 'b3333333-3333-3333-3333-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'b0000000-0000-0000-0000-000000000011' and ls.stage_key = 'interpretation';

select pg_temp.act_as_service();

insert into public.attempts (id, activity_id, student_id, attempt_number, content, content_hash) values
  ('b0000000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000020',
   'b1111111-1111-1111-1111-111111111111', 1, 'Narasi argumen lengkap mahasiswa.', 'hash-cer-001'),
  ('b0000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000021',
   'b1111111-1111-1111-1111-111111111111', 1, 'Narasi interpretasi mahasiswa.', 'hash-cer-002');

insert into public.attempts (id, activity_id, student_id, attempt_number, is_baseline, content, content_hash)
values ('b0000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000020',
        'b1111111-1111-1111-1111-111111111111', 2, false, 'Narasi argumen kedua.', 'hash-cer-003');

-- === Skenario ===============================================================

-- 1. Kolom baru tidak mengubah aktivitas lama.
select is(
  (select response_schema from public.activities
    where id = 'b0000000-0000-0000-0000-000000000021'),
  'free_text',
  'Aktivitas tanpa penetapan tetap bernilai free_text'
);

-- 2. Unsur CER yang sah diterima.
insert into public.attempt_answers (attempt_id, question_key, content, sequence) values
  ('b0000000-0000-0000-0000-000000000030', 'claim', 'Konsultasi publik itu belum bermakna.', 1),
  ('b0000000-0000-0000-0000-000000000030', 'evidence', 'Hanya 24 dari 12.000 warga hadir.', 2),
  ('b0000000-0000-0000-0000-000000000030', 'reasoning', 'Kehadiran setipis itu tidak representatif.', 3);

select is(
  (select count(*)::int from public.attempt_answers
    where attempt_id = 'b0000000-0000-0000-0000-000000000030'),
  3,
  'Tiga unsur CER tersimpan'
);

-- 3. Kunci di luar kosakata CER ditolak.
select throws_ok(
  $$insert into public.attempt_answers (attempt_id, question_key, content, sequence)
    values ('b0000000-0000-0000-0000-000000000030', 'kesimpulan', 'Isi apa saja.', 4)$$,
  '23001',
  null,
  'Unsur argumen di luar kosakata CER ditolak'
);

-- 4. Aktivitas naratif tidak menerima jawaban terstruktur.
select throws_ok(
  $$insert into public.attempt_answers (attempt_id, question_key, content, sequence)
    values ('b0000000-0000-0000-0000-000000000031', 'claim', 'Isi apa saja.', 1)$$,
  '23001',
  null,
  'Aktivitas free_text menolak jawaban terstruktur'
);

-- 5. Unsur yang sama tidak boleh berganda pada satu attempt.
select throws_ok(
  $$insert into public.attempt_answers (attempt_id, question_key, content, sequence)
    values ('b0000000-0000-0000-0000-000000000030', 'claim', 'Klaim kedua.', 5)$$,
  '23505',
  null,
  'Unsur argumen berganda pada attempt yang sama ditolak'
);

-- 6. Narasi kanonik attempt tidak terpengaruh dekomposisi.
select is(
  (select content from public.attempts
    where id = 'b0000000-0000-0000-0000-000000000030'),
  'Narasi argumen lengkap mahasiswa.',
  'attempts.content tetap menjadi narasi kanonik'
);

-- === Dekomposisi pada revisi ================================================

insert into public.revisions (id, attempt_id, student_id, revision_number, content)
values ('b0000000-0000-0000-0000-000000000040', 'b0000000-0000-0000-0000-000000000030',
        'b1111111-1111-1111-1111-111111111111', 1, 'Narasi argumen setelah revisi.');

-- 7. Unsur yang sama boleh muncul lagi sebagai bagian revisi.
insert into public.attempt_answers (attempt_id, revision_id, question_key, content, sequence)
values ('b0000000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000040',
        'claim', 'Klaim yang sudah dipersempit.', 1);

select is(
  (select count(*)::int from public.attempt_answers
    where attempt_id = 'b0000000-0000-0000-0000-000000000030'
      and question_key = 'claim'),
  2,
  'Unsur yang sama boleh diulang untuk revisi'
);

-- 8. Dekomposisi revisi tidak dapat ditempel ke attempt lain.
--    Attempt tujuan sengaja memakai aktivitas CER juga, supaya yang teruji
--    benar-benar foreign key gabungan dan bukan trigger kosakata.
select throws_ok(
  $$insert into public.attempt_answers (attempt_id, revision_id, question_key, content, sequence)
    values ('b0000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000040',
            'claim', 'Klaim nyasar.', 1)$$,
  '23503',
  null,
  'Revisi tidak dapat ditautkan ke attempt yang berbeda'
);

-- 9. Jawaban terstruktur tetap append-only.
select throws_ok(
  $$update public.attempt_answers set content = 'Diubah diam-diam.'
    where attempt_id = 'b0000000-0000-0000-0000-000000000030'
      and question_key = 'evidence'$$,
  '23001',
  null,
  'Jawaban terstruktur tidak dapat diubah'
);

-- === Snapshot versi =========================================================

-- 10. Snapshot merekam response_schema tiap aktivitas.
select is(
  (select s.snapshot -> 'stages' -> 0 -> 'activities' -> 0 ->> 'response_schema'
     from (select public.build_unit_snapshot('b0000000-0000-0000-0000-000000000011') as snapshot) s
    where s.snapshot -> 'stages' -> 0 -> 'activities' -> 0 ->> 'id'
          = 'b0000000-0000-0000-0000-000000000021'),
  'free_text',
  'Snapshot merekam response_schema aktivitas naratif'
);

-- 11. Versi baru memakai schema_version 2.
insert into public.learning_unit_versions (
  id, learning_unit_id, version_number, snapshot_jsonb, content_hash, status, published_at, created_by
)
select 'b0000000-0000-0000-0000-000000000050', 'b0000000-0000-0000-0000-000000000011', 1,
       s.snapshot, public.unit_snapshot_hash(s.snapshot), 'published', now(),
       'b3333333-3333-3333-3333-333333333333'
from (select public.build_unit_snapshot('b0000000-0000-0000-0000-000000000011') as snapshot) s;

select is(
  (select schema_version from public.learning_unit_versions
    where id = 'b0000000-0000-0000-0000-000000000050'),
  2,
  'Snapshot baru dicatat sebagai schema_version 2'
);

select * from finish();
rollback;
