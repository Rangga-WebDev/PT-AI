create table public.registration_rate_limits (
  bucket_hash text not null check (bucket_hash ~ '^[a-f0-9]{64}$'),
  window_start timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (bucket_hash, window_start)
);

create index idx_registration_rate_limits_window
  on public.registration_rate_limits (window_start);
alter table public.registration_rate_limits enable row level security;
revoke all on public.registration_rate_limits from anon, authenticated;
grant all on public.registration_rate_limits to service_role;

create function public.consume_registration_limit(p_ip_hash text, p_email_hash text)
returns boolean
language plpgsql security definer
set search_path = public, pg_catalog
as $$
declare
  v_window timestamptz := date_trunc('hour', now());
  v_ip_hits integer;
  v_email_hits integer;
begin
  insert into public.registration_rate_limits (bucket_hash, window_start, hits)
  values (p_ip_hash, v_window, 1)
  on conflict (bucket_hash, window_start) do update
    set hits = registration_rate_limits.hits + 1
  returning hits into v_ip_hits;

  insert into public.registration_rate_limits (bucket_hash, window_start, hits)
  values (p_email_hash, v_window, 1)
  on conflict (bucket_hash, window_start) do update
    set hits = registration_rate_limits.hits + 1
  returning hits into v_email_hits;

  return v_ip_hits <= 180 and v_email_hits <= 5;
end;
$$;

create function public.register_student_profile(
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
       where id = p_user_id and lower(email) ~ '^[^@]+@student[.]unismuh[.]ac[.]id$'
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

create function public.protect_profile_identity()
returns trigger
language plpgsql security definer
set search_path = public, pg_catalog
as $$
begin
  if auth.role() = 'authenticated' then
    if new.id is distinct from old.id or new.organization_id is distinct from old.organization_id
       or ((new.identifier is distinct from old.identifier or new.is_active is distinct from old.is_active)
           and not public.is_admin_of_organization(old.organization_id)) then
      raise exception 'Identitas akademik hanya dapat diperbarui administrator organisasi.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_profiles_protect_identity before update on public.profiles
  for each row execute function public.protect_profile_identity();

create or replace function public.prune_rate_limit_counters(p_older_than_hours integer default 48)
returns integer
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
  v_deleted integer;
  v_registration_deleted integer;
begin
  delete from public.rate_limit_counters
  where window_start < now() - make_interval(hours => greatest(p_older_than_hours, 1));
  get diagnostics v_deleted = row_count;
  delete from public.registration_rate_limits
  where window_start < now() - make_interval(hours => greatest(p_older_than_hours, 1));
  get diagnostics v_registration_deleted = row_count;
  return v_deleted + v_registration_deleted;
end;
$$;

revoke execute on function public.consume_registration_limit(text, text) from public, anon, authenticated;
revoke execute on function public.register_student_profile(uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.protect_profile_identity() from public, anon, authenticated;
grant execute on function public.consume_registration_limit(text, text) to service_role;
grant execute on function public.register_student_profile(uuid, uuid, text, text) to service_role;
