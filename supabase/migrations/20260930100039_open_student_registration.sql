-- 0039 — Pendaftaran mahasiswa terbuka untuk surel domain apa pun (mis. gmail.com).
-- Kepemilikan surel tetap tidak diverifikasi; akses kelas tetap menunggu persetujuan dosen atas NIM.

create or replace function public.register_student_profile(
  p_user_id uuid, p_organization_id uuid, p_full_name text, p_identifier text
)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_student_role uuid;
begin
  if p_full_name is null or length(btrim(p_full_name)) not between 2 and 150
     or p_identifier is null or p_identifier !~ '^[0-9]{6,24}$' then
    raise exception 'invalid_registration' using errcode = '22023';
  end if;

  if not exists (select 1 from public.organizations where id = p_organization_id and is_active)
     or not exists (
       select 1 from auth.users
       where id = p_user_id and email ~ '^[^@[:space:]]+@[^@[:space:]]+$'
     ) then
    raise exception 'registration_unavailable' using errcode = '42501';
  end if;

  select id into strict v_student_role from public.roles where key = 'student';
  insert into public.profiles (id, organization_id, full_name, identifier)
  values (p_user_id, p_organization_id, btrim(p_full_name), p_identifier);
  insert into public.role_assignments (profile_id, role_id, organization_id, granted_by)
  values (p_user_id, v_student_role, p_organization_id, p_user_id);
  insert into public.audit_logs (actor_id, actor_role, action, subject_table, subject_id, after)
  values (p_user_id, 'student', 'student_registered', 'profiles', p_user_id,
    jsonb_build_object('organizationId', p_organization_id, 'emailOwnershipVerified', false));
  return p_user_id;
end;
$$;

revoke execute on function public.register_student_profile(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.register_student_profile(uuid, uuid, text, text) to service_role;
