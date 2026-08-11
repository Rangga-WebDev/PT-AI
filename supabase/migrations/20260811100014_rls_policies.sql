-- 0014 — Row Level Security untuk seluruh tabel.
-- Referensi: docs/RLS_MATRIX.md.
--
-- Catatan: service_role Supabase mem-bypass RLS. Perlindungan append-only
-- karena itu tidak bergantung pada policy melainkan pada trigger (0013).

-- === Aktifkan RLS pada setiap tabel ========================================

do $$
declare
  t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end;
$$;

alter table research.participants enable row level security;

-- === Domain 1: Identity =====================================================

create policy organizations_select on public.organizations
  for select to authenticated using (id = public.current_organization_id());
create policy organizations_write on public.organizations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy faculties_select on public.faculties
  for select to authenticated using (organization_id = public.current_organization_id());
create policy faculties_write on public.faculties
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy study_programs_select on public.study_programs
  for select to authenticated using (
    exists (
      select 1 from public.faculties f
      where f.id = faculty_id and f.organization_id = public.current_organization_id()
    )
  );
create policy study_programs_write on public.study_programs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Mahasiswa melihat profilnya sendiri; dosen melihat peserta kelasnya.
create policy profiles_select on public.profiles
  for select to authenticated using (
    id = auth.uid()
    or public.is_admin()
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

-- Pembatasan kolom yang boleh diubah sendiri ditegakkan di Server Action.
create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_write on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Kamus peran berisi tiga baris statis tanpa data pribadi; aman dibaca semua
-- pengguna terautentikasi.
create policy roles_select on public.roles
  for select to authenticated using (true);

create policy role_assignments_select on public.role_assignments
  for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy role_assignments_write on public.role_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- === Domain 2: Academic =====================================================

create policy academic_periods_select on public.academic_periods
  for select to authenticated using (organization_id = public.current_organization_id());
create policy academic_periods_write on public.academic_periods
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy courses_select on public.courses
  for select to authenticated using (
    organization_id = public.current_organization_id() and deleted_at is null
  );
create policy courses_write on public.courses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy classes_select on public.classes
  for select to authenticated using (
    deleted_at is null
    and (
      public.is_admin()
      or public.is_lecturer_of_class(id)
      or (status = 'published' and public.is_enrolled_in_class(id))
    )
  );
create policy classes_admin_write on public.classes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy classes_lecturer_update on public.classes
  for update to authenticated
  using (public.is_lecturer_of_class(id))
  with check (public.is_lecturer_of_class(id));

create policy class_lecturers_select on public.class_lecturers
  for select to authenticated using (
    public.is_admin()
    or lecturer_id = auth.uid()
    or public.is_enrolled_in_class(class_id)
  );
create policy class_lecturers_write on public.class_lecturers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy enrollments_select on public.enrollments
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_admin()
    or public.is_lecturer_of_class(class_id)
  );
create policy enrollments_admin_write on public.enrollments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy enrollments_lecturer_update on public.enrollments
  for update to authenticated
  using (public.is_lecturer_of_class(class_id))
  with check (public.is_lecturer_of_class(class_id));

-- === Domain 3: Content ======================================================
-- Admin sengaja tidak diberi akses baca substansi materi akademik (SEC-005).

create policy modules_select on public.modules
  for select to authenticated using (
    deleted_at is null
    and (
      public.is_lecturer_of_class(class_id)
      or (status = 'published' and public.is_enrolled_in_class(class_id))
    )
  );
create policy modules_lecturer_write on public.modules
  for all to authenticated
  using (public.is_lecturer_of_class(class_id))
  with check (public.is_lecturer_of_class(class_id));

create policy learning_units_select on public.learning_units
  for select to authenticated using (
    deleted_at is null
    and (
      public.is_lecturer_of_class(public.class_of_learning_unit(id))
      or (
        status = 'published'
        and (opens_at is null or opens_at <= now())
        and public.is_enrolled_in_class(public.class_of_learning_unit(id))
      )
    )
  );
create policy learning_units_lecturer_write on public.learning_units
  for all to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(id)))
  with check (public.is_lecturer_of_class(public.class_of_module(module_id)));

create policy cases_select on public.cases
  for select to authenticated using (
    deleted_at is null
    and exists (
      select 1 from public.learning_units lu
      where lu.id = learning_unit_id
    )
  );
create policy cases_lecturer_write on public.cases
  for all to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)))
  with check (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)));

create policy learning_stages_select on public.learning_stages
  for select to authenticated using (
    public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id))
    or public.is_enrolled_in_class(public.class_of_learning_unit(learning_unit_id))
  );
create policy learning_stages_lecturer_update on public.learning_stages
  for update to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)))
  with check (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)));

create policy activities_select on public.activities
  for select to authenticated using (
    deleted_at is null and public.can_access_activity(id)
  );
create policy activities_lecturer_write on public.activities
  for all to authenticated
  using (public.is_lecturer_of_class(public.class_of_activity(id)))
  with check (public.is_lecturer_of_class(public.class_of_stage(learning_stage_id)));

-- Catatan pedagogis dosen tidak terbaca mahasiswa.
create policy activity_instructions_select on public.activity_instructions
  for select to authenticated using (
    public.is_lecturer_of_class(public.class_of_activity(activity_id))
    or (audience = 'student' and public.can_student_read_activity(activity_id))
  );
create policy activity_instructions_lecturer_write on public.activity_instructions
  for all to authenticated
  using (public.is_lecturer_of_class(public.class_of_activity(activity_id)))
  with check (public.is_lecturer_of_class(public.class_of_activity(activity_id)));

create policy learning_resources_select on public.learning_resources
  for select to authenticated using (
    deleted_at is null
    and (
      (activity_id is not null and public.can_access_activity(activity_id))
      or (
        learning_unit_id is not null
        and (
          public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id))
          or public.is_enrolled_in_class(public.class_of_learning_unit(learning_unit_id))
        )
      )
    )
  );
create policy learning_resources_lecturer_write on public.learning_resources
  for all to authenticated
  using (
    (activity_id is not null and public.is_lecturer_of_class(public.class_of_activity(activity_id)))
    or (learning_unit_id is not null and public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)))
  )
  with check (
    (activity_id is not null and public.is_lecturer_of_class(public.class_of_activity(activity_id)))
    or (learning_unit_id is not null and public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)))
  );

-- === Domain 4: Sources ======================================================

create policy sources_select on public.sources
  for select to authenticated using (
    deleted_at is null
    and organization_id = public.current_organization_id()
    and (
      public.has_role('lecturer'::public.role_key)
      or exists (
        select 1
        from public.case_sources cs
        join public.cases c on c.id = cs.case_id
        where cs.source_id = sources.id
          and public.is_enrolled_in_class(public.class_of_learning_unit(c.learning_unit_id))
      )
    )
  );
create policy sources_lecturer_insert on public.sources
  for insert to authenticated
  with check (public.has_role('lecturer'::public.role_key) and created_by = auth.uid());
create policy sources_lecturer_update on public.sources
  for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy source_versions_select on public.source_versions
  for select to authenticated using (
    exists (select 1 from public.sources s where s.id = source_id)
  );
create policy source_versions_lecturer_write on public.source_versions
  for all to authenticated
  using (public.has_role('lecturer'::public.role_key))
  with check (public.has_role('lecturer'::public.role_key));

create policy source_files_select on public.source_files
  for select to authenticated using (
    exists (select 1 from public.source_versions sv where sv.id = source_version_id)
  );
create policy source_files_lecturer_write on public.source_files
  for all to authenticated
  using (public.has_role('lecturer'::public.role_key))
  with check (public.has_role('lecturer'::public.role_key));

-- Embedding tidak pernah dikirim ke browser; retrieval dilakukan server-side.
create policy source_chunks_no_client_access on public.source_chunks
  for select to authenticated using (false);

create policy case_sources_select on public.case_sources
  for select to authenticated using (
    exists (
      select 1 from public.cases c
      where c.id = case_id
        and (
          public.is_lecturer_of_class(public.class_of_learning_unit(c.learning_unit_id))
          or public.is_enrolled_in_class(public.class_of_learning_unit(c.learning_unit_id))
        )
    )
  );
create policy case_sources_lecturer_write on public.case_sources
  for all to authenticated
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id
        and public.is_lecturer_of_class(public.class_of_learning_unit(c.learning_unit_id))
    )
  )
  with check (
    exists (
      select 1 from public.cases c
      where c.id = case_id
        and public.is_lecturer_of_class(public.class_of_learning_unit(c.learning_unit_id))
    )
  );

create policy claims_select on public.claims
  for select to authenticated using (
    author_id = auth.uid()
    or origin = 'case'
    or (activity_id is not null and public.is_lecturer_of_class(public.class_of_activity(activity_id)))
  );
create policy claims_student_insert on public.claims
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and activity_id is not null
    and public.can_student_read_activity(activity_id)
  );
create policy claims_lecturer_write on public.claims
  for all to authenticated
  using (activity_id is not null and public.is_lecturer_of_class(public.class_of_activity(activity_id)))
  with check (activity_id is not null and public.is_lecturer_of_class(public.class_of_activity(activity_id)));

create policy claim_source_links_select on public.claim_source_links
  for select to authenticated using (
    linked_by = auth.uid()
    or exists (
      select 1 from public.claims c
      where c.id = claim_id
        and c.activity_id is not null
        and public.is_lecturer_of_class(public.class_of_activity(c.activity_id))
    )
  );
create policy claim_source_links_insert on public.claim_source_links
  for insert to authenticated with check (linked_by = auth.uid());
create policy claim_source_links_modify on public.claim_source_links
  for update to authenticated using (linked_by = auth.uid()) with check (linked_by = auth.uid());
create policy claim_source_links_delete on public.claim_source_links
  for delete to authenticated using (linked_by = auth.uid());

create policy source_verifications_select on public.source_verifications
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_lecturer_of_class(public.class_of_activity(activity_id))
  );
create policy source_verifications_student_insert on public.source_verifications
  for insert to authenticated
  with check (student_id = auth.uid() and public.can_student_read_activity(activity_id));

-- === Domain 5: Rubrics ======================================================
-- Mahasiswa berhak melihat kriteria penilaian yang dikenakan padanya.

create policy rubrics_select on public.rubrics
  for select to authenticated using (
    deleted_at is null and organization_id = public.current_organization_id()
  );
create policy rubrics_lecturer_insert on public.rubrics
  for insert to authenticated
  with check (public.has_role('lecturer'::public.role_key) and created_by = auth.uid());
create policy rubrics_lecturer_modify on public.rubrics
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy rubric_criteria_select on public.rubric_criteria
  for select to authenticated using (
    exists (select 1 from public.rubrics r where r.id = rubric_id)
  );
create policy rubric_criteria_write on public.rubric_criteria
  for all to authenticated
  using (exists (select 1 from public.rubrics r where r.id = rubric_id and r.created_by = auth.uid()))
  with check (exists (select 1 from public.rubrics r where r.id = rubric_id and r.created_by = auth.uid()));

create policy rubric_levels_select on public.rubric_levels
  for select to authenticated using (
    exists (select 1 from public.rubric_criteria rc where rc.id = rubric_criterion_id)
  );
create policy rubric_levels_write on public.rubric_levels
  for all to authenticated
  using (
    exists (
      select 1 from public.rubric_criteria rc
      join public.rubrics r on r.id = rc.rubric_id
      where rc.id = rubric_criterion_id and r.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.rubric_criteria rc
      join public.rubrics r on r.id = rc.rubric_id
      where rc.id = rubric_criterion_id and r.created_by = auth.uid()
    )
  );

-- === Domain 6: Student Process =============================================
-- Tidak ada policy UPDATE atau DELETE untuk attempts dan turunannya.

create policy attempt_drafts_own on public.attempt_drafts
  for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy attempts_select on public.attempts
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_lecturer_of_class(public.class_of_activity(activity_id))
  );
create policy attempts_student_insert on public.attempts
  for insert to authenticated
  with check (student_id = auth.uid() and public.can_student_read_activity(activity_id));

create policy attempt_answers_select on public.attempt_answers
  for select to authenticated using (
    exists (
      select 1 from public.attempts a
      where a.id = attempt_id
        and (a.student_id = auth.uid() or public.is_lecturer_of_class(public.class_of_activity(a.activity_id)))
    )
  );
create policy attempt_answers_student_insert on public.attempt_answers
  for insert to authenticated
  with check (
    exists (select 1 from public.attempts a where a.id = attempt_id and a.student_id = auth.uid())
  );

create policy revisions_select on public.revisions
  for select to authenticated using (
    student_id = auth.uid()
    or exists (
      select 1 from public.attempts a
      where a.id = attempt_id and public.is_lecturer_of_class(public.class_of_activity(a.activity_id))
    )
  );
create policy revisions_student_insert on public.revisions
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.attempts a where a.id = attempt_id and a.student_id = auth.uid())
  );

create policy revision_reasons_select on public.revision_reasons
  for select to authenticated using (
    exists (
      select 1 from public.revisions r
      join public.attempts a on a.id = r.attempt_id
      where r.id = revision_id
        and (r.student_id = auth.uid() or public.is_lecturer_of_class(public.class_of_activity(a.activity_id)))
    )
  );
create policy revision_reasons_student_insert on public.revision_reasons
  for insert to authenticated
  with check (
    exists (select 1 from public.revisions r where r.id = revision_id and r.student_id = auth.uid())
  );

create policy feedback_records_select on public.feedback_records
  for select to authenticated using (
    exists (
      select 1 from public.attempts a
      where a.id = feedback_records.attempt_id
        and (a.student_id = auth.uid() or public.is_lecturer_of_class(public.class_of_activity(a.activity_id)))
    )
    or exists (
      select 1 from public.revisions r
      join public.attempts a2 on a2.id = r.attempt_id
      where r.id = feedback_records.revision_id
        and (r.student_id = auth.uid() or public.is_lecturer_of_class(public.class_of_activity(a2.activity_id)))
    )
  );
create policy feedback_records_lecturer_insert on public.feedback_records
  for insert to authenticated
  with check (source = 'lecturer' and author_id = auth.uid());

create policy verifications_select on public.verifications
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_lecturer_of_class(public.class_of_activity(activity_id))
  );
create policy verifications_student_insert on public.verifications
  for insert to authenticated
  with check (student_id = auth.uid() and public.can_student_read_activity(activity_id));

create policy reflections_select on public.reflections
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_lecturer_of_class(public.class_of_activity(activity_id))
  );
create policy reflections_student_insert on public.reflections
  for insert to authenticated
  with check (student_id = auth.uid() and public.can_student_read_activity(activity_id));

create policy mastery_results_select on public.mastery_results
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_lecturer_of_class(public.class_of_activity(activity_id))
  );
create policy mastery_results_lecturer_insert on public.mastery_results
  for insert to authenticated
  with check (
    public.is_lecturer_of_class(public.class_of_activity(activity_id))
    and evaluator_kind = 'lecturer'
    and evaluator_id = auth.uid()
  );

-- === Domain 7: Adaptive =====================================================

create policy error_categories_select on public.error_categories
  for select to authenticated using (
    organization_id is null or organization_id = public.current_organization_id()
  );
create policy error_categories_admin_write on public.error_categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy branching_rules_lecturer_all on public.branching_rules
  for all to authenticated
  using (public.is_lecturer_of_class(public.class_of_activity(activity_id)))
  with check (public.is_lecturer_of_class(public.class_of_activity(activity_id)));

-- Mahasiswa wajib dapat membaca keputusan yang dikenakan padanya (LOCK-PED-009).
create policy branching_decisions_select on public.branching_decisions
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_lecturer_of_class(public.class_of_activity(activity_id))
  );
create policy branching_decisions_lecturer_insert on public.branching_decisions
  for insert to authenticated
  with check (public.is_lecturer_of_class(public.class_of_activity(activity_id)));

create policy remedial_units_select on public.remedial_units
  for select to authenticated using (
    public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id))
    or public.is_enrolled_in_class(public.class_of_learning_unit(learning_unit_id))
  );
create policy remedial_units_lecturer_write on public.remedial_units
  for all to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)))
  with check (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)));

create policy enrichment_units_select on public.enrichment_units
  for select to authenticated using (
    public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id))
    or public.is_enrolled_in_class(public.class_of_learning_unit(learning_unit_id))
  );
create policy enrichment_units_lecturer_write on public.enrichment_units
  for all to authenticated
  using (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)))
  with check (public.is_lecturer_of_class(public.class_of_learning_unit(learning_unit_id)));

-- Mahasiswa hanya melihat override yang menyangkut artefak miliknya sendiri.
create policy lecturer_overrides_select on public.lecturer_overrides
  for select to authenticated using (
    lecturer_id = auth.uid()
    or (
      subject_kind = 'mastery_result'
      and exists (select 1 from public.mastery_results mr where mr.id = subject_id and mr.student_id = auth.uid())
    )
    or (
      subject_kind = 'assessment_score'
      and exists (select 1 from public.assessment_scores sc where sc.id = subject_id and sc.student_id = auth.uid())
    )
    or (
      subject_kind = 'branching_decision'
      and exists (select 1 from public.branching_decisions bd where bd.id = subject_id and bd.student_id = auth.uid())
    )
    or (
      subject_kind = 'ai_feedback'
      and exists (
        select 1
        from public.ai_feedback f
        join public.ai_interactions i on i.id = f.ai_interaction_id
        where f.id = subject_id and i.student_id = auth.uid()
      )
    )
  );
create policy lecturer_overrides_insert on public.lecturer_overrides
  for insert to authenticated
  with check (lecturer_id = auth.uid() and public.has_role('lecturer'::public.role_key));

-- === Domain 8: AI ===========================================================

create policy ai_prompt_templates_select on public.ai_prompt_templates
  for select to authenticated using (
    public.is_admin() or public.has_role('lecturer'::public.role_key)
  );
create policy ai_prompt_templates_admin_write on public.ai_prompt_templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy ai_interactions_select on public.ai_interactions
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_lecturer_of_class(public.class_of_activity(activity_id))
  );

create policy ai_feedback_select on public.ai_feedback
  for select to authenticated using (
    exists (
      select 1 from public.ai_interactions i
      where i.id = ai_interaction_id
        and (i.student_id = auth.uid() or public.is_lecturer_of_class(public.class_of_activity(i.activity_id)))
    )
  );
-- Hanya kolom student_action dan acted_at yang berubah; dibatasi Server Action.
create policy ai_feedback_student_action on public.ai_feedback
  for update to authenticated
  using (
    exists (select 1 from public.ai_interactions i where i.id = ai_interaction_id and i.student_id = auth.uid())
  )
  with check (
    exists (select 1 from public.ai_interactions i where i.id = ai_interaction_id and i.student_id = auth.uid())
  );

create policy ai_citations_select on public.ai_citations
  for select to authenticated using (
    exists (
      select 1 from public.ai_feedback f
      join public.ai_interactions i on i.id = f.ai_interaction_id
      where f.id = ai_feedback_id
        and (i.student_id = auth.uid() or public.is_lecturer_of_class(public.class_of_activity(i.activity_id)))
    )
  );
create policy ai_citations_student_verify on public.ai_citations
  for update to authenticated
  using (
    exists (
      select 1 from public.ai_feedback f
      join public.ai_interactions i on i.id = f.ai_interaction_id
      where f.id = ai_feedback_id and i.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_feedback f
      join public.ai_interactions i on i.id = f.ai_interaction_id
      where f.id = ai_feedback_id and i.student_id = auth.uid()
    )
  );

create policy ai_incidents_select on public.ai_incidents
  for select to authenticated using (
    reporter_id = auth.uid()
    or public.is_admin()
    or public.is_lecturer_of_class(class_id)
  );
create policy ai_incidents_student_insert on public.ai_incidents
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_enrolled_in_class(class_id));
create policy ai_incidents_lecturer_update on public.ai_incidents
  for update to authenticated
  using (public.is_lecturer_of_class(class_id)) with check (public.is_lecturer_of_class(class_id));

create policy ai_disclosures_select on public.ai_disclosures
  for select to authenticated using (
    student_id = auth.uid()
    or public.is_lecturer_of_class(public.class_of_activity(activity_id))
  );
create policy ai_disclosures_student_insert on public.ai_disclosures
  for insert to authenticated
  with check (student_id = auth.uid() and public.can_student_read_activity(activity_id));

-- === Domain 9: Assessment ===================================================
-- Admin tidak memiliki policy apa pun pada nilai (SEC-005).

create policy assessments_select on public.assessments
  for select to authenticated using (
    public.is_lecturer_of_class(class_id) or public.is_enrolled_in_class(class_id)
  );
create policy assessments_lecturer_write on public.assessments
  for all to authenticated
  using (public.is_lecturer_of_class(class_id)) with check (public.is_lecturer_of_class(class_id));

create policy assessment_scores_select on public.assessment_scores
  for select to authenticated using (
    (student_id = auth.uid() and is_final)
    or exists (
      select 1 from public.assessments a
      where a.id = assessment_id and public.is_lecturer_of_class(a.class_id)
    )
  );
create policy assessment_scores_lecturer_write on public.assessment_scores
  for all to authenticated
  using (
    exists (select 1 from public.assessments a where a.id = assessment_id and public.is_lecturer_of_class(a.class_id))
  )
  with check (
    exists (select 1 from public.assessments a where a.id = assessment_id and public.is_lecturer_of_class(a.class_id))
    and scored_by = auth.uid()
  );

create policy critical_thinking_scores_select on public.critical_thinking_scores
  for select to authenticated using (
    student_id = auth.uid() or public.is_lecturer_of_class(class_id)
  );
create policy critical_thinking_scores_lecturer_insert on public.critical_thinking_scores
  for insert to authenticated with check (public.is_lecturer_of_class(class_id));

create policy learning_events_select on public.learning_events
  for select to authenticated using (
    student_id = auth.uid() or public.is_lecturer_of_class(class_id)
  );

create policy fidelity_records_select on public.fidelity_records
  for select to authenticated using (
    public.is_admin() or public.is_lecturer_of_class(class_id)
  );
create policy fidelity_records_lecturer_write on public.fidelity_records
  for all to authenticated
  using (public.is_lecturer_of_class(class_id)) with check (public.is_lecturer_of_class(class_id));

-- === Domain 10: Governance ==================================================
-- Dosen sengaja tidak dapat melihat consent agar kesediaan menjadi partisipan
-- penelitian tidak memengaruhi perlakuan akademik.

create policy consent_records_select on public.consent_records
  for select to authenticated using (profile_id = auth.uid() or public.is_admin());
create policy consent_records_student_insert on public.consent_records
  for insert to authenticated with check (profile_id = auth.uid());
create policy consent_records_student_update on public.consent_records
  for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy data_retention_rules_admin on public.data_retention_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy audit_logs_admin_select on public.audit_logs
  for select to authenticated using (public.is_admin());

create policy notifications_own on public.notifications
  for select to authenticated using (recipient_id = auth.uid());
create policy notifications_mark_read on public.notifications
  for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (recipient_id = auth.uid());

-- === Schema research ========================================================
-- Tidak ada policy untuk peran klien: akses hanya melalui Route Handler export
-- yang memakai service_role dan mencatat setiap akses ke audit_logs.
