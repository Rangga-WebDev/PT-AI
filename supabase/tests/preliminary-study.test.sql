-- Test studi pendahuluan (0038).
-- Akses per peran, batas organisasi, kebenaran agregat, keutuhan jawaban,
-- append-only, dan jejak audit saat admin membuka jawaban responden.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(30);

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

select pg_temp.make_user('a1000000-3800-4000-8000-000000000001', 'ps.admin.a@test.invalid');
select pg_temp.make_user('a1000000-3800-4000-8000-000000000002', 'ps.lecturer.a@test.invalid');
select pg_temp.make_user('a1000000-3800-4000-8000-000000000003', 'ps.student.a@test.invalid');
select pg_temp.make_user('b1000000-3800-4000-8000-000000000001', 'ps.admin.b@test.invalid');

insert into public.organizations (id, name, code) values
  ('a0000000-3800-4000-8000-000000000000', 'Universitas Pendahuluan A', 'UPSA'),
  ('b0000000-3800-4000-8000-000000000000', 'Universitas Pendahuluan B', 'UPSB');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('a1000000-3800-4000-8000-000000000001', 'a0000000-3800-4000-8000-000000000000', 'Admin PS A', 'PS-A-3001'),
  ('a1000000-3800-4000-8000-000000000002', 'a0000000-3800-4000-8000-000000000000', 'Dosen PS A', 'PS-A-2001'),
  ('a1000000-3800-4000-8000-000000000003', 'a0000000-3800-4000-8000-000000000000', 'Mahasiswa PS A', 'PS-A-1001'),
  ('b1000000-3800-4000-8000-000000000001', 'b0000000-3800-4000-8000-000000000000', 'Admin PS B', 'PS-B-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, p.org, p.id
from (values
  ('a1000000-3800-4000-8000-000000000001'::uuid, 'admin'::public.role_key, 'a0000000-3800-4000-8000-000000000000'::uuid),
  ('a1000000-3800-4000-8000-000000000002'::uuid, 'lecturer'::public.role_key, 'a0000000-3800-4000-8000-000000000000'::uuid),
  ('a1000000-3800-4000-8000-000000000003'::uuid, 'student'::public.role_key, 'a0000000-3800-4000-8000-000000000000'::uuid),
  ('b1000000-3800-4000-8000-000000000001'::uuid, 'admin'::public.role_key, 'b0000000-3800-4000-8000-000000000000'::uuid)
) as p(id, role_key, org)
join public.roles r on r.key = p.role_key;

-- Dataset uji: 2 soal, skor 0-4, total maksimum 8.
-- T01 = 1+2 = 3 (37,50 Rendah), T02 = 3+2 = 5 (62,50 Sedang), T03 = 4+3 = 7 (87,50 Tinggi).
insert into research.preliminary_datasets (
  id, organization_id, title, item_count, max_item_score, category_scheme,
  respondent_count, source_file, source_sheet, source_checksum, imported_at
) values (
  'a2000000-3800-4000-8000-000000000001', 'a0000000-3800-4000-8000-000000000000',
  'Tes uji pendahuluan', 2, 4,
  '[{"label":"Rendah","min":0,"max":60},{"label":"Sedang","min":60,"max":80},{"label":"Tinggi","min":80,"max":100}]',
  3, 'uji-jawaban.csv', 'Jawaban Uji', repeat('a', 64), '2026-01-01T00:00:00Z'
);

insert into research.preliminary_items (dataset_id, item_number, dimension, source_file, source_sheet, source_row) values
  ('a2000000-3800-4000-8000-000000000001', 1, 'interpretation', 'uji-kisi.csv', 'Kisi Uji', 4),
  ('a2000000-3800-4000-8000-000000000001', 2, 'analysis', 'uji-kisi.csv', 'Kisi Uji', 5);

insert into research.preliminary_respondents (
  id, dataset_id, respondent_code, recorded_category, recorded_total, recorded_score,
  source_file, source_sheet, source_row
) values
  ('a3000000-3800-4000-8000-000000000001', 'a2000000-3800-4000-8000-000000000001', 'T01', 'Rendah', 3, 37.5, 'uji-jawaban.csv', 'Jawaban Uji', 2),
  ('a3000000-3800-4000-8000-000000000002', 'a2000000-3800-4000-8000-000000000001', 'T02', 'Sedang', 5, 62.5, 'uji-jawaban.csv', 'Jawaban Uji', 3),
  ('a3000000-3800-4000-8000-000000000003', 'a2000000-3800-4000-8000-000000000001', 'T03', 'Tinggi', 7, 87.5, 'uji-jawaban.csv', 'Jawaban Uji', 4);

insert into research.preliminary_responses (respondent_id, dataset_id, item_number, answer_text, score, answer_column, score_column) values
  ('a3000000-3800-4000-8000-000000000001', 'a2000000-3800-4000-8000-000000000001', 1, E'  Jawaban "asli" satu,\nbaris dua  ', 1, 'Soal 1', 'Skor 1'),
  ('a3000000-3800-4000-8000-000000000001', 'a2000000-3800-4000-8000-000000000001', 2, 'Jawaban uji dua', 2, 'Soal 2', 'Skor 2'),
  ('a3000000-3800-4000-8000-000000000002', 'a2000000-3800-4000-8000-000000000001', 1, 'Jawaban uji tiga', 3, 'Soal 1', 'Skor 1'),
  ('a3000000-3800-4000-8000-000000000002', 'a2000000-3800-4000-8000-000000000001', 2, 'Jawaban uji empat', 2, 'Soal 2', 'Skor 2'),
  ('a3000000-3800-4000-8000-000000000003', 'a2000000-3800-4000-8000-000000000001', 1, 'Jawaban uji lima', 4, 'Soal 1', 'Skor 1'),
  ('a3000000-3800-4000-8000-000000000003', 'a2000000-3800-4000-8000-000000000001', 2, 'Jawaban uji enam', 3, 'Soal 2', 'Skor 2');

-- === Hak eksekusi ===========================================================

-- 1-3. Peran anon tidak dapat memanggil fungsi apa pun.
select is(has_function_privilege('anon', 'public.preliminary_study_overview()', 'execute'), false,
  'Anon tidak dapat membaca ringkasan studi pendahuluan');
select is(has_function_privilege('anon', 'public.preliminary_study_respondents(uuid)', 'execute'), false,
  'Anon tidak dapat membaca daftar responden');
select is(has_function_privilege('anon', 'public.preliminary_study_respondent(uuid)', 'execute'), false,
  'Anon tidak dapat membaca jawaban responden');

-- 4. Tabel research tidak dapat dibaca langsung, bahkan oleh admin.
select pg_temp.act_as('a1000000-3800-4000-8000-000000000001');
select throws_ok(
  'select count(*) from research.preliminary_responses',
  '42501', null,
  'Tabel jawaban tidak dapat dibaca langsung oleh peran klien'
);

-- === Ringkasan: admin ======================================================

create temporary table overview_admin as
select public.preliminary_study_overview() as v;

-- 5-9. Ringkasan dihitung dari skor butir.
select is((select (v->'summary'->>'respondents')::int from overview_admin), 3,
  'Ringkasan menghitung seluruh responden');
select is((select (v->'summary'->>'average')::numeric from overview_admin), 62.50::numeric,
  'Rata-rata nilai dihitung dari total skor butir');
select is((select (v->'summary'->>'lowest')::numeric from overview_admin), 37.50::numeric,
  'Nilai terendah benar');
select is((select (v->'summary'->>'highest')::numeric from overview_admin), 87.50::numeric,
  'Nilai tertinggi benar');
select is(
  (select jsonb_agg(jsonb_build_array(c->>'label', (c->>'count')::int, (c->>'percent')::numeric) order by ord)
   from overview_admin, jsonb_array_elements(v->'categories') with ordinality as e(c, ord)),
  '[["Rendah",1,33.33],["Sedang",1,33.33],["Tinggi",1,33.33]]'::jsonb,
  'Distribusi kategori mengikuti urutan rentang penelitian'
);

-- 10-11. Rata-rata kecakapan dan butir pada skala 0-4.
select is((select v->'skills' from overview_admin),
  '[{"dimension":"interpretation","average":2.67},{"dimension":"analysis","average":2.33}]'::jsonb,
  'Rata-rata kecakapan dihitung dari butir yang dipetakan');
select is((select v->'items' from overview_admin),
  '[{"itemNumber":1,"dimension":"interpretation","average":2.67},{"itemNumber":2,"dimension":"analysis","average":2.33}]'::jsonb,
  'Rata-rata per butir benar');

-- 12. Sebaran nilai urut naik dan membawa kategori.
select is(
  (select jsonb_agg(jsonb_build_array((e->>'score')::numeric, e->>'category') order by ord)
   from overview_admin, jsonb_array_elements(v->'scores') with ordinality as x(e, ord)),
  '[[37.5,"Rendah"],[62.5,"Sedang"],[87.5,"Tinggi"]]'::jsonb,
  'Sebaran nilai berurutan naik beserta kategorinya'
);

-- 13. Ringkasan tidak membawa identitas maupun jawaban.
select ok(
  (select position('T01' in v::text) = 0
      and position('asli' in v::text) = 0
      and position('uji dua' in v::text) = 0
   from overview_admin),
  'Ringkasan tidak memuat kode responden ataupun jawaban'
);

-- 14. Kategori mencatat rentang dari dataset.
select is((select v->'categories'->1->>'min' from overview_admin), '60',
  'Rentang kategori berasal dari skema dataset');

-- === Ringkasan: peran lain =================================================

-- 15. Dosen organisasi yang sama dapat melihat ringkasan.
select pg_temp.act_as('a1000000-3800-4000-8000-000000000002');
select is((select (public.preliminary_study_overview()->'summary'->>'respondents')::int), 3,
  'Dosen dapat melihat ringkasan organisasinya');

-- 16. Mahasiswa ditolak.
select pg_temp.act_as('a1000000-3800-4000-8000-000000000003');
select throws_ok('select public.preliminary_study_overview()', '42501', null,
  'Mahasiswa tidak dapat membaca ringkasan studi pendahuluan');

-- 17. Admin organisasi lain tidak melihat dataset organisasi A.
select pg_temp.act_as('b1000000-3800-4000-8000-000000000001');
select is(public.preliminary_study_overview(), null::jsonb,
  'Admin organisasi lain tidak melihat dataset organisasi A');

-- === Daftar responden ======================================================

-- 18. Admin organisasi lain ditolak.
select throws_ok(
  $$select public.preliminary_study_respondents('a2000000-3800-4000-8000-000000000001')$$,
  '42501', null,
  'Admin organisasi lain tidak dapat membaca daftar responden'
);

-- 19. Dosen ditolak: dosen hanya melihat agregat.
select pg_temp.act_as('a1000000-3800-4000-8000-000000000002');
select throws_ok(
  $$select public.preliminary_study_respondents('a2000000-3800-4000-8000-000000000001')$$,
  '42501', null,
  'Dosen tidak dapat membaca skor per responden'
);

-- 20-21. Admin organisasi melihat skor per responden.
select pg_temp.act_as('a1000000-3800-4000-8000-000000000001');
create temporary table respondents_admin as
select public.preliminary_study_respondents('a2000000-3800-4000-8000-000000000001') as v;

select is((select jsonb_array_length(v) from respondents_admin), 3,
  'Admin membaca seluruh responden');
select is(
  (select jsonb_build_object('code', v->0->'code', 'total', v->0->'total', 'score', v->0->'score', 'skills', v->0->'skills') from respondents_admin),
  '{"code":"T01","total":3,"score":37.5,"skills":{"interpretation":1,"analysis":2}}'::jsonb,
  'Skor responden dan per kecakapan dihitung dari butir'
);

-- === Jawaban responden =====================================================

-- 22-23. Admin membaca jawaban persis seperti sumbernya.
create temporary table detail_admin as
select public.preliminary_study_respondent('a3000000-3800-4000-8000-000000000001') as v;

select is((select jsonb_array_length(v->'answers') from detail_admin), 2,
  'Detail memuat jawaban setiap soal');
select is((select v->'answers'->0->>'answer' from detail_admin), E'  Jawaban "asli" satu,\nbaris dua  ',
  'Teks jawaban dipertahankan persis, termasuk spasi, tanda kutip, dan baris baru');

-- 24. Membuka jawaban tercatat pada log audit.
select pg_temp.act_as_service();
select is(
  (select count(*)::int from public.audit_logs
   where action = 'research_preliminary_viewed'
     and subject_id = 'a3000000-3800-4000-8000-000000000001'
     and actor_id = 'a1000000-3800-4000-8000-000000000001'),
  1,
  'Setiap pembukaan jawaban responden tercatat pada log audit'
);

-- 25. Dosen tidak dapat membuka jawaban.
select pg_temp.act_as('a1000000-3800-4000-8000-000000000002');
select throws_ok(
  $$select public.preliminary_study_respondent('a3000000-3800-4000-8000-000000000001')$$,
  '42501', null,
  'Dosen tidak dapat membuka jawaban responden'
);

-- 26. Admin organisasi lain tidak dapat membuka jawaban.
select pg_temp.act_as('b1000000-3800-4000-8000-000000000001');
select throws_ok(
  $$select public.preliminary_study_respondent('a3000000-3800-4000-8000-000000000001')$$,
  '42501', null,
  'Admin organisasi lain tidak dapat membuka jawaban responden'
);

-- 27. Responden yang tidak ada dijawab sama dengan akses ditolak.
select pg_temp.act_as('a1000000-3800-4000-8000-000000000001');
select throws_ok(
  $$select public.preliminary_study_respondent('a3000000-3800-4000-8000-0000000000ff')$$,
  '42501', null,
  'Responden yang tidak ada tidak membocorkan keberadaan data'
);

-- === Append-only ===========================================================

select pg_temp.act_as_service();

-- 28-29. Jawaban dan dataset tidak dapat diubah atau dihapus, termasuk oleh service.
select throws_ok(
  $$update research.preliminary_responses set score = 4
    where respondent_id = 'a3000000-3800-4000-8000-000000000001' and item_number = 1$$,
  '23001', null,
  'Skor jawaban tidak dapat diubah setelah diimpor'
);
select throws_ok(
  $$delete from research.preliminary_datasets where id = 'a2000000-3800-4000-8000-000000000001'$$,
  '23001', null,
  'Dataset studi pendahuluan tidak dapat dihapus'
);

-- 30. Dataset koreksi yang diimpor belakangan menjadi yang ditampilkan.
insert into research.preliminary_datasets (
  id, organization_id, title, item_count, max_item_score, category_scheme,
  respondent_count, source_file, source_sheet, source_checksum, imported_at
) values (
  'a2000000-3800-4000-8000-000000000002', 'a0000000-3800-4000-8000-000000000000',
  'Tes uji pendahuluan (koreksi)', 1, 4,
  '[{"label":"Rendah","min":0,"max":60},{"label":"Tinggi","min":60,"max":100}]',
  1, 'uji-jawaban-2.csv', 'Jawaban Uji', repeat('b', 64), '2026-02-01T00:00:00Z'
);
insert into research.preliminary_items (dataset_id, item_number, dimension, source_file, source_sheet, source_row)
values ('a2000000-3800-4000-8000-000000000002', 1, 'evaluation', 'uji-kisi.csv', 'Kisi Uji', 4);
insert into research.preliminary_respondents (
  id, dataset_id, respondent_code, recorded_category, recorded_total, recorded_score,
  source_file, source_sheet, source_row
) values (
  'a3000000-3800-4000-8000-000000000004', 'a2000000-3800-4000-8000-000000000002',
  'K01', 'Tinggi', 4, 100, 'uji-jawaban-2.csv', 'Jawaban Uji', 2
);
insert into research.preliminary_responses (respondent_id, dataset_id, item_number, answer_text, score, answer_column, score_column)
values ('a3000000-3800-4000-8000-000000000004', 'a2000000-3800-4000-8000-000000000002', 1, 'Jawaban koreksi', 4, 'Soal 1', 'Skor 1');

select pg_temp.act_as('a1000000-3800-4000-8000-000000000002');
select is(
  (select public.preliminary_study_overview()->'dataset'->>'id'),
  'a2000000-3800-4000-8000-000000000002',
  'Ringkasan membaca dataset terbaru organisasi'
);

select * from finish();
rollback;
