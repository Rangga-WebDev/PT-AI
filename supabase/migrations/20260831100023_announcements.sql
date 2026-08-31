-- 0023 — Pengumuman kelas.
--
-- Tidak ada padanan semantik pada skema yang ada, sehingga tabel baru memang
-- diperlukan. Sengaja dibuat kecil: kanal ini untuk pemberitahuan searah, bukan
-- percakapan. Tidak ada balasan, tidak ada notifikasi waktu nyata.
--
-- `published_at` null berarti masih draf. Nilai di masa depan berarti terjadwal;
-- keduanya tertutup bagi mahasiswa lewat satu perbandingan yang sama.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  body text not null check (length(btrim(body)) > 0),
  link_url text check (
    link_url is null
    or link_url ~* '^https?://'
  ),
  published_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_announcements_class
  on public.announcements (class_id, published_at desc)
  where deleted_at is null;

create trigger trg_announcements_updated_at
  before update on public.announcements
  for each row execute function public.set_updated_at();

alter table public.announcements enable row level security;

-- Dosen pengampu melihat draf dan pengumuman terjadwal; mahasiswa hanya yang
-- waktunya sudah tiba.
create policy announcements_select on public.announcements
  for select to authenticated using (
    deleted_at is null
    and (
      public.is_lecturer_of_class(class_id)
      or (
        published_at is not null
        and published_at <= now()
        and public.is_enrolled_in_class(class_id)
      )
    )
  );

create policy announcements_lecturer_write on public.announcements
  for all to authenticated
  using (public.is_lecturer_of_class(class_id))
  with check (
    public.is_lecturer_of_class(class_id)
    and created_by = auth.uid()
  );
