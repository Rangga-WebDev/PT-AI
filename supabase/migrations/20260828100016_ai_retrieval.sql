-- 0016 — Retrieval RAG (PHASE 10).
--
-- source_chunks ditutup RLS (`using (false)`) sehingga embedding tidak pernah
-- sampai ke browser. Pencarian karena itu harus lewat fungsi security definer
-- yang memeriksa sendiri hak akses pemanggil.

-- Cakupan retrieval dibatasi source pack kasus (LOCK-PED-007): AI tidak boleh
-- mengutip apa pun di luar sumber yang dilampirkan dosen pada kasus tersebut.
create or replace function public.match_source_chunks(
  p_activity_id uuid,
  p_query extensions.vector(1536),
  p_match_count integer default 6
)
returns table (
  chunk_id uuid,
  source_id uuid,
  source_version_id uuid,
  source_title text,
  chunk_index integer,
  content text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions, pg_catalog
as $$
  select
    sc.id,
    s.id,
    sv.id,
    s.title,
    sc.chunk_index,
    sc.content,
    1 - (sc.embedding operator(extensions.<=>) p_query) as similarity
  from public.source_chunks sc
  join public.source_versions sv on sv.id = sc.source_version_id
  join public.sources s on s.id = sv.source_id
  join public.case_sources cs on cs.source_id = s.id
  join public.cases c on c.id = cs.case_id
  join public.learning_units lu on lu.id = c.learning_unit_id
  join public.learning_stages ls on ls.learning_unit_id = lu.id
  join public.activities a on a.learning_stage_id = ls.id
  where a.id = p_activity_id
    and sc.embedding is not null
    and s.deleted_at is null
    and c.deleted_at is null
    and public.can_access_activity(p_activity_id)
  order by sc.embedding operator(extensions.<=>) p_query
  limit greatest(1, least(p_match_count, 20));
$$;

revoke all on function public.match_source_chunks(uuid, extensions.vector, integer) from public;
grant execute on function public.match_source_chunks(uuid, extensions.vector, integer) to authenticated, service_role;

-- Menandai sumber yang potongannya belum di-embed, dipakai skrip indexing.
create or replace function public.pending_embedding_count()
returns integer
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select count(*)::integer
  from public.source_chunks
  where embedding is null;
$$;

revoke all on function public.pending_embedding_count() from public;
grant execute on function public.pending_embedding_count() to authenticated, service_role;
