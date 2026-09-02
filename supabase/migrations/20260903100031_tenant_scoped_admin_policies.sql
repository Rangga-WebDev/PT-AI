-- 0031 — Menutup kebocoran batas organisasi pada kebijakan admin.
--
-- Ditemukan pada Final Checkpoint. `public.is_admin()` hanya menjawab
-- "apakah pemanggil punya peran admin", tanpa menyebut organisasi mana.
-- Akibatnya seluruh kebijakan bertumpu `is_admin()` berlaku lintas tenant:
-- admin Organisasi A dapat membaca dan menulis data Organisasi B pada 27
-- kebijakan, termasuk `profiles`, `role_assignments`, `enrollments`, dan
-- `audit_logs`.
--
-- Perbaikannya menambah predikat organisasi, bukan mengubah arsitektur.
-- Peran non-admin pada kebijakan yang sama tidak disentuh.

-- === Pembantu ===============================================================

create or replace function public.is_admin_of_organization(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select p_org is not null
     and p_org = public.current_organization_id()
     and public.is_admin();
$$;

create or replace function public.organization_of_class(p_class_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select c.organization_id
  from public.classes cl
  join public.courses c on c.id = cl.course_id
  where cl.id = p_class_id;
$$;

create or replace function public.organization_of_course(p_course_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select c.organization_id from public.courses c where c.id = p_course_id;
$$;

create or replace function public.organization_of_profile(p_profile_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select p.organization_id from public.profiles p where p.id = p_profile_id;
$$;

-- Kebijakan RLS dievaluasi sebagai peran pemanggil, sehingga `authenticated`
-- wajib dapat mengeksekusi pembantu ini. Yang dicabut hanya akses anonim.
revoke execute on function public.is_admin_of_organization(uuid) from public, anon;
revoke execute on function public.organization_of_class(uuid) from public, anon;
revoke execute on function public.organization_of_course(uuid) from public, anon;
revoke execute on function public.organization_of_profile(uuid) from public, anon;

grant execute on function public.is_admin_of_organization(uuid) to authenticated;
grant execute on function public.organization_of_class(uuid) to authenticated;
grant execute on function public.organization_of_course(uuid) to authenticated;
grant execute on function public.organization_of_profile(uuid) to authenticated;

-- === Identitas ==============================================================

drop policy organizations_write on public.organizations;
create policy organizations_write on public.organizations
  for all to authenticated
  using (public.is_admin_of_organization(id))
  with check (public.is_admin_of_organization(id));

drop policy faculties_write on public.faculties;
create policy faculties_write on public.faculties
  for all to authenticated
  using (public.is_admin_of_organization(organization_id))
  with check (public.is_admin_of_organization(organization_id));

drop policy study_programs_write on public.study_programs;
create policy study_programs_write on public.study_programs
  for all to authenticated
  using (
    exists (
      select 1 from public.faculties f
      where f.id = study_programs.faculty_id
        and public.is_admin_of_organization(f.organization_id)
    )
  )
  with check (
    exists (
      select 1 from public.faculties f
      where f.id = study_programs.faculty_id
        and public.is_admin_of_organization(f.organization_id)
    )
  );

drop policy profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_admin_of_organization(organization_id))
  with check (public.is_admin_of_organization(organization_id));

-- Cabang admin dibatasi organisasi; cabang lain tidak berubah.
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or public.is_admin_of_organization(organization_id)
    or exists (
      select 1
      from public.enrollments e
      join public.class_lecturers cl on cl.class_id = e.class_id
      where e.student_id = profiles.id and cl.lecturer_id = auth.uid()
    )
    or exists (
      select 1
      from public.class_lecturers cl
      join public.enrollments e on e.class_id = cl.class_id
      where cl.lecturer_id = profiles.id and e.student_id = auth.uid()
    )
  );

drop policy role_assignments_write on public.role_assignments;
create policy role_assignments_write on public.role_assignments
  for all to authenticated
  using (public.is_admin_of_organization(organization_id))
  with check (public.is_admin_of_organization(organization_id));

drop policy role_assignments_select on public.role_assignments;
create policy role_assignments_select on public.role_assignments
  for select to authenticated using (
    profile_id = auth.uid()
    or public.is_admin_of_organization(organization_id)
  );

-- === Akademik ===============================================================

drop policy academic_periods_write on public.academic_periods;
create policy academic_periods_write on public.academic_periods
  for all to authenticated
  using (public.is_admin_of_organization(organization_id))
  with check (public.is_admin_of_organization(organization_id));

drop policy courses_admin_insert on public.courses;
create policy courses_admin_insert on public.courses
  for insert to authenticated
  with check (public.is_admin_of_organization(organization_id));

drop policy courses_admin_update on public.courses;
create policy courses_admin_update on public.courses
  for update to authenticated
  using (public.is_admin_of_organization(organization_id))
  with check (public.is_admin_of_organization(organization_id));

drop policy courses_admin_delete on public.courses;
create policy courses_admin_delete on public.courses
  for delete to authenticated
  using (public.is_admin_of_organization(organization_id));

drop policy classes_admin_insert on public.classes;
create policy classes_admin_insert on public.classes
  for insert to authenticated
  with check (
    public.is_admin_of_organization(public.organization_of_course(course_id))
  );

drop policy classes_admin_update on public.classes;
create policy classes_admin_update on public.classes
  for update to authenticated
  using (
    public.is_admin_of_organization(public.organization_of_course(course_id))
  )
  with check (
    public.is_admin_of_organization(public.organization_of_course(course_id))
  );

drop policy classes_admin_delete on public.classes;
create policy classes_admin_delete on public.classes
  for delete to authenticated
  using (
    public.is_admin_of_organization(public.organization_of_course(course_id))
  );

drop policy classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated using (
    deleted_at is null
    and (
      public.is_admin_of_organization(public.organization_of_course(course_id))
      or public.is_lecturer_of_class(id)
      or (status = 'published' and public.is_enrolled_in_class(id))
    )
  );

drop policy class_lecturers_write on public.class_lecturers;
create policy class_lecturers_write on public.class_lecturers
  for all to authenticated
  using (
    public.is_admin_of_organization(public.organization_of_class(class_id))
  )
  with check (
    public.is_admin_of_organization(public.organization_of_class(class_id))
  );

drop policy class_lecturers_select on public.class_lecturers;
create policy class_lecturers_select on public.class_lecturers
  for select to authenticated using (
    public.is_admin_of_organization(public.organization_of_class(class_id))
    or lecturer_id = auth.uid()
    or public.is_enrolled_in_class(class_id)
  );

drop policy enrollments_admin_write on public.enrollments;
create policy enrollments_admin_write on public.enrollments
  for all to authenticated
  using (
    public.is_admin_of_organization(public.organization_of_class(class_id))
  )
  with check (
    public.is_admin_of_organization(public.organization_of_class(class_id))
  );

drop policy enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_admin_of_organization(public.organization_of_class(class_id))
    or public.is_lecturer_of_class(class_id)
  );

-- === Tata kelola ============================================================

drop policy error_categories_admin_write on public.error_categories;
create policy error_categories_admin_write on public.error_categories
  for all to authenticated
  using (public.is_admin_of_organization(organization_id))
  with check (public.is_admin_of_organization(organization_id));

drop policy ai_prompt_templates_admin_write on public.ai_prompt_templates;
create policy ai_prompt_templates_admin_write on public.ai_prompt_templates
  for all to authenticated
  using (public.is_admin_of_organization(organization_id))
  with check (public.is_admin_of_organization(organization_id));

drop policy ai_prompt_templates_select on public.ai_prompt_templates;
create policy ai_prompt_templates_select on public.ai_prompt_templates
  for select to authenticated using (
    organization_id = public.current_organization_id()
    and (public.is_admin() or public.has_role('lecturer'::public.role_key))
  );

drop policy data_retention_rules_admin on public.data_retention_rules;
create policy data_retention_rules_admin on public.data_retention_rules
  for all to authenticated
  using (public.is_admin_of_organization(organization_id))
  with check (public.is_admin_of_organization(organization_id));

drop policy consent_records_select on public.consent_records;
create policy consent_records_select on public.consent_records
  for select to authenticated using (
    profile_id = auth.uid()
    or public.is_admin_of_organization(public.organization_of_profile(profile_id))
  );

drop policy ai_incidents_select on public.ai_incidents;
create policy ai_incidents_select on public.ai_incidents
  for select to authenticated using (
    reporter_id = auth.uid()
    or public.is_admin_of_organization(public.organization_of_class(class_id))
    or public.is_lecturer_of_class(class_id)
  );

drop policy fidelity_records_select on public.fidelity_records;
create policy fidelity_records_select on public.fidelity_records
  for select to authenticated using (
    public.is_admin_of_organization(public.organization_of_class(class_id))
    or public.is_lecturer_of_class(class_id)
  );

-- Jejak audit yang ditulis koneksi istimewa tidak punya pelaku, sehingga tidak
-- dapat dipetakan ke organisasi mana pun. Baris itu sengaja hanya terbaca oleh
-- koneksi istimewa, bukan oleh admin tenant mana pun.
drop policy audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select on public.audit_logs
  for select to authenticated using (
    actor_id is not null
    and public.is_admin_of_organization(public.organization_of_profile(actor_id))
  );
