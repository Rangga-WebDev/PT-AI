-- 0038 — Studi pendahuluan: tes kemampuan berpikir kritis kewarganegaraan.
--
-- Responden studi pendahuluan bukan akun LMS. Karena itu datanya tidak dapat
-- memakai research.participants maupun critical_thinking_scores, yang
-- keduanya menuntut profil. Data disimpan di schema research yang tertutup
-- bagi peran klien; aksesnya hanya lewat fungsi di bawah, dengan pemeriksaan
-- peran dan organisasi di dalam fungsi.
--
-- Seluruh baris append-only dan membawa jejak sumbernya (berkas, sheet,
-- baris). Data yang dikoreksi diimpor sebagai dataset baru dengan checksum
-- berbeda; dasbor membaca dataset terbaru milik organisasi pemanggil.
-- Studi pendahuluan tidak bercampur dengan data implementasi model di kelas.

create table research.preliminary_datasets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete restrict,
  title text not null check (length(btrim(title)) between 3 and 200),
  item_count smallint not null check (item_count between 1 and 60),
  max_item_score smallint not null check (max_item_score between 1 and 10),
  -- Rentang kategori penelitian: [{label, min, max}], min inklusif, max
  -- eksklusif kecuali rentang terakhir yang mencakup nilai maksimum.
  category_scheme jsonb not null check (
    jsonb_typeof(category_scheme) = 'array'
    and jsonb_array_length(category_scheme) between 1 and 10
  ),
  respondent_count integer not null check (respondent_count between 1 and 100000),
  source_file text not null check (length(btrim(source_file)) between 1 and 300),
  source_sheet text not null check (length(btrim(source_sheet)) between 1 and 200),
  source_checksum text not null check (source_checksum ~ '^[0-9a-f]{64}$'),
  imported_at timestamptz not null default now(),
  constraint uq_preliminary_datasets_checksum unique (organization_id, source_checksum)
);

create table research.preliminary_items (
  dataset_id uuid not null references research.preliminary_datasets (id) on delete restrict,
  item_number smallint not null check (item_number >= 1),
  dimension public.ct_dimension not null,
  source_file text not null check (length(btrim(source_file)) between 1 and 300),
  source_sheet text not null check (length(btrim(source_sheet)) between 1 and 200),
  source_row integer not null check (source_row >= 1),
  primary key (dataset_id, item_number)
);

create table research.preliminary_respondents (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null references research.preliminary_datasets (id) on delete restrict,
  respondent_code text not null check (respondent_code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$'),
  recorded_category text not null check (length(btrim(recorded_category)) between 1 and 40),
  recorded_total numeric(7, 2) not null check (recorded_total >= 0),
  recorded_score numeric(5, 2) not null check (recorded_score between 0 and 100),
  source_file text not null check (length(btrim(source_file)) between 1 and 300),
  source_sheet text not null check (length(btrim(source_sheet)) between 1 and 200),
  source_row integer not null check (source_row >= 1),
  imported_at timestamptz not null default now(),
  constraint uq_preliminary_respondents_code unique (dataset_id, respondent_code),
  constraint uq_preliminary_respondents_row unique (dataset_id, source_row),
  constraint uq_preliminary_respondents_dataset unique (id, dataset_id)
);

-- Jawaban disimpan persis seperti di berkas sumber, tanpa dipangkas.
create table research.preliminary_responses (
  respondent_id uuid not null,
  dataset_id uuid not null,
  item_number smallint not null,
  answer_text text not null check (length(answer_text) <= 20000),
  score smallint not null check (score between 0 and 10),
  answer_column text not null check (length(btrim(answer_column)) between 1 and 100),
  score_column text not null check (length(btrim(score_column)) between 1 and 100),
  primary key (respondent_id, item_number),
  constraint fk_preliminary_responses_respondent foreign key (respondent_id, dataset_id)
    references research.preliminary_respondents (id, dataset_id) on delete restrict,
  constraint fk_preliminary_responses_item foreign key (dataset_id, item_number)
    references research.preliminary_items (dataset_id, item_number) on delete restrict
);

create index idx_preliminary_datasets_latest
  on research.preliminary_datasets (organization_id, imported_at desc);
create index idx_preliminary_responses_item
  on research.preliminary_responses (dataset_id, item_number);

do $$
declare
  t text;
begin
  foreach t in array array[
    'preliminary_datasets',
    'preliminary_items',
    'preliminary_respondents',
    'preliminary_responses'
  ] loop
    execute format(
      'create trigger trg_%1$s_append_only
         before update or delete on research.%1$I
         for each row execute function public.prevent_mutation();',
      t
    );
    execute format('alter table research.%I enable row level security;', t);
    execute format('revoke all on table research.%I from public, anon, authenticated;', t);
  end loop;
end;
$$;

-- === Ringkasan agregat: admin dan dosen organisasi ==========================
-- Tidak memuat kode responden maupun jawaban.

create or replace function public.preliminary_study_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = research, public, pg_catalog
as $$
declare
  v_org uuid := public.current_organization_id();
  v_dataset research.preliminary_datasets%rowtype;
  v_max_total numeric;
begin
  if auth.uid() is null or v_org is null
     or not (public.has_role('admin') or public.has_role('lecturer')) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_dataset
  from research.preliminary_datasets
  where organization_id = v_org
  order by imported_at desc, id desc
  limit 1;

  if not found then
    return null;
  end if;

  v_max_total := v_dataset.item_count * v_dataset.max_item_score;

  return (
    with scored as (
      select r.recorded_category as category, sum(s.score)::numeric as total
      from research.preliminary_respondents r
      join research.preliminary_responses s on s.respondent_id = r.id
      where r.dataset_id = v_dataset.id
      group by r.id, r.recorded_category
    ),
    bands as (
      select e.value as band, e.ordinality as position
      from jsonb_array_elements(v_dataset.category_scheme) with ordinality as e
    ),
    item_scores as (
      select i.item_number, i.dimension, avg(s.score) as average
      from research.preliminary_items i
      join research.preliminary_responses s
        on s.dataset_id = i.dataset_id and s.item_number = i.item_number
      where i.dataset_id = v_dataset.id
      group by i.item_number, i.dimension
    ),
    skill_scores as (
      select i.dimension, avg(s.score) as average
      from research.preliminary_items i
      join research.preliminary_responses s
        on s.dataset_id = i.dataset_id and s.item_number = i.item_number
      where i.dataset_id = v_dataset.id
      group by i.dimension
    )
    select jsonb_build_object(
      'dataset', jsonb_build_object(
        'id', v_dataset.id,
        'title', v_dataset.title,
        'itemCount', v_dataset.item_count,
        'maxItemScore', v_dataset.max_item_score,
        'respondentCount', v_dataset.respondent_count,
        'sourceFile', v_dataset.source_file,
        'sourceSheet', v_dataset.source_sheet,
        'importedAt', v_dataset.imported_at
      ),
      'summary', (
        select jsonb_build_object(
          'respondents', count(*),
          'average', round(avg(total) * 100 / v_max_total, 2),
          'lowest', round(min(total) * 100 / v_max_total, 2),
          'highest', round(max(total) * 100 / v_max_total, 2)
        )
        from scored
      ),
      'categories', (
        select coalesce(jsonb_agg(
          b.band || jsonb_build_object(
            'count', counts.n,
            'percent', round(counts.n * 100.0 / nullif(counts.total, 0), 2)
          )
          order by b.position
        ), '[]'::jsonb)
        from bands b
        cross join lateral (
          select count(*) filter (where category = b.band->>'label') as n,
                 count(*) as total
          from scored
        ) counts
      ),
      'skills', (
        select coalesce(jsonb_agg(
          jsonb_build_object('dimension', dimension, 'average', round(average, 2))
          order by dimension
        ), '[]'::jsonb)
        from skill_scores
      ),
      'items', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'itemNumber', item_number,
            'dimension', dimension,
            'average', round(average, 2)
          )
          order by item_number
        ), '[]'::jsonb)
        from item_scores
      ),
      'scores', (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'score', round(total * 100 / v_max_total, 2),
            'category', category
          )
          order by total
        ), '[]'::jsonb)
        from scored
      )
    )
  );
end;
$$;

-- === Skor per responden: hanya admin organisasi ============================

create or replace function public.preliminary_study_respondents(p_dataset_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = research, public, pg_catalog
as $$
declare
  v_dataset research.preliminary_datasets%rowtype;
  v_max_total numeric;
begin
  select * into v_dataset
  from research.preliminary_datasets
  where id = p_dataset_id;

  if auth.uid() is null or v_dataset.id is null
     or not public.is_admin_of_organization(v_dataset.organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  v_max_total := v_dataset.item_count * v_dataset.max_item_score;

  return (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'code', r.respondent_code,
        'category', r.recorded_category,
        'total', t.total,
        'score', round(t.total * 100 / v_max_total, 2),
        'skills', t.skills
      )
      order by r.source_row
    ), '[]'::jsonb)
    from research.preliminary_respondents r
    cross join lateral (
      select sum(d.subtotal) as total,
             jsonb_object_agg(d.dimension, round(d.average, 2)) as skills
      from (
        select i.dimension, sum(s.score)::numeric as subtotal, avg(s.score) as average
        from research.preliminary_responses s
        join research.preliminary_items i
          on i.dataset_id = s.dataset_id and i.item_number = s.item_number
        where s.respondent_id = r.id
        group by i.dimension
      ) d
    ) t
    where r.dataset_id = v_dataset.id
  );
end;
$$;

-- === Jawaban satu responden: hanya admin organisasi, selalu diaudit ========

create or replace function public.preliminary_study_respondent(p_respondent_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = research, public, pg_catalog
as $$
declare
  v_respondent research.preliminary_respondents%rowtype;
  v_dataset research.preliminary_datasets%rowtype;
  v_result jsonb;
begin
  select * into v_respondent
  from research.preliminary_respondents
  where id = p_respondent_id;

  if v_respondent.id is not null then
    select * into v_dataset
    from research.preliminary_datasets
    where id = v_respondent.dataset_id;
  end if;

  if auth.uid() is null or v_dataset.id is null
     or not public.is_admin_of_organization(v_dataset.organization_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', v_respondent.id,
    'datasetId', v_dataset.id,
    'code', v_respondent.respondent_code,
    'category', v_respondent.recorded_category,
    'total', sum(s.score),
    'maxTotal', v_dataset.item_count * v_dataset.max_item_score,
    'maxItemScore', v_dataset.max_item_score,
    'score', round(
      sum(s.score)::numeric * 100 / (v_dataset.item_count * v_dataset.max_item_score), 2
    ),
    'sourceFile', v_respondent.source_file,
    'sourceSheet', v_respondent.source_sheet,
    'sourceRow', v_respondent.source_row,
    'answers', jsonb_agg(
      jsonb_build_object(
        'itemNumber', s.item_number,
        'dimension', i.dimension,
        'score', s.score,
        'answer', s.answer_text
      )
      order by s.item_number
    )
  ) into v_result
  from research.preliminary_responses s
  join research.preliminary_items i
    on i.dataset_id = s.dataset_id and i.item_number = s.item_number
  where s.respondent_id = v_respondent.id;

  insert into public.audit_logs (actor_id, actor_role, action, subject_table, subject_id, after)
  values (
    auth.uid(), 'admin', 'research_preliminary_viewed', 'preliminary_respondents',
    v_respondent.id, jsonb_build_object('datasetId', v_dataset.id)
  );

  return v_result;
end;
$$;

revoke execute on function public.preliminary_study_overview() from public, anon, authenticated;
revoke execute on function public.preliminary_study_respondents(uuid) from public, anon, authenticated;
revoke execute on function public.preliminary_study_respondent(uuid) from public, anon, authenticated;

grant execute on function public.preliminary_study_overview() to authenticated;
grant execute on function public.preliminary_study_respondents(uuid) to authenticated;
grant execute on function public.preliminary_study_respondent(uuid) to authenticated;
