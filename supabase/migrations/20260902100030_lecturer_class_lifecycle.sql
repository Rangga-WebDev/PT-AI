-- 0030 — Siklus hidup kelas oleh dosen: pembuatan atomik, pencarian mahasiswa,
-- dan pendaftaran.
--
-- Sebelum ini, pembuatan kelas oleh dosen hanya mungkin lewat service role di
-- lapisan aplikasi, karena `classes_admin_write` dan `class_lecturers_write`
-- adalah satu-satunya kebijakan tulis. Akibatnya: RLS dilewati, dan kedua
-- penyisipan tidak berada dalam satu transaksi.
--
-- Ketiga fungsi di bawah menegakkan wewenang di dalam basis data, bukan di
-- lapisan aplikasi. Semuanya security definer karena harus menulis ke tabel
-- yang kebijakannya memang tertutup bagi dosen, dan karena itu setiap fungsi
-- memeriksa peran, kepemilikan kelas, dan organisasi sendiri.
--
-- Penerbitan kelas TIDAK memerlukan fungsi: `classes_lecturer_update` sudah
-- mengizinkan dosen pengampu memperbarui kelasnya.

-- === Pembuatan kelas ========================================================

create or replace function public.create_lecturer_class(
  p_course_id uuid,
  p_academic_period_id uuid,
  p_code text,
  p_capacity smallint default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := public.current_organization_id();
  v_course_name text;
  v_code text := btrim(p_code);
  v_class uuid;
begin
  if v_actor is null or v_org is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not public.has_role('lecturer'::public.role_key) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_code = '' then
    raise exception 'invalid_code' using errcode = '22023';
  end if;

  select c.name into v_course_name
  from public.courses c
  where c.id = p_course_id
    and c.deleted_at is null
    and c.organization_id = v_org;

  if v_course_name is null then
    raise exception 'course_not_found' using errcode = 'P0002';
  end if;

  perform 1
  from public.academic_periods ap
  where ap.id = p_academic_period_id and ap.organization_id = v_org;

  if not found then
    raise exception 'period_not_found' using errcode = 'P0002';
  end if;

  -- Status sengaja dibiarkan pada bawaan 'draft': kelas baru tidak boleh
  -- langsung terlihat mahasiswa.
  insert into public.classes
    (course_id, academic_period_id, code, name, capacity, created_by)
  values
    (p_course_id, p_academic_period_id, v_code,
     v_course_name || ' ' || v_code, p_capacity, v_actor)
  returning id into v_class;

  insert into public.class_lecturers
    (class_id, lecturer_id, role_in_class, assigned_by)
  values
    (v_class, v_actor, 'coordinator', v_actor);

  insert into public.audit_logs
    (actor_id, actor_role, action, subject_table, subject_id, after)
  values
    (v_actor, 'lecturer', 'class_created', 'classes', v_class,
     jsonb_build_object(
       'courseId', p_course_id,
       'academicPeriodId', p_academic_period_id,
       'code', v_code
     ));

  return v_class;
end;
$$;

-- === Pencarian mahasiswa ====================================================
-- `profiles_select` hanya memperlihatkan mahasiswa yang sudah terdaftar di
-- kelas dosen tersebut, sehingga pencarian calon peserta mustahil tanpa jalur
-- ini. Hasilnya dibatasi pada organisasi dosen, akun aktif berperan mahasiswa,
-- dan yang belum terdaftar di kelas bersangkutan.

create or replace function public.search_enrollable_students(
  p_class_id uuid,
  p_query text,
  p_limit integer default 10
)
returns table (id uuid, full_name text, identifier text)
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_org uuid := public.current_organization_id();
  v_term text := btrim(coalesce(p_query, ''));
begin
  if v_org is null or not public.is_lecturer_of_class(p_class_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if length(v_term) < 2 then
    return;
  end if;

  return query
  select p.id, p.full_name, p.identifier
  from public.profiles p
  join public.role_assignments ra on ra.profile_id = p.id
  join public.roles r on r.id = ra.role_id
  where p.organization_id = v_org
    and p.is_active
    and ra.revoked_at is null
    and r.key = 'student'::public.role_key
    and (p.full_name ilike '%' || v_term || '%' or p.identifier ilike '%' || v_term || '%')
    and not exists (
      select 1 from public.enrollments e
      where e.class_id = p_class_id and e.student_id = p.id
    )
  order by p.full_name
  limit least(greatest(coalesce(p_limit, 10), 1), 25);
end;
$$;

-- === Pendaftaran mahasiswa ==================================================

create or replace function public.enroll_student_in_class(
  p_class_id uuid,
  p_student_id uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_org uuid := public.current_organization_id();
  v_enrollment uuid;
begin
  if v_actor is null or v_org is null then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if not public.is_lecturer_of_class(p_class_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Peran mahasiswa diperiksa di sini, bukan dipercaya dari pemanggil.
  perform 1
  from public.profiles p
  join public.role_assignments ra on ra.profile_id = p.id
  join public.roles r on r.id = ra.role_id
  where p.id = p_student_id
    and p.organization_id = v_org
    and p.is_active
    and ra.revoked_at is null
    and r.key = 'student'::public.role_key;

  if not found then
    raise exception 'student_not_found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.enrollments e
    where e.class_id = p_class_id and e.student_id = p_student_id
  ) then
    raise exception 'already_enrolled' using errcode = '23505';
  end if;

  insert into public.enrollments (class_id, student_id, enrolled_by)
  values (p_class_id, p_student_id, v_actor)
  returning id into v_enrollment;

  insert into public.audit_logs
    (actor_id, actor_role, action, subject_table, subject_id, after)
  values
    (v_actor, 'lecturer', 'student_enrolled', 'enrollments', v_enrollment,
     jsonb_build_object('classId', p_class_id, 'studentId', p_student_id));

  return v_enrollment;
end;
$$;

-- === Hak eksekusi ===========================================================
-- Supabase memberi `execute` kepada `authenticated` sebagai grant tersendiri,
-- sehingga pencabutan dari PUBLIC saja tidak cukup (pelajaran migration 0029).

revoke execute on function public.create_lecturer_class(uuid, uuid, text, smallint)
  from public, anon, authenticated;
revoke execute on function public.search_enrollable_students(uuid, text, integer)
  from public, anon, authenticated;
revoke execute on function public.enroll_student_in_class(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.create_lecturer_class(uuid, uuid, text, smallint)
  to authenticated;
grant execute on function public.search_enrollable_students(uuid, text, integer)
  to authenticated;
grant execute on function public.enroll_student_in_class(uuid, uuid)
  to authenticated;
