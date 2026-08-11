-- Seed pengembangan — data akademik minimal untuk menjalankan aplikasi lokal.
--
-- BUKAN data penelitian dan BUKAN pengganti mock UI. Akun pengguna tidak dibuat
-- di sini karena pembuatan akun melalui Supabase Auth (PHASE 5); seed ini hanya
-- menyiapkan struktur akademik yang tidak bergantung pada auth.users.
--
-- Menjalankan: npx supabase db reset (lokal) atau eksekusi manual di SQL editor.

insert into public.organizations (id, name, code, kind)
values ('00000000-0000-4000-8000-000000000001', 'Universitas Contoh', 'UC', 'university')
on conflict (code) do nothing;

insert into public.faculties (id, organization_id, name, code)
values (
  '00000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-000000000001',
  'Fakultas Ilmu Sosial dan Ilmu Politik',
  'FISIP'
)
on conflict (organization_id, code) do nothing;

insert into public.study_programs (id, faculty_id, name, code, degree_level)
values (
  '00000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-000000000002',
  'Ilmu Komunikasi',
  'IKOM',
  's1'
)
on conflict (faculty_id, code) do nothing;

insert into public.academic_periods (id, organization_id, name, code, start_date, end_date, is_active)
values (
  '00000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-000000000001',
  'Ganjil 2026/2027',
  '2026-1',
  '2026-08-01',
  '2027-01-31',
  true
)
on conflict (organization_id, code) do nothing;

insert into public.data_retention_rules (organization_id, domain_key, retention_days, action)
values
  ('00000000-0000-4000-8000-000000000001', 'learning_events', 365, 'anonymize'),
  ('00000000-0000-4000-8000-000000000001', 'audit_logs', 1095, 'anonymize')
on conflict (organization_id, domain_key) do nothing;
