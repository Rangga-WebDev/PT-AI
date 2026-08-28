-- Test tata kelola penelitian (PHASE 14).
-- Menegakkan SEC-005, kerahasiaan consent, dan batas akses schema research.
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

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

select pg_temp.make_user('11111111-9999-4999-8999-111111111111', 'gv.student.a@test.invalid');
select pg_temp.make_user('22222222-9999-4999-8999-222222222222', 'gv.student.b@test.invalid');
select pg_temp.make_user('33333333-9999-4999-8999-333333333333', 'gv.lecturer@test.invalid');
select pg_temp.make_user('55555555-9999-4999-8999-555555555555', 'gv.admin@test.invalid');

insert into public.organizations (id, name, code)
values ('99000000-0000-4000-8000-000000000001', 'Universitas Governance', 'UGV');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('11111111-9999-4999-8999-111111111111', '99000000-0000-4000-8000-000000000001', 'Mahasiswa GA', 'GV-1001'),
  ('22222222-9999-4999-8999-222222222222', '99000000-0000-4000-8000-000000000001', 'Mahasiswa GB', 'GV-1002'),
  ('33333333-9999-4999-8999-333333333333', '99000000-0000-4000-8000-000000000001', 'Dosen Governance', 'GV-2001'),
  ('55555555-9999-4999-8999-555555555555', '99000000-0000-4000-8000-000000000001', 'Admin Governance', 'GV-3001');

insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
select p.id, r.id, '99000000-0000-4000-8000-000000000001', '55555555-9999-4999-8999-555555555555'
from (values
  ('11111111-9999-4999-8999-111111111111'::uuid, 'student'::public.role_key),
  ('22222222-9999-4999-8999-222222222222'::uuid, 'student'::public.role_key),
  ('33333333-9999-4999-8999-333333333333'::uuid, 'lecturer'::public.role_key),
  ('55555555-9999-4999-8999-555555555555'::uuid, 'admin'::public.role_key)
) as p(id, role_key)
join public.roles r on r.key = p.role_key;

-- === Skenario ===============================================================

-- 1. Mahasiswa mencatat persetujuannya sendiri.
select pg_temp.act_as('11111111-9999-4999-8999-111111111111');
select lives_ok(
  $$insert into public.consent_records (id, profile_id, study_key, status, document_version, consented_at)
    values ('99000000-0000-4000-8000-000000000010', '11111111-9999-4999-8999-111111111111',
            'uji-governance', 'granted', '1.0', now())$$,
  'Mahasiswa dapat mencatat persetujuannya sendiri'
);

-- 2. Mahasiswa tidak dapat mencatat persetujuan atas nama orang lain.
select throws_ok(
  $$insert into public.consent_records (profile_id, study_key, status, document_version, consented_at)
    values ('22222222-9999-4999-8999-222222222222', 'uji-governance', 'granted', '1.0', now())$$,
  '42501',
  null,
  'Persetujuan tidak dapat dicatatkan atas nama mahasiswa lain'
);

-- 3. Status granted wajib menyertakan waktu persetujuan.
select throws_ok(
  $$insert into public.consent_records (profile_id, study_key, status, document_version)
    values ('11111111-9999-4999-8999-111111111111', 'uji-granted-tanpa-waktu', 'granted', '1.0')$$,
  '23514',
  null,
  'Persetujuan tanpa waktu persetujuan ditolak'
);

-- 4. Mahasiswa lain tidak dapat membaca persetujuan orang lain.
select pg_temp.act_as('22222222-9999-4999-8999-222222222222');
select is(
  (select count(*)::int from public.consent_records
   where profile_id = '11111111-9999-4999-8999-111111111111'),
  0,
  'Mahasiswa lain tidak dapat membaca persetujuan yang bukan miliknya'
);

-- 5. Dosen tidak dapat membaca persetujuan sama sekali.
select pg_temp.act_as('33333333-9999-4999-8999-333333333333');
select is(
  (select count(*)::int from public.consent_records),
  0,
  'Dosen tidak dapat melihat keikutsertaan penelitian mahasiswanya'
);

-- 6. Dosen tidak dapat menetapkan aturan retensi.
select throws_ok(
  $$insert into public.data_retention_rules (organization_id, domain_key, retention_days, action)
    values ('99000000-0000-4000-8000-000000000001', 'uji-domain', 30, 'anonymize')$$,
  '42501',
  null,
  'Dosen tidak dapat menetapkan aturan retensi'
);

-- 7. Dosen tidak dapat membaca log audit.
select is(
  (select count(*)::int from public.audit_logs),
  0,
  'Dosen tidak dapat membaca log audit'
);

-- 8. Admin dapat menetapkan aturan retensi.
select pg_temp.act_as('55555555-9999-4999-8999-555555555555');
select lives_ok(
  $$insert into public.data_retention_rules (organization_id, domain_key, retention_days, action)
    values ('99000000-0000-4000-8000-000000000001', 'uji-domain', 30, 'anonymize')$$,
  'Admin dapat menetapkan aturan retensi'
);

-- 9. Admin tidak dapat membaca pemetaan identitas peserta penelitian.
select throws_ok(
  $$select count(*) from research.participants$$,
  '42501',
  null,
  'Admin tidak dapat membaca pemetaan identitas peserta'
);

-- 10. Mahasiswa juga tidak dapat menyentuh schema research.
select pg_temp.act_as('11111111-9999-4999-8999-111111111111');
select throws_ok(
  $$select count(*) from research.participants$$,
  '42501',
  null,
  'Mahasiswa tidak dapat membaca schema research'
);

-- 11. Fungsi ekspor tidak dapat dieksekusi peran klien.
select is(
  has_function_privilege('authenticated', 'public.export_ct_scores()', 'execute'),
  false,
  'Peran authenticated tidak dapat mengeksekusi fungsi ekspor'
);

select is(
  has_function_privilege('anon', 'public.export_attempt_metrics()', 'execute'),
  false,
  'Peran anon tidak dapat mengeksekusi fungsi ekspor'
);

-- 12. Pendaftaran peserta juga tertutup bagi peran klien.
select is(
  has_function_privilege('authenticated', 'public.register_research_participant(uuid, uuid, text)', 'execute'),
  false,
  'Peran authenticated tidak dapat mendaftarkan peserta penelitian'
);

-- 13. Menarik persetujuan menghilangkan peserta dari view ekspor.
select pg_temp.act_as_service();

insert into research.participants (profile_id, consent_record_id, pseudonym)
values ('11111111-9999-4999-8999-111111111111', '99000000-0000-4000-8000-000000000010', 'P-UJIGOV1');

update public.consent_records
set status = 'withdrawn', withdrawn_at = now()
where id = '99000000-0000-4000-8000-000000000010';

select is(
  (select count(*)::int from research.v_ct_scores where pseudonym = 'P-UJIGOV1'),
  0,
  'Peserta yang menarik persetujuan tidak lagi muncul pada view ekspor'
);

select * from finish();
rollback;
