-- 0012 — Schema penelitian, terpisah dari data akademik (§13 no. 16).
-- research.participants adalah satu-satunya pemetaan identitas ke pseudonim.

create schema if not exists research;

revoke all on schema research from anon, authenticated;

create table research.participants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete restrict,
  pseudonym text not null unique check (length(btrim(pseudonym)) > 0),
  consent_record_id uuid not null references public.consent_records (id) on delete restrict,
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- View export hanya memakai pseudonim dan memfilter consent aktif, sehingga
-- pencabutan consent langsung menghilangkan data peserta dari hasil ekspor.

create view research.v_attempt_metrics
with (security_invoker = true) as
select
  p.pseudonym,
  a.activity_id,
  a.submitted_at as attempt_submitted_at,
  count(r.id) as revision_count,
  min(r.submitted_at) as first_revision_at
from research.participants p
join public.consent_records cr
  on cr.id = p.consent_record_id and cr.status = 'granted'
join public.attempts a on a.student_id = p.profile_id
left join public.revisions r on r.attempt_id = a.id
group by p.pseudonym, a.activity_id, a.submitted_at;

create view research.v_ct_scores
with (security_invoker = true) as
select
  p.pseudonym,
  s.dimension,
  s.score,
  s.measurement_source,
  s.measured_at
from research.participants p
join public.consent_records cr
  on cr.id = p.consent_record_id and cr.status = 'granted'
join public.critical_thinking_scores s on s.student_id = p.profile_id;

create view research.v_ai_usage
with (security_invoker = true) as
select
  p.pseudonym,
  i.function,
  i.status,
  count(*) as interaction_count,
  count(*) filter (where f.student_action = 'accepted') as accepted_count,
  count(*) filter (where f.student_action = 'reported') as reported_count
from research.participants p
join public.consent_records cr
  on cr.id = p.consent_record_id and cr.status = 'granted'
join public.ai_interactions i on i.student_id = p.profile_id
left join public.ai_feedback f on f.ai_interaction_id = i.id
group by p.pseudonym, i.function, i.status;
