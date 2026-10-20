-- 0040 — Diskusi kelas dan pertemuan.
--
-- Satu tabel melayani dua tingkat: module_id null berarti diskusi kelas,
-- terisi berarti diskusi satu pertemuan. Semua anggota kelas melihat pesan
-- yang sama. Identitas penulis diisi trigger dari sesi, bukan dari klien,
-- dan ikut disalin ke baris supaya peristiwa realtime dapat langsung
-- ditampilkan tanpa membaca profil mahasiswa lain.
--
-- Pesan tidak dapat diubah. Penghapusan lewat fungsi: isi dikosongkan,
-- salinannya disimpan di audit_logs yang hanya terbaca administrator.

create table public.class_messages (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  module_id uuid references public.modules (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  author_name text not null,
  author_role text not null check (author_role in ('lecturer', 'student')),
  body text not null check (char_length(body) <= 2000),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ck_class_messages_body check (
    deleted_at is not null or length(btrim(body)) > 0
  )
);

create index idx_class_messages_thread
  on public.class_messages (class_id, module_id, created_at desc);

-- Dosen pengampu selalu boleh; mahasiswa hanya bila terdaftar aktif di kelas
-- yang terbit, dan untuk diskusi pertemuan hanya pertemuan yang terbit.
create or replace function public.can_use_class_discussion(
  p_class_id uuid,
  p_module_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_catalog
as $$
  select
    (
      public.is_lecturer_of_class(p_class_id)
      or (
        public.is_enrolled_in_class(p_class_id)
        and exists (
          select 1 from public.classes c
          where c.id = p_class_id
            and c.status = 'published'
            and c.deleted_at is null
        )
      )
    )
    and (
      p_module_id is null
      or exists (
        select 1 from public.modules m
        where m.id = p_module_id
          and m.class_id = p_class_id
          and m.deleted_at is null
          and (m.status = 'published' or public.is_lecturer_of_class(p_class_id))
      )
    );
$$;

revoke execute on function public.can_use_class_discussion(uuid, uuid) from public, anon;
grant execute on function public.can_use_class_discussion(uuid, uuid) to authenticated;

create or replace function public.prepare_class_message()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  new.author_id := auth.uid();
  new.author_name := (select p.full_name from public.profiles p where p.id = auth.uid());
  new.author_role := case
    when public.is_lecturer_of_class(new.class_id) then 'lecturer'
    else 'student'
  end;
  new.body := btrim(new.body);
  new.deleted_at := null;
  new.deleted_by := null;
  new.created_at := now();
  return new;
end;
$$;

create trigger trg_class_messages_prepare
  before insert on public.class_messages
  for each row execute function public.prepare_class_message();

alter table public.class_messages enable row level security;

-- Pesan terhapus tetap terlihat sebagai baris kosong agar perubahan statusnya
-- ikut terkirim lewat realtime ke anggota yang sedang membuka diskusi.
create policy class_messages_select on public.class_messages
  for select to authenticated
  using (public.can_use_class_discussion(class_id, module_id));

create policy class_messages_insert on public.class_messages
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.can_use_class_discussion(class_id, module_id)
  );

revoke all on public.class_messages from anon;
revoke update, delete, truncate on public.class_messages from authenticated;

create or replace function public.delete_class_message(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_message public.class_messages;
  v_is_lecturer boolean;
begin
  select * into v_message
  from public.class_messages
  where id = p_message_id
  for update;

  if not found or v_message.deleted_at is not null then
    raise exception 'Pesan tidak ditemukan.' using errcode = 'no_data_found';
  end if;

  v_is_lecturer := public.is_lecturer_of_class(v_message.class_id);

  if not (
    v_is_lecturer
    or (
      v_message.author_id = auth.uid()
      and public.can_use_class_discussion(v_message.class_id, v_message.module_id)
    )
  ) then
    raise exception 'Anda tidak berwenang menghapus pesan ini.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.audit_logs (
    actor_id, actor_role, action, subject_table, subject_id, before
  ) values (
    auth.uid(),
    case when v_is_lecturer then 'lecturer' else 'student' end::public.role_key,
    'class_message_deleted',
    'class_messages',
    v_message.id,
    jsonb_build_object(
      'class_id', v_message.class_id,
      'module_id', v_message.module_id,
      'author_id', v_message.author_id,
      'body', v_message.body,
      'created_at', v_message.created_at
    )
  );

  update public.class_messages
  set deleted_at = now(),
      deleted_by = auth.uid(),
      body = ''
  where id = p_message_id;
end;
$$;

revoke execute on function public.delete_class_message(uuid) from public, anon;
grant execute on function public.delete_class_message(uuid) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.class_messages;
  end if;
end;
$$;
