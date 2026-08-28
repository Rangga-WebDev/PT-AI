-- Test batas peran AI (PHASE 10).
-- Menegakkan LOCK-PED-004, LOCK-PED-005, dan LOCK-PED-010 di tingkat database.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

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

-- === Fixture ================================================================

select pg_temp.make_user('a1111111-bbbb-4bbb-8bbb-111111111111', 'ai.student.a@test.invalid');
select pg_temp.make_user('a2222222-bbbb-4bbb-8bbb-222222222222', 'ai.student.b@test.invalid');
select pg_temp.make_user('a3333333-bbbb-4bbb-8bbb-333333333333', 'ai.lecturer@test.invalid');
select pg_temp.make_user('a5555555-bbbb-4bbb-8bbb-555555555555', 'ai.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('b9000000-0000-4000-8000-000000000001', 'Universitas AI', 'UAI');

insert into public.faculties (id, organization_id, name, code)
values ('b9000000-0000-4000-8000-000000000002', 'b9000000-0000-4000-8000-000000000001', 'Fakultas AI', 'FAI');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('b9000000-0000-4000-8000-000000000003', 'b9000000-0000-4000-8000-000000000002', 'Prodi AI', 'PAI', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('a1111111-bbbb-4bbb-8bbb-111111111111', 'b9000000-0000-4000-8000-000000000001', 'Mahasiswa A', 'AI-1001'),
  ('a2222222-bbbb-4bbb-8bbb-222222222222', 'b9000000-0000-4000-8000-000000000001', 'Mahasiswa B', 'AI-1002'),
  ('a3333333-bbbb-4bbb-8bbb-333333333333', 'b9000000-0000-4000-8000-000000000001', 'Dosen AI', 'AI-2001'),
  ('a5555555-bbbb-4bbb-8bbb-555555555555', 'b9000000-0000-4000-8000-000000000001', 'Admin AI', 'AI-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'b9000000-0000-4000-8000-000000000001', 'a5555555-bbbb-4bbb-8bbb-555555555555'
from (values
  ('a1111111-bbbb-4bbb-8bbb-111111111111'::uuid, 'student'::public.role_key),
  ('a2222222-bbbb-4bbb-8bbb-222222222222'::uuid, 'student'::public.role_key),
  ('a3333333-bbbb-4bbb-8bbb-333333333333'::uuid, 'lecturer'::public.role_key),
  ('a5555555-bbbb-4bbb-8bbb-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('b9000000-0000-4000-8000-000000000004', 'b9000000-0000-4000-8000-000000000001', 'Ganjil AI', 'GAI', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('b9000000-0000-4000-8000-000000000005', 'b9000000-0000-4000-8000-000000000001', 'b9000000-0000-4000-8000-000000000003', 'PKN-AI', 'PKn AI', 2, 'a5555555-bbbb-4bbb-8bbb-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('b9000000-0000-4000-8000-000000000006', 'b9000000-0000-4000-8000-000000000005', 'b9000000-0000-4000-8000-000000000004', 'AI', 'Kelas AI', 'published', 'a5555555-bbbb-4bbb-8bbb-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('b9000000-0000-4000-8000-000000000006', 'a3333333-bbbb-4bbb-8bbb-333333333333', 'a5555555-bbbb-4bbb-8bbb-555555555555');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('b9000000-0000-4000-8000-000000000006', 'a1111111-bbbb-4bbb-8bbb-111111111111', 'a5555555-bbbb-4bbb-8bbb-555555555555'),
  ('b9000000-0000-4000-8000-000000000006', 'a2222222-bbbb-4bbb-8bbb-222222222222', 'a5555555-bbbb-4bbb-8bbb-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('b9000000-0000-4000-8000-000000000010', 'b9000000-0000-4000-8000-000000000006', 'Modul AI', 1, 'published', 'a3333333-bbbb-4bbb-8bbb-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('b9000000-0000-4000-8000-000000000011', 'b9000000-0000-4000-8000-000000000010', 'Unit AI', 'Tujuan unit AI.', 1, 'published', 'a3333333-bbbb-4bbb-8bbb-333333333333');

-- Aktivitas A mengizinkan AI terbatas; aktivitas B tidak mengizinkan sama sekali.
insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, allows_ai, allowed_ai_functions, created_by)
select 'b9000000-0000-4000-8000-000000000020', ls.id, 'Aktivitas Ber-AI', 'Prompt.', 'written_response', 1, 'published', true, array['guiding_questions']::public.ai_function[], 'a3333333-bbbb-4bbb-8bbb-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'b9000000-0000-4000-8000-000000000011' and ls.stage_key = 'interpretation';

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, allows_ai, created_by)
select 'b9000000-0000-4000-8000-000000000021', ls.id, 'Aktivitas Tanpa AI', 'Prompt.', 'written_response', 2, 'published', false, 'a3333333-bbbb-4bbb-8bbb-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = 'b9000000-0000-4000-8000-000000000011' and ls.stage_key = 'interpretation';

insert into public.ai_prompt_templates (id, function, version, system_prompt, user_prompt_template, model, is_active, created_by)
values ('b9000000-0000-4000-8000-000000000030', 'guiding_questions', 99, 'Sistem uji.', 'Template uji.', 'model-uji', true, 'a5555555-bbbb-4bbb-8bbb-555555555555');

insert into public.attempts (id, activity_id, student_id, attempt_number, is_baseline, content, content_hash)
values ('b9000000-0000-4000-8000-000000000040', 'b9000000-0000-4000-8000-000000000020', 'a1111111-bbbb-4bbb-8bbb-111111111111', 1, true, 'Respons awal mahasiswa A.', 'hash-ai');

-- === Skenario ===============================================================

-- 1. Interaksi AI tanpa attempt milik mahasiswa ditolak (attempt-first).
select pg_temp.act_as_service();
select throws_ok(
  $$insert into public.ai_interactions (student_id, activity_id, attempt_id, function, prompt_template_id, model, purpose, request_digest, status)
    values ('a2222222-bbbb-4bbb-8bbb-222222222222', 'b9000000-0000-4000-8000-000000000020',
            'b9000000-0000-4000-8000-000000000040', 'guiding_questions',
            'b9000000-0000-4000-8000-000000000030', 'model-uji', 'uji', 'digest', 'success')$$,
  '23001',
  null,
  'Interaksi AI dengan attempt milik mahasiswa lain ditolak'
);

-- 2. Fungsi AI di luar izin dosen ditolak.
select throws_ok(
  $$insert into public.ai_interactions (student_id, activity_id, attempt_id, function, prompt_template_id, model, purpose, request_digest, status)
    values ('a1111111-bbbb-4bbb-8bbb-111111111111', 'b9000000-0000-4000-8000-000000000020',
            'b9000000-0000-4000-8000-000000000040', 'counter_argument',
            'b9000000-0000-4000-8000-000000000030', 'model-uji', 'uji', 'digest', 'success')$$,
  '23001',
  null,
  'Fungsi AI yang tidak diizinkan dosen ditolak'
);

-- 3. Aktivitas yang mematikan AI menolak interaksi apa pun.
insert into public.attempts (id, activity_id, student_id, attempt_number, is_baseline, content, content_hash)
values ('b9000000-0000-4000-8000-000000000041', 'b9000000-0000-4000-8000-000000000021', 'a1111111-bbbb-4bbb-8bbb-111111111111', 1, true, 'Respons pada aktivitas tanpa AI.', 'hash-ai-2');

select throws_ok(
  $$insert into public.ai_interactions (student_id, activity_id, attempt_id, function, prompt_template_id, model, purpose, request_digest, status)
    values ('a1111111-bbbb-4bbb-8bbb-111111111111', 'b9000000-0000-4000-8000-000000000021',
            'b9000000-0000-4000-8000-000000000041', 'guiding_questions',
            'b9000000-0000-4000-8000-000000000030', 'model-uji', 'uji', 'digest', 'success')$$,
  '23001',
  null,
  'Aktivitas tanpa izin AI menolak interaksi'
);

-- 4. Interaksi yang sah diterima.
select lives_ok(
  $$insert into public.ai_interactions (id, student_id, activity_id, attempt_id, function, prompt_template_id, model, purpose, request_digest, status)
    values ('b9000000-0000-4000-8000-000000000050', 'a1111111-bbbb-4bbb-8bbb-111111111111',
            'b9000000-0000-4000-8000-000000000020', 'b9000000-0000-4000-8000-000000000040',
            'guiding_questions', 'b9000000-0000-4000-8000-000000000030', 'model-uji', 'uji', 'digest-sah', 'success')$$,
  'Interaksi AI yang memenuhi seluruh syarat diterima'
);

-- 5. Interaksi AI bersifat append-only.
select throws_ok(
  $$update public.ai_interactions set purpose = 'diubah'
    where id = 'b9000000-0000-4000-8000-000000000050'$$,
  '23001',
  null,
  'Jejak interaksi AI tidak dapat diubah'
);

insert into public.ai_feedback (id, ai_interaction_id, kind, title, body)
values ('b9000000-0000-4000-8000-000000000060', 'b9000000-0000-4000-8000-000000000050', 'guiding_question', 'Judul uji', 'Isi umpan balik uji.');

-- 6. Kutipan tidak terlacak wajib tanpa source_version_id.
select throws_ok(
  $$insert into public.ai_citations (ai_feedback_id, quoted_text, is_traceable)
    values ('b9000000-0000-4000-8000-000000000060', 'Kutipan hantu.', true)$$,
  '23514',
  null,
  'Kutipan berlabel terlacak tanpa versi sumber ditolak'
);

-- 7. Kutipan yang jujur menandai dirinya tidak terlacak diterima.
select lives_ok(
  $$insert into public.ai_citations (ai_feedback_id, quoted_text, is_traceable)
    values ('b9000000-0000-4000-8000-000000000060', 'Kutipan di luar source pack.', false)$$,
  'Kutipan tidak terlacak tetap disimpan, bukan disembunyikan'
);

-- 8. Mahasiswa membaca umpan balik miliknya sendiri.
select pg_temp.act_as('a1111111-bbbb-4bbb-8bbb-111111111111');
select is(
  (select count(*)::int from public.ai_feedback where id = 'b9000000-0000-4000-8000-000000000060'),
  1,
  'Mahasiswa membaca umpan balik AI miliknya'
);

-- 9. Mahasiswa lain tidak membaca umpan balik itu.
select pg_temp.act_as('a2222222-bbbb-4bbb-8bbb-222222222222');
select is(
  (select count(*)::int from public.ai_feedback where id = 'b9000000-0000-4000-8000-000000000060'),
  0,
  'Umpan balik AI mahasiswa lain tidak terbaca'
);

-- 10. Mahasiswa tidak dapat menulis umpan balik AI sendiri.
select throws_ok(
  $$insert into public.ai_feedback (ai_interaction_id, kind, title, body)
    values ('b9000000-0000-4000-8000-000000000050', 'hint', 'Palsu', 'Umpan balik buatan mahasiswa.')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat menyisipkan umpan balik AI'
);

-- 11. Dosen pengampu membaca interaksi AI kelasnya.
select pg_temp.act_as('a3333333-bbbb-4bbb-8bbb-333333333333');
select is(
  (select count(*)::int from public.ai_interactions where id = 'b9000000-0000-4000-8000-000000000050'),
  1,
  'Dosen pengampu membaca jejak interaksi AI kelasnya'
);

-- 12. Potongan sumber tetap tertutup bagi mahasiswa (batas RAG).
select pg_temp.act_as('a1111111-bbbb-4bbb-8bbb-111111111111');
select is(
  (select count(*)::int from public.source_chunks),
  0,
  'source_chunks tetap tertutup meskipun AI aktif'
);

select * from finish();

rollback;
