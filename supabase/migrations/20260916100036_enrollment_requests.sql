alter table public.classes add column join_code text not null
  default upper(encode(extensions.gen_random_bytes(6), 'hex'))
  constraint uq_classes_join_code unique
  constraint ck_classes_join_code check (join_code ~ '^[A-F0-9]{12}$');

create table public.enrollment_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete restrict,
  decision_note text check (length(decision_note) <= 500),
  constraint uq_enrollment_requests_student_class unique (class_id, student_id),
  constraint ck_enrollment_requests_decision check (
    (status = 'pending' and decided_at is null and decided_by is null and decision_note is null)
    or (status in ('approved', 'rejected') and decided_at is not null and decided_by is not null)
  ),
  constraint ck_enrollment_requests_rejection check (
    status <> 'rejected' or (decision_note is not null and length(btrim(decision_note)) >= 5)
  )
);

create index idx_enrollment_requests_student on public.enrollment_requests(student_id, requested_at desc);
create index idx_enrollment_requests_pending on public.enrollment_requests(class_id, status, requested_at);
alter table public.enrollment_requests enable row level security;
revoke all on public.enrollment_requests from anon, authenticated;
grant select on public.enrollment_requests to authenticated;
grant all on public.enrollment_requests to service_role;

create policy enrollment_requests_select on public.enrollment_requests
  for select to authenticated using (
    public.organization_of_class(class_id) = public.current_organization_id()
    and (student_id = auth.uid() or public.is_lecturer_of_class(class_id))
  );

create function public.request_enrollment(p_join_code text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := public.current_organization_id();
  v_class uuid;
  v_request uuid;
begin
  if v_actor is null or v_org is null or not public.has_role('student') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if not public.consume_rate_limit('class_join', 20, 3600) then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited');
  end if;

  select c.id into v_class from public.classes c
  join public.courses course on course.id = c.course_id
  where c.join_code = upper(btrim(p_join_code))
    and c.status = 'published' and c.deleted_at is null
    and course.organization_id = v_org and course.deleted_at is null
  for update of c;
  if v_class is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_join_code');
  end if;
  if exists (select 1 from public.enrollments where class_id = v_class and student_id = v_actor) then
    return jsonb_build_object('ok', false, 'reason', 'already_enrolled');
  end if;

  select id into v_request from public.enrollment_requests
  where class_id = v_class and student_id = v_actor;
  if v_request is not null then
    return jsonb_build_object('ok', false, 'reason', 'already_requested');
  end if;
  insert into public.enrollment_requests (class_id, student_id)
  values (v_class, v_actor) returning id into v_request;
  return jsonb_build_object('ok', true, 'requestId', v_request);
end;
$$;

create function public.decide_enrollment_request(
  p_request_id uuid, p_approve boolean, p_note text default null
)
returns uuid
language plpgsql volatile security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := public.current_organization_id();
  v_request public.enrollment_requests%rowtype;
  v_class public.classes%rowtype;
  v_target_class uuid;
  v_status text := case when p_approve then 'approved' else 'rejected' end;
  v_note text := nullif(btrim(p_note), '');
begin
  select class_id into v_target_class from public.enrollment_requests where id = p_request_id;
  if v_actor is null or v_org is null or not public.has_role('lecturer')
     or v_target_class is null or not public.is_lecturer_of_class(v_target_class)
     or public.organization_of_class(v_target_class) is distinct from v_org then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_approve is null or length(v_note) > 500
     or (not p_approve and (v_note is null or length(v_note) < 5)) then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  -- Kunci kelas menyerialkan persetujuan agar kapasitas tidak terlampaui.
  select * into v_class from public.classes where id = v_target_class for update;
  select * into v_request from public.enrollment_requests where id = p_request_id for update;
  if v_request.status <> 'pending' then
    if v_request.status = v_status then return v_request.id; end if;
    raise exception 'already_decided' using errcode = '23001';
  end if;
  if v_class.deleted_at is not null or v_class.status <> 'published' then
    raise exception 'class_unavailable' using errcode = '23001';
  end if;

  if p_approve then
    if not exists (
      select 1 from public.enrollments
      where class_id = v_class.id and student_id = v_request.student_id and status = 'active'
    ) then
      if v_class.capacity is not null and (
        select count(*) from public.enrollments where class_id = v_class.id and status = 'active'
      ) >= v_class.capacity then
        raise exception 'class_full' using errcode = '23001';
      end if;
      perform public.enroll_student_in_class(v_class.id, v_request.student_id);
    end if;
  end if;

  update public.enrollment_requests
  set status = v_status, decided_at = now(), decided_by = v_actor, decision_note = v_note
  where id = p_request_id;
  insert into public.audit_logs (actor_id, actor_role, action, subject_table, subject_id, after)
  values (v_actor, 'lecturer', 'enrollment_request_' || v_status, 'enrollment_requests', p_request_id,
    jsonb_build_object('classId', v_class.id, 'studentId', v_request.student_id, 'status', v_status));
  return p_request_id;
end;
$$;

create function public.list_my_enrollment_requests()
returns table (
  id uuid, class_id uuid, class_name text, course_name text, status text,
  requested_at timestamptz, decided_at timestamptz, decision_note text
)
language sql stable security definer
set search_path = public, pg_catalog
as $$
  select r.id, r.class_id, c.name, course.name, r.status, r.requested_at, r.decided_at, r.decision_note
  from public.enrollment_requests r
  join public.classes c on c.id = r.class_id
  join public.courses course on course.id = c.course_id
  where r.student_id = auth.uid() and public.has_role('student')
    and course.organization_id = public.current_organization_id()
  order by r.requested_at desc;
$$;

create function public.list_class_enrollment_requests(p_class_id uuid)
returns table (
  id uuid, student_id uuid, full_name text, identifier text, status text,
  requested_at timestamptz, decided_at timestamptz, decision_note text
)
language plpgsql stable security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.has_role('lecturer') or not public.is_lecturer_of_class(p_class_id)
     or public.organization_of_class(p_class_id) is distinct from public.current_organization_id() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query
  select r.id, r.student_id, p.full_name, p.identifier, r.status, r.requested_at, r.decided_at, r.decision_note
  from public.enrollment_requests r
  join public.profiles p on p.id = r.student_id
  where r.class_id = p_class_id and p.organization_id = public.current_organization_id()
  order by (r.status = 'pending') desc, r.requested_at;
end;
$$;

revoke execute on function public.request_enrollment(text) from public, anon, authenticated;
revoke execute on function public.decide_enrollment_request(uuid, boolean, text) from public, anon, authenticated;
revoke execute on function public.list_my_enrollment_requests() from public, anon, authenticated;
revoke execute on function public.list_class_enrollment_requests(uuid) from public, anon, authenticated;
grant execute on function public.request_enrollment(text) to authenticated;
grant execute on function public.decide_enrollment_request(uuid, boolean, text) to authenticated;
grant execute on function public.list_my_enrollment_requests() to authenticated;
grant execute on function public.list_class_enrollment_requests(uuid) to authenticated;
