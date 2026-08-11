-- 0015 — Index berdasarkan query nyata (docs/DATABASE.md bagian 8).
-- Index untuk unique constraint tidak diulang di sini.

-- Identity dan otorisasi
create index idx_profiles_organization on public.profiles (organization_id);
create index idx_role_assignments_profile on public.role_assignments (profile_id) where revoked_at is null;
create index idx_class_lecturers_lecturer on public.class_lecturers (lecturer_id);
create index idx_enrollments_student on public.enrollments (student_id, status);
create index idx_enrollments_class on public.enrollments (class_id) where status = 'active';

-- Struktur konten
create index idx_classes_period on public.classes (academic_period_id) where deleted_at is null;
create index idx_modules_class on public.modules (class_id, sequence) where deleted_at is null;
create index idx_learning_units_module on public.learning_units (module_id, sequence) where deleted_at is null;
create index idx_learning_stages_unit on public.learning_stages (learning_unit_id, sequence);
create index idx_activities_stage on public.activities (learning_stage_id, sequence) where deleted_at is null;
create index idx_activity_instructions_activity on public.activity_instructions (activity_id, audience);
create index idx_learning_resources_unit on public.learning_resources (learning_unit_id) where deleted_at is null;
create index idx_learning_resources_activity on public.learning_resources (activity_id) where deleted_at is null;

-- Sumber dan bukti
create index idx_sources_title_trgm on public.sources using gin (title extensions.gin_trgm_ops);
create index idx_sources_organization on public.sources (organization_id) where deleted_at is null;
create index idx_source_versions_source on public.source_versions (source_id);
create index idx_case_sources_case on public.case_sources (case_id, sequence);
create index idx_claims_activity on public.claims (activity_id);
create index idx_claim_source_links_claim on public.claim_source_links (claim_id);
create index idx_source_verifications_student on public.source_verifications (student_id, activity_id);

-- Retrieval RAG
create index idx_source_chunks_embedding
  on public.source_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

-- Proses mahasiswa
create index idx_attempts_activity_student on public.attempts (activity_id, student_id);
create index idx_attempts_student_recent on public.attempts (student_id, submitted_at desc);
create index idx_attempt_answers_attempt on public.attempt_answers (attempt_id, sequence);
create index idx_revisions_attempt on public.revisions (attempt_id, revision_number);
create index idx_revision_reasons_revision on public.revision_reasons (revision_id);
create index idx_feedback_records_attempt on public.feedback_records (attempt_id);
create index idx_feedback_records_revision on public.feedback_records (revision_id);
create index idx_verifications_student on public.verifications (student_id, activity_id);
create index idx_reflections_student on public.reflections (student_id, activity_id);
create index idx_mastery_results_activity on public.mastery_results (activity_id, outcome);
create index idx_mastery_results_student on public.mastery_results (student_id, decided_at desc);

-- Adaptif
create index idx_branching_rules_activity on public.branching_rules (activity_id, priority) where is_active;
create index idx_branching_decisions_student on public.branching_decisions (student_id, decided_at desc);
create index idx_lecturer_overrides_subject on public.lecturer_overrides (subject_kind, subject_id);

-- AI
create index idx_ai_interactions_student on public.ai_interactions (student_id, created_at desc);
create index idx_ai_interactions_activity on public.ai_interactions (activity_id);
create index idx_ai_interactions_attempt on public.ai_interactions (attempt_id);
create index idx_ai_feedback_interaction on public.ai_feedback (ai_interaction_id);
create index idx_ai_citations_feedback on public.ai_citations (ai_feedback_id);
create index idx_ai_incidents_class on public.ai_incidents (class_id, status);
create index idx_ai_disclosures_student on public.ai_disclosures (student_id, activity_id);

-- Penilaian dan analitik
create index idx_assessments_class on public.assessments (class_id);
create index idx_assessment_scores_student on public.assessment_scores (student_id) where is_final;
create index idx_ct_scores_student on public.critical_thinking_scores (student_id, dimension, measured_at desc);
create index idx_learning_events_class on public.learning_events (class_id, occurred_at desc);
create index idx_learning_events_student on public.learning_events (student_id, occurred_at desc);

-- Tata kelola
create index idx_audit_logs_subject on public.audit_logs (subject_table, subject_id, created_at desc);
create index idx_audit_logs_actor on public.audit_logs (actor_id, created_at desc);
create index idx_notifications_recipient on public.notifications (recipient_id, created_at desc) where read_at is null;
