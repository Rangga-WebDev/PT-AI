-- Test RLS dan integritas pedagogis — 18 skenario dari docs/RLS_MATRIX.md bagian 14.
--
-- Menjalankan:
--   npx supabase test db --db-url "<connection string>"
-- Seluruh isi berjalan dalam satu transaksi dan di-rollback di akhir.

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- === Fixture ================================================================

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

-- Menyamar sebagai pengguna tertentu agar policy RLS ikut dievaluasi.
create or replace function pg_temp.act_as(p_id uuid)
returns void
language plpgsql
as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L', json_build_object('sub', p_id, 'role', 'authenticated')::text);
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

-- Identitas uji
select pg_temp.make_user('11111111-1111-1111-1111-111111111111', 'student.a@test.invalid');
select pg_temp.make_user('22222222-2222-2222-2222-222222222222', 'student.b@test.invalid');
select pg_temp.make_user('33333333-3333-3333-3333-333333333333', 'lecturer.own@test.invalid');
select pg_temp.make_user('44444444-4444-4444-4444-444444444444', 'lecturer.other@test.invalid');
select pg_temp.make_user('55555555-5555-5555-5555-555555555555', 'admin@test.invalid');

insert into public.organizations (id, name, code)
values ('a0000000-0000-0000-0000-000000000001', 'Universitas Uji', 'UJI');

insert into public.faculties (id, organization_id, name, code)
values ('a0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Fakultas Uji', 'FU');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Prodi Uji', 'PU', 's1');

insert into public.profiles (id, organization_id, study_program_id, full_name, identifier) values
  ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Mahasiswa A', '1001'),
  ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Mahasiswa B', '1002'),
  ('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000001', null, 'Dosen Pengampu', '2001'),
  ('44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000001', null, 'Dosen Lain', '2002'),
  ('55555555-5555-5555-5555-555555555555', 'a0000000-0000-0000-0000-000000000001', null, 'Administrator', '3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'a0000000-0000-0000-0000-000000000001', '55555555-5555-5555-5555-555555555555'
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'student'::public.role_key),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'student'::public.role_key),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'lecturer'::public.role_key),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'lecturer'::public.role_key),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('a0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Ganjil Uji', 'GJ', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'PKN-UJI', 'PKn Uji', 2, '55555555-5555-5555-5555-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('a0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'A', 'Kelas Uji A', 'published', '55555555-5555-5555-5555-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by)
values ('a0000000-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('a0000000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '55555555-5555-5555-5555-555555555555'),
  ('a0000000-0000-0000-0000-000000000006', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000006', 'Modul Uji', 1, 'published', '33333333-3333-3333-3333-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('a0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000007', 'Unit Uji', 'Tujuan uji', 1, 'published', '33333333-3333-3333-3333-333333333333');

-- Unit kedua tetap draft untuk menguji kebocoran konten belum terbit.
insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('a0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000007', 'Unit Draft', 'Tujuan draft', 2, 'draft', '33333333-3333-3333-3333-333333333333');

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, allows_ai, allowed_ai_functions, created_by)
select
  'a0000000-0000-0000-0000-00000000000a',
  ls.id,
  'Aktivitas Uji',
  'Pertanyaan uji',
  'written_response',
  1,
  'published',
  true,
  array['hint']::public.ai_function[],
  '33333333-3333-3333-3333-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'a0000000-0000-0000-0000-000000000008' and ls.stage_key = 'evaluation';

insert into public.activity_instructions (activity_id, audience, content, sequence) values
  ('a0000000-0000-0000-0000-00000000000a', 'student', 'Instruksi untuk mahasiswa.', 1),
  ('a0000000-0000-0000-0000-00000000000a', 'lecturer', 'Catatan pedagogis dosen.', 1);

insert into public.attempts (id, activity_id, student_id, attempt_number, content, content_hash) values
  ('a0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 1, 'Jawaban mahasiswa A', 'hash-a'),
  ('a0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-00000000000a', '22222222-2222-2222-2222-222222222222', 1, 'Jawaban mahasiswa B', 'hash-b');

insert into public.branching_decisions (student_id, activity_id, action, reason, decided_by)
values ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'remedial', 'Klaim belum ditautkan ke bukti yang diperiksa.', 'system');

insert into public.assessments (id, class_id, title, assessment_type, max_score, created_by)
values ('a0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000006', 'UTS Uji', 'summative', 100, '33333333-3333-3333-3333-333333333333');

insert into public.assessment_scores (assessment_id, student_id, scored_by, score, is_final)
values ('a0000000-0000-0000-0000-00000000000d', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 80, true);

insert into public.consent_records (profile_id, study_key, status, document_version, consented_at)
values ('11111111-1111-1111-1111-111111111111', 'ptai-2026', 'granted', 'v1', now());

-- === Skenario ===============================================================

-- 1. Mahasiswa tidak dapat membaca attempt mahasiswa lain.
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
select is(
  (select count(*)::int from public.attempts where student_id = '22222222-2222-2222-2222-222222222222'),
  0,
  'Mahasiswa A tidak dapat membaca attempt mahasiswa B'
);

-- 2. Tanpa policy UPDATE, perintah mahasiswa mengenai nol baris sehingga tidak
--    melempar error; yang dijamin adalah isi baseline tetap utuh.
update public.attempts set content = 'diubah mahasiswa'
where id = 'a0000000-0000-0000-0000-00000000000b';

select is(
  (select content from public.attempts where id = 'a0000000-0000-0000-0000-00000000000b'),
  'Jawaban mahasiswa A',
  'Baseline attempt tidak berubah meskipun mahasiswa menjalankan UPDATE'
);

-- 3. Bahkan koneksi tanpa RLS pun ditolak trigger append-only.
select pg_temp.act_as_service();
select throws_ok(
  $$update public.attempts set content = 'diubah service' where id = 'a0000000-0000-0000-0000-00000000000b'$$,
  '23001',
  null,
  'Koneksi service tetap tidak dapat mengubah baseline attempt'
);

-- 4. Revisi tanpa baseline attempt ditolak.
select throws_ok(
  $$insert into public.revisions (attempt_id, student_id, revision_number, content)
    values (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 1, 'Revisi tanpa attempt')$$,
  '23001',
  null,
  'Revisi tanpa attempt yang sah ditolak'
);

-- 5. Dosen lain tidak dapat membaca attempt kelas yang tidak diampunya.
select pg_temp.act_as('44444444-4444-4444-4444-444444444444');
select is(
  (select count(*)::int from public.attempts),
  0,
  'Dosen non-pengampu tidak dapat membaca attempt kelas tersebut'
);

-- 6. Dosen lain tidak dapat menulis nilai di kelas yang tidak diampunya.
select throws_ok(
  $$insert into public.assessment_scores (assessment_id, student_id, scored_by, score)
    values ('a0000000-0000-0000-0000-00000000000d', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 90)$$,
  '42501',
  null,
  'Dosen non-pengampu tidak dapat memberi nilai'
);

-- 7. Admin tidak dapat membaca nilai.
select pg_temp.act_as('55555555-5555-5555-5555-555555555555');
select is(
  (select count(*)::int from public.assessment_scores),
  0,
  'Administrator tidak dapat membaca nilai mahasiswa'
);

-- 8. Admin tidak dapat menulis hasil ketuntasan.
select throws_ok(
  $$insert into public.mastery_results (activity_id, student_id, evaluator_kind, evaluator_id, outcome)
    values ('a0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'lecturer', '55555555-5555-5555-5555-555555555555', 'met')$$,
  '42501',
  null,
  'Administrator tidak dapat menulis hasil ketuntasan'
);

-- 9. Keputusan branching tanpa alasan ditolak.
select pg_temp.act_as_service();
select throws_ok(
  $$insert into public.branching_decisions (student_id, activity_id, action, reason, decided_by)
    values ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', 'remedial', '   ', 'system')$$,
  '23514',
  null,
  'Keputusan branching tanpa alasan ditolak'
);

-- 10. Override tanpa nilai sebelumnya ditolak.
select throws_ok(
  $$insert into public.lecturer_overrides (lecturer_id, subject_kind, subject_id, previous_value, new_value, reason)
    values ('33333333-3333-3333-3333-333333333333', 'mastery_result', gen_random_uuid(), null, '{}'::jsonb, 'Alasan override yang memadai')$$,
  '23502',
  null,
  'Override tanpa nilai lama ditolak'
);

-- 11. Interaksi AI tanpa attempt ditolak (attempt-first).
select throws_ok(
  $$insert into public.ai_interactions
      (student_id, activity_id, attempt_id, function, prompt_template_id, model, purpose, request_digest, status)
    values ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-00000000000a', null,
            'hint', gen_random_uuid(), 'model-uji', 'uji', 'digest', 'success')$$,
  '23001',
  null,
  'Interaksi AI tanpa attempt ditolak'
);

-- 12. Mahasiswa dapat membaca keputusan branching yang dikenakan padanya.
select pg_temp.act_as('11111111-1111-1111-1111-111111111111');
select isnt(
  (select count(*)::int from public.branching_decisions where student_id = '11111111-1111-1111-1111-111111111111'),
  0,
  'Mahasiswa dapat membaca keputusan branching miliknya (transparansi)'
);

-- 13. Mahasiswa tidak dapat membaca konten yang masih draft.
select is(
  (select count(*)::int from public.learning_units where id = 'a0000000-0000-0000-0000-000000000009'),
  0,
  'Mahasiswa tidak dapat membaca unit berstatus draft'
);

-- 14. Mahasiswa tidak dapat membaca instruksi beraudiens dosen.
select is(
  (select count(*)::int from public.activity_instructions where audience = 'lecturer'),
  0,
  'Mahasiswa tidak dapat membaca catatan pedagogis dosen'
);

-- 15. Dosen tidak dapat membaca consent penelitian.
select pg_temp.act_as('33333333-3333-3333-3333-333333333333');
select is(
  (select count(*)::int from public.consent_records),
  0,
  'Dosen tidak dapat membaca kesediaan penelitian mahasiswa'
);

-- 16. Refleksi dengan kolom kosong ditolak.
select pg_temp.act_as_service();
select throws_ok(
  $$insert into public.reflections (
      activity_id, student_id, attempt_id, initial_summary, feedback_summary,
      verified_sources_summary, final_summary, change_reason, ai_accepted,
      ai_rejected, bias_found, next_strategy
    ) values (
      'a0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
      'a0000000-0000-0000-0000-00000000000b', 'cukup panjang', '', 'cukup panjang',
      'cukup panjang', 'cukup panjang', 'cukup panjang', 'cukup panjang',
      'cukup panjang', 'cukup panjang'
    )$$,
  '23514',
  null,
  'Refleksi dengan unsur wajib kosong ditolak'
);

-- 17. Dua baseline attempt untuk pasangan yang sama ditolak.
select throws_ok(
  $$insert into public.attempts (activity_id, student_id, attempt_number, content, content_hash)
    values ('a0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 2, 'Baseline kedua', 'hash-c')$$,
  '23505',
  null,
  'Baseline kedua untuk aktivitas yang sama ditolak'
);

-- 18. Seluruh tabel publik mengaktifkan RLS.
select is(
  (
    select count(*)::int
    from pg_tables t
    join pg_class c on c.relname = t.tablename
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = t.schemaname
    where t.schemaname = 'public' and c.relrowsecurity = false
  ),
  0,
  'Tidak ada tabel public tanpa Row Level Security'
);

select * from finish();

rollback;
