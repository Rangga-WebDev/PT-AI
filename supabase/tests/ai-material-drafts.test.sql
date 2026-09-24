-- Test draf bahan ajar hasil bantuan AI (migration 0026).
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(43);

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

create function pg_temp.unit_plan() returns jsonb language sql as $$
  select jsonb_build_object('kind','six_unit_plan','warnings','[]'::jsonb,'units',(
    select jsonb_agg(jsonb_build_object(
      'title','Unit AI ' || units.sequence,
      'objective','Menganalisis bukti dalam partisipasi warga negara.',
      'sourceExcerpt','Isi RPS yang benar-benar terbaca.',
      'case',jsonb_build_object('title','Kebijakan publik ' || units.sequence,
        'context','Kasus hipotetis untuk latihan kelas.',
        'body','Warga menimbang dasar bukti suatu kebijakan. Mahasiswa memeriksa asumsi sebelum menyimpulkan pendapatnya sendiri.',
        'keyQuestion','Apa bukti yang diperlukan untuk menilai klaim ini?'),
      'activities',(
        select jsonb_agg(jsonb_build_object('stageKey',stage.key,'title','Latihan ' || stage.key,
          'prompt','Tuliskan penalaran Anda sendiri berdasarkan bukti pada sumber.',
          'responseSchema','free_text') order by stage.sequence)
        from (values(1,'interpretation'),(2,'analysis'),(3,'evaluation'),(4,'inference'),(5,'explanation'),(6,'reflection')) stage(sequence,key)
      )) order by units.sequence) from generate_series(1,6) units(sequence)
  ));
$$;

insert into public.modules(id,class_id,title,sequence,status,created_by) values
('e0000000-cccc-4ccc-8ccc-000000000050','e0000000-cccc-4ccc-8ccc-000000000006','Pertemuan Unit AI',1,'published','e0000003-cccc-4ccc-8ccc-000000000003'),
('e0000000-cccc-4ccc-8ccc-000000000051','e0000000-cccc-4ccc-8ccc-000000000016','Pertemuan Asing',1,'published','e0000006-cccc-4ccc-8ccc-000000000006');
insert into public.learning_units(id,module_id,title,objective,sequence,created_by) values
('e0000000-cccc-4ccc-8ccc-000000000060','e0000000-cccc-4ccc-8ccc-000000000050','Unit lama','Tujuan yang tidak boleh ditimpa.',1,'e0000003-cccc-4ccc-8ccc-000000000003');

create function pg_temp.add_unit_draft(p_id uuid, p_module uuid, p_output jsonb) returns void language sql as $$
  insert into public.ai_material_drafts(id,class_id,requested_by,source_resource_id,grounding,instruction,output,model,prompt_version)
  values(p_id,'e0000000-cccc-4ccc-8ccc-000000000006','e0000003-cccc-4ccc-8ccc-000000000003',
    'e0000000-cccc-4ccc-8ccc-000000000020','source_bound',
    jsonb_build_object('kind','six_unit_plan','moduleId',p_module,
      'sourceTextHash',encode(extensions.digest(convert_to('Isi RPS yang benar-benar terbaca.','UTF8'),'sha256'),'hex')),
    p_output::text,'fake-test',1);
$$;
select pg_temp.add_unit_draft('e0000000-cccc-4ccc-8ccc-000000000070','e0000000-cccc-4ccc-8ccc-000000000050',pg_temp.unit_plan());
select pg_temp.add_unit_draft('e0000000-cccc-4ccc-8ccc-000000000071','e0000000-cccc-4ccc-8ccc-000000000050',jsonb_set(pg_temp.unit_plan(),'{units,5,activities,5,stageKey}','"analysis"'));
select pg_temp.add_unit_draft('e0000000-cccc-4ccc-8ccc-000000000072','e0000000-cccc-4ccc-8ccc-000000000050',pg_temp.unit_plan() #- '{units,5}');
select pg_temp.add_unit_draft('e0000000-cccc-4ccc-8ccc-000000000073','e0000000-cccc-4ccc-8ccc-000000000050',pg_temp.unit_plan());
select pg_temp.add_unit_draft('e0000000-cccc-4ccc-8ccc-000000000074','e0000000-cccc-4ccc-8ccc-000000000051',pg_temp.unit_plan());
select pg_temp.add_unit_draft('e0000000-cccc-4ccc-8ccc-000000000075','e0000000-cccc-4ccc-8ccc-000000000050',pg_temp.unit_plan());
update public.ai_material_drafts set instruction = instruction || jsonb_build_object('sourceTextHash', repeat('0',64)) where id='e0000000-cccc-4ccc-8ccc-000000000073';
update public.ai_material_drafts set status='discarded' where id='e0000000-cccc-4ccc-8ccc-000000000075';

select ok(not has_function_privilege('anon','public.apply_ai_unit_plan(uuid,timestamptz)','execute'),'Anon tidak dapat menerapkan unit AI');
select pg_temp.act_as('e0000001-cccc-4ccc-8ccc-000000000001');
select throws_ok($$select public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000070',now())$$,'42501','forbidden','Mahasiswa tidak dapat menerapkan draf');
select pg_temp.act_as('e0000006-cccc-4ccc-8ccc-000000000006');
select throws_ok($$select public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000070',now())$$,'42501','forbidden','Dosen kelas lain tidak dapat menerapkan draf');
select pg_temp.act_as('e0000003-cccc-4ccc-8ccc-000000000003');
select throws_ok($$select public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000074',now())$$,'23001','module_not_found','Pertemuan lintas kelas ditolak');
select throws_ok($$select public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000070',now()-interval '1 day')$$,'23001','stale_draft','Tinjauan versi lama ditolak');
select throws_ok($$select public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000071',now())$$,'22023','invalid_unit_plan','Tahap salah pada unit keenam membatalkan penerapan');
select is((select count(*)::int from public.learning_units where module_id='e0000000-cccc-4ccc-8ccc-000000000050'),1,'Tidak ada unit parsial setelah kesalahan terakhir');
select is((select status from public.ai_material_drafts where id='e0000000-cccc-4ccc-8ccc-000000000071'),'draft','Draf gagal tidak dianggap disetujui');
select pg_temp.act_as_service();
select is((select count(*)::int from public.audit_logs where subject_id='e0000000-cccc-4ccc-8ccc-000000000071'),0,'Tidak ada audit sukses palsu');
select pg_temp.act_as('e0000003-cccc-4ccc-8ccc-000000000003');
select throws_ok($$select public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000072',now())$$,'22023','invalid_unit_plan','Draf berisi lima unit ditolak');
select throws_ok($$select public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000073',now())$$,'23001','source_changed','Sumber yang berubah tidak diterapkan diam-diam');
select throws_ok($$select public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000075',now())$$,'23001','not_reviewable','Draf yang dibuang tidak dapat dipakai');
select lives_ok($$select public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000070',now())$$,'Dosen menyetujui dan membuat enam unit atomik');
select is((select count(*)::int from public.learning_units where module_id='e0000000-cccc-4ccc-8ccc-000000000050'),7,'Enam unit ditambahkan tanpa menimpa satu unit lama');
select is((select count(*)::int from public.cases c join public.learning_units u on u.id=c.learning_unit_id where u.module_id='e0000000-cccc-4ccc-8ccc-000000000050'),6,'Setiap unit memiliki satu kasus');
select is((select count(*)::int from public.learning_stages st join public.learning_units u on u.id=st.learning_unit_id where u.module_id='e0000000-cccc-4ccc-8ccc-000000000050' and u.id<>'e0000000-cccc-4ccc-8ccc-000000000060'),36,'Keenam unit masing-masing mempunyai enam tahap');
select is((select count(*)::int from public.activities a join public.learning_stages st on st.id=a.learning_stage_id join public.learning_units u on u.id=st.learning_unit_id where u.module_id='e0000000-cccc-4ccc-8ccc-000000000050'),36,'Tersedia 36 aktivitas');
select is((select count(*)::int from public.learning_units where module_id='e0000000-cccc-4ccc-8ccc-000000000050' and sequence>1 and status='draft'),6,'Semua unit baru berupa draf');
select is((select count(*)::int from public.activities a join public.learning_stages st on st.id=a.learning_stage_id join public.learning_units u on u.id=st.learning_unit_id where u.module_id='e0000000-cccc-4ccc-8ccc-000000000050' and a.status='draft' and not a.allows_ai and a.requires_attempt_before_ai),36,'Aktivitas tetap draf dengan AI mahasiswa mati dan attempt-first aktif');
select is((select title from public.learning_units where id='e0000000-cccc-4ccc-8ccc-000000000060'),'Unit lama','Judul unit lama tidak berubah');
select is(public.apply_ai_unit_plan('e0000000-cccc-4ccc-8ccc-000000000070',now())->>'alreadyApplied','true','Permintaan ulang bersifat idempoten');
select is((select count(*)::int from public.learning_units where module_id='e0000000-cccc-4ccc-8ccc-000000000050'),7,'Klik ulang tidak menggandakan unit');
select pg_temp.act_as_service();
select is((select jsonb_array_length(after->'unitIds') from public.audit_logs where action='ai_unit_plan_applied' and subject_id='e0000000-cccc-4ccc-8ccc-000000000070'),6,'Audit menyimpan identitas enam unit');
select is((select count(*)::int from public.ai_interactions where student_id='e0000003-cccc-4ccc-8ccc-000000000003'),0,'Pembuatan unit tidak menambah interaksi AI mahasiswa');
select pg_temp.act_as('e0000001-cccc-4ccc-8ccc-000000000001');
select is((select count(*)::int from public.learning_units where module_id='e0000000-cccc-4ccc-8ccc-000000000050'),0,'Mahasiswa tidak melihat unit yang belum diterbitkan');
select pg_temp.act_as('e0000003-cccc-4ccc-8ccc-000000000003');
select is((select status from public.ai_material_drafts where id='e0000000-cccc-4ccc-8ccc-000000000070'),'approved','Persetujuan dosen tercatat bersama unit');
select throws_ok($$update public.ai_material_drafts set output='{}' where id='e0000000-cccc-4ccc-8ccc-000000000070'$$,'23001',null,'Draf yang diterapkan tidak bisa diubah maknanya');

select * from finish();
rollback;
