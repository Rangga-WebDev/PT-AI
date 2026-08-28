-- Test akses sumber dan verifikasi (PHASE 9).
-- Menegakkan LOCK-PED-007 dan batas cakupan bukti.
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

create or replace function pg_temp.act_as(p_id uuid)
returns void
language plpgsql
as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L', json_build_object('sub', p_id, 'role', 'authenticated')::text);
end;
$$;

-- === Fixture ================================================================

select pg_temp.make_user('11111111-aaaa-4aaa-8aaa-111111111111', 'src.student.a@test.invalid');
select pg_temp.make_user('22222222-aaaa-4aaa-8aaa-222222222222', 'src.student.b@test.invalid');
select pg_temp.make_user('33333333-aaaa-4aaa-8aaa-333333333333', 'src.lecturer@test.invalid');
select pg_temp.make_user('55555555-aaaa-4aaa-8aaa-555555555555', 'src.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('99000000-0000-4000-8000-000000000001', 'Universitas Sumber', 'USB');

insert into public.faculties (id, organization_id, name, code)
values ('99000000-0000-4000-8000-000000000002', '99000000-0000-4000-8000-000000000001', 'Fakultas Sumber', 'FS');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('99000000-0000-4000-8000-000000000003', '99000000-0000-4000-8000-000000000002', 'Prodi Sumber', 'PS', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('11111111-aaaa-4aaa-8aaa-111111111111', '99000000-0000-4000-8000-000000000001', 'Mahasiswa A', 'S-1001'),
  ('22222222-aaaa-4aaa-8aaa-222222222222', '99000000-0000-4000-8000-000000000001', 'Mahasiswa B', 'S-1002'),
  ('33333333-aaaa-4aaa-8aaa-333333333333', '99000000-0000-4000-8000-000000000001', 'Dosen Sumber', 'S-2001'),
  ('55555555-aaaa-4aaa-8aaa-555555555555', '99000000-0000-4000-8000-000000000001', 'Admin Sumber', 'S-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, '99000000-0000-4000-8000-000000000001', '55555555-aaaa-4aaa-8aaa-555555555555'
from (values
  ('11111111-aaaa-4aaa-8aaa-111111111111'::uuid, 'student'::public.role_key),
  ('22222222-aaaa-4aaa-8aaa-222222222222'::uuid, 'student'::public.role_key),
  ('33333333-aaaa-4aaa-8aaa-333333333333'::uuid, 'lecturer'::public.role_key),
  ('55555555-aaaa-4aaa-8aaa-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('99000000-0000-4000-8000-000000000004', '99000000-0000-4000-8000-000000000001', 'Ganjil Sumber', 'GSB', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('99000000-0000-4000-8000-000000000005', '99000000-0000-4000-8000-000000000001', '99000000-0000-4000-8000-000000000003', 'PKN-SRC', 'PKn Sumber', 2, '55555555-aaaa-4aaa-8aaa-555555555555');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by)
values ('99000000-0000-4000-8000-000000000006', '99000000-0000-4000-8000-000000000005', '99000000-0000-4000-8000-000000000004', 'SA', 'Kelas Sumber', 'published', '55555555-aaaa-4aaa-8aaa-555555555555');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('99000000-0000-4000-8000-000000000006', '33333333-aaaa-4aaa-8aaa-333333333333', '55555555-aaaa-4aaa-8aaa-555555555555');

-- Hanya mahasiswa A yang terdaftar; mahasiswa B menjadi pembanding.
insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('99000000-0000-4000-8000-000000000006', '11111111-aaaa-4aaa-8aaa-111111111111', '55555555-aaaa-4aaa-8aaa-555555555555');

insert into public.modules (id, class_id, title, sequence, status, created_by)
values ('99000000-0000-4000-8000-000000000010', '99000000-0000-4000-8000-000000000006', 'Modul Sumber', 1, 'published', '33333333-aaaa-4aaa-8aaa-333333333333');

insert into public.learning_units (id, module_id, title, objective, sequence, status, created_by)
values ('99000000-0000-4000-8000-000000000011', '99000000-0000-4000-8000-000000000010', 'Unit Sumber', 'Tujuan unit sumber.', 1, 'published', '33333333-aaaa-4aaa-8aaa-333333333333');

insert into public.cases (id, learning_unit_id, title, context, body, key_question, created_by)
values ('99000000-0000-4000-8000-000000000012', '99000000-0000-4000-8000-000000000011', 'Kasus Sumber', 'Konteks', 'Isi kasus sumber.', 'Pertanyaan kunci?', '33333333-aaaa-4aaa-8aaa-333333333333');

insert into public.activities (id, learning_stage_id, title, prompt, activity_type, sequence, status, created_by)
select '99000000-0000-4000-8000-000000000020', ls.id, 'Aktivitas Sumber', 'Prompt.', 'source_verification', 1, 'published', '33333333-aaaa-4aaa-8aaa-333333333333'
from public.learning_stages ls
where ls.learning_unit_id = '99000000-0000-4000-8000-000000000011' and ls.stage_key = 'interpretation';

-- Sumber terlampir vs sumber tidak terlampir ke kasus mana pun.
insert into public.sources (id, organization_id, title, source_type, created_by) values
  ('99000000-0000-4000-8000-000000000030', '99000000-0000-4000-8000-000000000001', 'Sumber Terlampir', 'regulation', '33333333-aaaa-4aaa-8aaa-333333333333'),
  ('99000000-0000-4000-8000-000000000031', '99000000-0000-4000-8000-000000000001', 'Sumber Tidak Terlampir', 'news', '33333333-aaaa-4aaa-8aaa-333333333333');

insert into public.source_versions (id, source_id, version_label, retrieved_at, content_text, created_by)
values ('99000000-0000-4000-8000-000000000032', '99000000-0000-4000-8000-000000000030', 'v1', now(), 'Kutipan sumber.', '33333333-aaaa-4aaa-8aaa-333333333333');

insert into public.source_chunks (source_version_id, chunk_index, content)
values ('99000000-0000-4000-8000-000000000032', 0, 'Potongan untuk RAG.');

insert into public.case_sources (case_id, source_id, sequence)
values ('99000000-0000-4000-8000-000000000012', '99000000-0000-4000-8000-000000000030', 1);

insert into public.claims (id, case_id, origin, text, author_id)
values ('99000000-0000-4000-8000-000000000040', '99000000-0000-4000-8000-000000000012', 'case', 'Klaim kasus untuk ditelaah.', '33333333-aaaa-4aaa-8aaa-333333333333');

-- === Skenario ===============================================================

-- 1. Mahasiswa terdaftar melihat sumber yang terlampir pada kasus kelasnya.
select pg_temp.act_as('11111111-aaaa-4aaa-8aaa-111111111111');
select is(
  (select count(*)::int from public.sources where id = '99000000-0000-4000-8000-000000000030'),
  1,
  'Mahasiswa melihat sumber yang terlampir pada kasus kelasnya'
);

-- 2. Sumber yang tidak terlampir tidak terbaca mahasiswa.
select is(
  (select count(*)::int from public.sources where id = '99000000-0000-4000-8000-000000000031'),
  0,
  'Sumber di luar source pack tidak terbaca mahasiswa'
);

-- 3. Potongan embedding tidak pernah terbaca klien (batas RAG).
select is(
  (select count(*)::int from public.source_chunks),
  0,
  'source_chunks tertutup bagi seluruh klien'
);

-- 4. Verifikasi tanpa keenam kunci checklist ditolak constraint.
select throws_ok(
  $$insert into public.source_verifications (source_id, student_id, activity_id, verdict, checklist, note)
    values ('99000000-0000-4000-8000-000000000030', '11111111-aaaa-4aaa-8aaa-111111111111',
            '99000000-0000-4000-8000-000000000020', 'credible',
            '{"credibility": true}'::jsonb, 'Catatan yang memadai.')$$,
  '23514',
  null,
  'Checklist tanpa keenam kriteria ditolak database'
);

-- 5. Verifikasi dengan catatan terlalu pendek ditolak.
select throws_ok(
  $$insert into public.source_verifications (source_id, student_id, activity_id, verdict, checklist, note)
    values ('99000000-0000-4000-8000-000000000030', '11111111-aaaa-4aaa-8aaa-111111111111',
            '99000000-0000-4000-8000-000000000020', 'credible',
            '{"credibility": true, "relevance": true, "sufficiency": true,
              "traceability": true, "consistency": true, "bias": false}'::jsonb, 'pendek')$$,
  '23514',
  null,
  'Catatan verifikasi yang terlalu pendek ditolak database'
);

-- 6. Verifikasi lengkap diterima.
select lives_ok(
  $$insert into public.source_verifications (id, source_id, student_id, activity_id, verdict, checklist, note)
    values ('99000000-0000-4000-8000-000000000050', '99000000-0000-4000-8000-000000000030',
            '11111111-aaaa-4aaa-8aaa-111111111111', '99000000-0000-4000-8000-000000000020', 'questionable',
            '{"credibility": true, "relevance": true, "sufficiency": false,
              "traceability": true, "consistency": true, "bias": false}'::jsonb,
            'Metodologi tidak dijelaskan sehingga kecukupan bukti diragukan.')$$,
  'Verifikasi dengan keenam kriteria dan alasan memadai diterima'
);

-- 7. Mahasiswa dapat menautkan klaim ke sumber dan mencabutnya kembali.
select lives_ok(
  $$insert into public.claim_source_links (claim_id, source_id, link_type, linked_by)
    values ('99000000-0000-4000-8000-000000000040', '99000000-0000-4000-8000-000000000030',
            'refutes', '11111111-aaaa-4aaa-8aaa-111111111111')$$,
  'Mahasiswa dapat menautkan klaim ke bukti'
);

delete from public.claim_source_links
where claim_id = '99000000-0000-4000-8000-000000000040'
  and linked_by = '11111111-aaaa-4aaa-8aaa-111111111111';
select is(
  (select count(*)::int from public.claim_source_links
   where claim_id = '99000000-0000-4000-8000-000000000040'),
  0,
  'Penaut dapat mencabut tautannya sendiri'
);

-- 8. Mahasiswa lain tidak membaca verifikasi milik mahasiswa A.
select pg_temp.act_as('22222222-aaaa-4aaa-8aaa-222222222222');
select is(
  (select count(*)::int from public.source_verifications
   where id = '99000000-0000-4000-8000-000000000050'),
  0,
  'Verifikasi mahasiswa lain tidak terbaca'
);

-- 9. Dosen pengampu membaca verifikasi mahasiswa kelasnya.
select pg_temp.act_as('33333333-aaaa-4aaa-8aaa-333333333333');
select is(
  (select count(*)::int from public.source_verifications
   where id = '99000000-0000-4000-8000-000000000050'),
  1,
  'Dosen pengampu membaca verifikasi mahasiswa kelasnya'
);

-- 10. Mahasiswa tidak dapat menambah sumber terkurasi.
select pg_temp.act_as('11111111-aaaa-4aaa-8aaa-111111111111');
select throws_ok(
  $$insert into public.sources (organization_id, title, source_type, created_by)
    values ('99000000-0000-4000-8000-000000000001', 'Sumber Palsu', 'news',
            '11111111-aaaa-4aaa-8aaa-111111111111')$$,
  '42501',
  null,
  'Mahasiswa tidak dapat menambah sumber terkurasi'
);

select * from finish();

rollback;
