-- 0001 — Ekstensi dan tipe kustom.
-- Referensi: docs/DATABASE.md bagian 3.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "vector" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- Peran dan struktur pedagogis -----------------------------------------------

create type public.role_key as enum ('student', 'lecturer', 'admin');

-- Enam tahap berurutan (LOCK-PED-002). Enum mencegah tahap asing disisipkan.
create type public.stage_key as enum (
  'interpretation',
  'analysis',
  'evaluation',
  'inference',
  'explanation',
  'reflection'
);

-- Enam dimensi outcome (LOCK-PED-001).
create type public.ct_dimension as enum (
  'interpretation',
  'analysis',
  'evaluation',
  'inference',
  'explanation',
  'self_regulation'
);

-- Siklus per tahap (LOCK-PED-003).
create type public.cycle_phase as enum (
  'attempt',
  'feedback',
  'verify',
  'revise',
  'mastery'
);

-- Status umum ----------------------------------------------------------------

create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.enrollment_status as enum ('active', 'dropped', 'completed');
create type public.mastery_outcome as enum ('not_met', 'partially_met', 'met');
create type public.evaluator_kind as enum ('system', 'lecturer');
create type public.feedback_source as enum ('ai', 'lecturer');

-- AI --------------------------------------------------------------------------

create type public.ai_function as enum (
  'guiding_questions',
  'rubric_feedback',
  'hint',
  'counter_argument',
  'error_classification',
  'learning_path'
);

create type public.ai_interaction_status as enum (
  'success',
  'schema_rejected',
  'safety_rejected',
  'provider_error'
);

create type public.ai_student_action as enum ('pending', 'accepted', 'ignored', 'reported');

-- Sumber dan bukti ------------------------------------------------------------

create type public.source_type as enum (
  'regulation',
  'official_document',
  'journal_article',
  'book',
  'news',
  'report',
  'dataset',
  'other'
);

create type public.verification_verdict as enum ('credible', 'questionable', 'not_usable');
create type public.verification_outcome as enum ('verified', 'not_verified', 'contradicted');
create type public.claim_origin as enum ('case', 'student', 'ai');
create type public.claim_link_type as enum ('supports', 'refutes', 'contextualizes');

-- Adaptif dan tata kelola -----------------------------------------------------

create type public.branching_action as enum ('remedial', 'enrichment', 'continue', 'hold');

create type public.override_subject as enum (
  'mastery_result',
  'branching_decision',
  'assessment_score',
  'ai_feedback'
);

create type public.incident_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
create type public.consent_status as enum ('granted', 'declined', 'withdrawn');
create type public.assessment_type as enum ('formative', 'summative', 'pretest', 'posttest');
create type public.retention_action as enum ('anonymize', 'delete');
