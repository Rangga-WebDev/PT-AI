-- Test draf bahan ajar hasil bantuan AI (migration 0026).
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

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

select pg_temp.make_user('e0000001-cccc-4ccc-8ccc-000000000001', 'dr.student@test.invalid');
select pg_temp.make_user('e0000003-cccc-4ccc-8ccc-000000000003', 'dr.lecturer@test.invalid');
select pg_temp.make_user('e0000004-cccc-4ccc-8ccc-000000000004', 'dr.colecturer@test.invalid');
select pg_temp.make_user('e0000006-cccc-4ccc-8ccc-000000000006', 'dr.lecturer.other@test.invalid');
select pg_temp.make_user('e0000005-cccc-4ccc-8ccc-000000000005', 'dr.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('e0000000-cccc-4ccc-8ccc-000000000001', 'Universitas Draf', 'UDR');

insert into public.faculties (id, organization_id, name, code)
values ('e0000000-cccc-4ccc-8ccc-000000000002', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Fakultas Draf', 'FDR');

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values ('e0000000-cccc-4ccc-8ccc-000000000003', 'e0000000-cccc-4ccc-8ccc-000000000002', 'Prodi Draf', 'PDR', 's1');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('e0000001-cccc-4ccc-8ccc-000000000001', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Mahasiswa Draf', 'D-1001'),
  ('e0000003-cccc-4ccc-8ccc-000000000003', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Dosen Penyusun', 'D-2001'),
  ('e0000004-cccc-4ccc-8ccc-000000000004', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Dosen Rekan', 'D-2002'),
  ('e0000006-cccc-4ccc-8ccc-000000000006', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Dosen Lain', 'D-2003'),
  ('e0000005-cccc-4ccc-8ccc-000000000005', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Admin Draf', 'D-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, 'e0000000-cccc-4ccc-8ccc-000000000001', 'e0000005-cccc-4ccc-8ccc-000000000005'
from (values
  ('e0000001-cccc-4ccc-8ccc-000000000001'::uuid, 'student'::public.role_key),
  ('e0000003-cccc-4ccc-8ccc-000000000003'::uuid, 'lecturer'::public.role_key),
  ('e0000004-cccc-4ccc-8ccc-000000000004'::uuid, 'lecturer'::public.role_key),
  ('e0000006-cccc-4ccc-8ccc-000000000006'::uuid, 'lecturer'::public.role_key),
  ('e0000005-cccc-4ccc-8ccc-000000000005'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values ('e0000000-cccc-4ccc-8ccc-000000000004', 'e0000000-cccc-4ccc-8ccc-000000000001', 'Ganjil Draf', 'GDR', '2026-08-01', '2027-01-31', true);

insert into public.courses (id, organization_id, study_program_id, code, name, credits, created_by)
values ('e0000000-cccc-4ccc-8ccc-000000000005', 'e0000000-cccc-4ccc-8ccc-000000000001', 'e0000000-cccc-4ccc-8ccc-000000000003', 'PKN-DR', 'PKn Draf', 2, 'e0000005-cccc-4ccc-8ccc-000000000005');

insert into public.classes (id, course_id, academic_period_id, code, name, status, created_by) values
  ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000000-cccc-4ccc-8ccc-000000000005', 'e0000000-cccc-4ccc-8ccc-000000000004', 'DR-A', 'Kelas Draf', 'published', 'e0000005-cccc-4ccc-8ccc-000000000005'),
  ('e0000000-cccc-4ccc-8ccc-000000000016', 'e0000000-cccc-4ccc-8ccc-000000000005', 'e0000000-cccc-4ccc-8ccc-000000000004', 'DR-B', 'Kelas Lain', 'published', 'e0000005-cccc-4ccc-8ccc-000000000005');

insert into public.class_lecturers (class_id, lecturer_id, assigned_by) values
  ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000003-cccc-4ccc-8ccc-000000000003', 'e0000005-cccc-4ccc-8ccc-000000000005'),
  ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000004-cccc-4ccc-8ccc-000000000004', 'e0000005-cccc-4ccc-8ccc-000000000005'),
  ('e0000000-cccc-4ccc-8ccc-000000000016', 'e0000006-cccc-4ccc-8ccc-000000000006', 'e0000005-cccc-4ccc-8ccc-000000000005');

insert into public.enrollments (class_id, student_id, enrolled_by) values
  ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000001-cccc-4ccc-8ccc-000000000001', 'e0000005-cccc-4ccc-8ccc-000000000005');

select pg_temp.act_as_service();

-- Satu bahan sudah terekstrak, satu belum, satu milik kelas lain.
insert into public.learning_resources (
  id, class_id, title, resource_type, url, extraction_status, extracted_text, created_by
) values
  ('e0000000-cccc-4ccc-8ccc-000000000020', 'e0000000-cccc-4ccc-8ccc-000000000006',
   'RPS Terekstrak', 'file', 'https://kampus.example/rps.pdf',
   'succeeded', 'Isi RPS yang benar-benar terbaca.', 'e0000003-cccc-4ccc-8ccc-000000000003'),
  ('e0000000-cccc-4ccc-8ccc-000000000021', 'e0000000-cccc-4ccc-8ccc-000000000006',
   'Berkas Gagal Baca', 'file', 'https://kampus.example/rusak.pdf',
   'failed', null, 'e0000003-cccc-4ccc-8ccc-000000000003'),
  ('e0000000-cccc-4ccc-8ccc-000000000022', 'e0000000-cccc-4ccc-8ccc-000000000016',
   'Bahan Kelas Lain', 'link', 'https://kampus.example/lain',
   'pending', null, 'e0000006-cccc-4ccc-8ccc-000000000006');

-- === Provenance =============================================================

-- 1. Draf bersandar sumber wajib menunjuk bahan sumbernya.
select throws_ok(
  $$insert into public.ai_material_drafts (class_id, requested_by, grounding, output, model, prompt_version)
    values ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000003-cccc-4ccc-8ccc-000000000003',
            'source_bound', 'Keluaran', 'gemini-3.5-flash-lite', 1)$$,
  '23514',
  null,
  'Draf source_bound tanpa bahan sumber ditolak'
);

-- 2. Bahan yang gagal diekstrak tidak boleh menjadi dasar draf.
select throws_ok(
  $$insert into public.ai_material_drafts (class_id, requested_by, source_resource_id, grounding, output, model, prompt_version)
    values ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000003-cccc-4ccc-8ccc-000000000003',
            'e0000000-cccc-4ccc-8ccc-000000000021', 'source_bound', 'Keluaran',
            'gemini-3.5-flash-lite', 1)$$,
  '23001',
  null,
  'Bahan yang gagal diekstrak tidak dapat menjadi dasar draf'
);

-- 3. Bahan milik kelas lain ditolak.
select throws_ok(
  $$insert into public.ai_material_drafts (class_id, requested_by, source_resource_id, output, model, prompt_version)
    values ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000003-cccc-4ccc-8ccc-000000000003',
            'e0000000-cccc-4ccc-8ccc-000000000022', 'Keluaran', 'gemini-3.5-flash-lite', 1)$$,
  '23001',
  null,
  'Bahan dari kelas berbeda tidak dapat menjadi sumber draf'
);

-- 4. Bahan yang berhasil diekstrak diterima.
insert into public.ai_material_drafts (
  id, class_id, requested_by, source_resource_id, grounding, output, model, prompt_version
) values (
  'e0000000-cccc-4ccc-8ccc-000000000030', 'e0000000-cccc-4ccc-8ccc-000000000006',
  'e0000003-cccc-4ccc-8ccc-000000000003', 'e0000000-cccc-4ccc-8ccc-000000000020',
  'source_bound', 'Ringkasan materi minggu ketiga.', 'gemini-3.5-flash-lite', 1
);

select is(
  (select status from public.ai_material_drafts
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'),
  'draft',
  'Keluaran AI selalu lahir sebagai draf'
);

-- === Daur hidup persetujuan =================================================

-- 5. Status approved tanpa penyetuju ditolak.
select throws_ok(
  $$update public.ai_material_drafts set status = 'approved'
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'$$,
  '23514',
  null,
  'Persetujuan tanpa penyetuju dan waktunya ditolak'
);

-- 6. Bahan terbit tidak boleh ditautkan pada draf yang belum disetujui.
select throws_ok(
  $$update public.ai_material_drafts
      set published_resource_id = 'e0000000-cccc-4ccc-8ccc-000000000020'
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'$$,
  '23514',
  null,
  'Draf yang belum disetujui tidak dapat menghasilkan bahan terbit'
);

-- 7. Draf masih dapat disunting sebelum ditinjau.
update public.ai_material_drafts
set output = 'Ringkasan materi minggu ketiga, sudah disunting dosen.'
where id = 'e0000000-cccc-4ccc-8ccc-000000000030';

select is(
  (select output from public.ai_material_drafts
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'),
  'Ringkasan materi minggu ketiga, sudah disunting dosen.',
  'Draf dapat disunting dosen sebelum disetujui'
);

-- 8. Persetujuan yang lengkap diterima.
update public.ai_material_drafts
set status = 'approved',
    approved_by = 'e0000003-cccc-4ccc-8ccc-000000000003',
    approved_at = now()
where id = 'e0000000-cccc-4ccc-8ccc-000000000030';

select is(
  (select status from public.ai_material_drafts
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'),
  'approved',
  'Draf dapat disetujui dengan penyetuju dan waktunya'
);

-- 9. Isi yang sudah ditinjau tidak dapat diubah.
select throws_ok(
  $$update public.ai_material_drafts set output = 'Diubah setelah disetujui.'
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'$$,
  '23001',
  null,
  'Isi draf yang sudah disetujui tidak dapat diubah'
);

-- 10. Persetujuan tidak dapat dibatalkan kembali menjadi draf.
select throws_ok(
  $$update public.ai_material_drafts set status = 'draft', approved_by = null, approved_at = null
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'$$,
  '23001',
  null,
  'Draf yang sudah disetujui tidak dapat dikembalikan menjadi draf'
);

-- === Akses ==================================================================

-- 11. Mahasiswa tidak melihat draf apa pun.
select pg_temp.act_as('e0000001-cccc-4ccc-8ccc-000000000001');
select is(
  (select count(*)::int from public.ai_material_drafts),
  0,
  'Mahasiswa tidak melihat draf bahan ajar'
);

-- 12. Mahasiswa tidak dapat membuat draf.
select throws_ok(
  $$insert into public.ai_material_drafts (class_id, requested_by, output, model, prompt_version)
    values ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000001-cccc-4ccc-8ccc-000000000001',
            'Keluaran', 'gemini-3.5-flash-lite', 1)$$,
  '42501',
  null,
  'Mahasiswa tidak dapat membuat draf bahan ajar'
);

-- 13. Dosen tidak dapat membuat draf atas nama orang lain.
select pg_temp.act_as('e0000003-cccc-4ccc-8ccc-000000000003');
select throws_ok(
  $$insert into public.ai_material_drafts (class_id, requested_by, output, model, prompt_version)
    values ('e0000000-cccc-4ccc-8ccc-000000000006', 'e0000004-cccc-4ccc-8ccc-000000000004',
            'Keluaran', 'gemini-3.5-flash-lite', 1)$$,
  '42501',
  null,
  'Draf tidak dapat dibuat atas nama dosen lain'
);

-- 14. Dosen pengampu lain pada kelas yang sama dapat meninjau draf rekannya.
select pg_temp.act_as('e0000004-cccc-4ccc-8ccc-000000000004');
select is(
  (select count(*)::int from public.ai_material_drafts
    where id = 'e0000000-cccc-4ccc-8ccc-000000000030'),
  1,
  'Dosen pengampu lain dapat meninjau draf rekan sekelasnya'
);

-- 15. Dosen kelas lain tidak melihat draf apa pun.
select pg_temp.act_as('e0000006-cccc-4ccc-8ccc-000000000006');
select is(
  (select count(*)::int from public.ai_material_drafts),
  0,
  'Dosen kelas lain tidak melihat draf'
);

-- 16. Draf tidak pernah masuk data penggunaan AI mahasiswa.
select pg_temp.act_as_service();
select is(
  (select count(*)::int from public.ai_interactions
    where student_id = 'e0000003-cccc-4ccc-8ccc-000000000003'),
  0,
  'Penyusunan bahan oleh dosen tidak mencemari ai_interactions'
);

select * from finish();
rollback;
