-- 0026 — Draf bahan ajar hasil bantuan AI.
--
-- TABEL TERPISAH DARI `ai_interactions` DAN ITU DISENGAJA.
-- `ai_interactions` menjadi sumber view `research.v_ai_usage`, yaitu data
-- penggunaan AI oleh mahasiswa yang justru sedang diteliti. Memasukkan
-- panggilan penyusunan materi oleh dosen ke sana akan mencemari variabel itu.
--
-- Alur yang ditegakkan: sumber → AI menghasilkan draf → dosen meninjau dan
-- menyunting → dosen menyetujui → baru diterbitkan. Tidak ada jalur yang
-- membuat keluaran AI langsung menjadi bahan terbit.

create table public.ai_material_drafts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete restrict,

  -- Provenance: bahan sumber yang dipakai, bila ada.
  source_resource_id uuid references public.learning_resources (id) on delete set null,
  grounding text not null default 'unbound'
    check (grounding in ('source_bound', 'unbound')),

  instruction jsonb not null default '{}'::jsonb,
  output text not null check (length(btrim(output)) > 0),
  model text not null check (length(btrim(model)) > 0),
  prompt_version integer not null check (prompt_version > 0),

  status text not null default 'draft'
    check (status in ('draft', 'approved', 'discarded')),
  approved_by uuid references public.profiles (id) on delete restrict,
  approved_at timestamptz,
  published_resource_id uuid references public.learning_resources (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Persetujuan wajib punya penyetuju dan waktunya; selain itu tidak boleh ada.
  constraint ck_ai_material_drafts_approval check (
    (status = 'approved') = (approved_by is not null and approved_at is not null)
  ),
  -- Bahan hanya lahir dari draf yang sudah disetujui.
  constraint ck_ai_material_drafts_published check (
    published_resource_id is null or status = 'approved'
  ),
  constraint ck_ai_material_drafts_grounding check (
    grounding = 'unbound' or source_resource_id is not null
  )
);

create index idx_ai_material_drafts_class
  on public.ai_material_drafts (class_id, status, created_at desc);

create index idx_ai_material_drafts_source
  on public.ai_material_drafts (source_resource_id)
  where source_resource_id is not null;

create trigger trg_ai_material_drafts_updated_at
  before update on public.ai_material_drafts
  for each row execute function public.set_updated_at();

-- === Penjagaan provenance ===================================================

-- Mode `source_bound` berarti keluaran AI diklaim bersandar pada satu bahan
-- tertentu. Klaim itu hanya sah bila isi bahannya benar-benar pernah terbaca;
-- inilah yang mencegah AI mengarang isi berkas yang gagal diekstrak.
create or replace function public.enforce_draft_provenance()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_class_id uuid;
  v_extraction text;
  v_has_text boolean;
begin
  if new.source_resource_id is null then
    return new;
  end if;

  select
    public.class_of_resource_parent(r.class_id, r.module_id, r.learning_unit_id, r.activity_id),
    r.extraction_status,
    r.extracted_text is not null
  into v_class_id, v_extraction, v_has_text
  from public.learning_resources r
  where r.id = new.source_resource_id;

  if v_class_id is null then
    raise exception 'Bahan sumber tidak ditemukan.'
      using errcode = 'restrict_violation';
  end if;

  if v_class_id <> new.class_id then
    raise exception 'Bahan sumber berasal dari kelas yang berbeda.'
      using errcode = 'restrict_violation';
  end if;

  if new.grounding = 'source_bound' and not (v_extraction = 'succeeded' and v_has_text) then
    raise exception 'Bahan sumber belum berhasil diekstrak, sehingga tidak dapat menjadi dasar draf.'
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger trg_ai_material_drafts_provenance
  before insert or update on public.ai_material_drafts
  for each row execute function public.enforce_draft_provenance();

-- === Imutabilitas setelah ditinjau ==========================================

-- Setelah disetujui atau dibuang, isi yang ditinjau dosen tidak boleh berubah:
-- persetujuan menyatakan "inilah yang saya baca".
create or replace function public.protect_reviewed_draft()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if old.status <> 'draft' then
    if new.output is distinct from old.output
       or new.instruction is distinct from old.instruction
       or new.model is distinct from old.model
       or new.prompt_version is distinct from old.prompt_version
       or new.source_resource_id is distinct from old.source_resource_id
       or new.grounding is distinct from old.grounding then
      raise exception 'Draf yang sudah ditinjau tidak dapat diubah isinya.'
        using errcode = 'restrict_violation';
    end if;
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'draft' and new.status in ('approved', 'discarded')) then
    raise exception 'Transisi status draf tidak sah: % ke %', old.status, new.status
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$;

create trigger trg_ai_material_drafts_protect
  before update on public.ai_material_drafts
  for each row execute function public.protect_reviewed_draft();

-- === RLS ====================================================================

alter table public.ai_material_drafts enable row level security;

-- Draf adalah artefak penyusunan bahan, bukan bahan ajar. Mahasiswa tidak
-- pernah melihatnya, dalam status apa pun.
create policy ai_material_drafts_select on public.ai_material_drafts
  for select to authenticated using (public.is_lecturer_of_class(class_id));

-- Draf hanya dapat dibuat atas nama diri sendiri, tetapi dosen pengampu lain
-- pada kelas yang sama tetap dapat meninjau dan menyetujuinya.
create policy ai_material_drafts_lecturer_insert on public.ai_material_drafts
  for insert to authenticated
  with check (
    public.is_lecturer_of_class(class_id)
    and requested_by = auth.uid()
  );

create policy ai_material_drafts_lecturer_update on public.ai_material_drafts
  for update to authenticated
  using (public.is_lecturer_of_class(class_id))
  with check (public.is_lecturer_of_class(class_id));

create policy ai_material_drafts_lecturer_delete on public.ai_material_drafts
  for delete to authenticated
  using (public.is_lecturer_of_class(class_id));
