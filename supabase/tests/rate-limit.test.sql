-- Test pembatas laju dan pemeliharaan berkala (Final Checkpoint, 0033).
--
-- Menjalankan: npm run test:db

begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

create or replace function pg_temp.make_user(p_id uuid, p_email text)
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000', p_id, 'authenticated', 'authenticated',
    p_email, '', now(), now(), now()
  );
end;
$$;

create or replace function pg_temp.act_as(p_id uuid)
returns void
language plpgsql
as $$
begin
  execute 'set local role authenticated';
  execute format('set local request.jwt.claims = %L', json_build_object('sub', p_id, 'role', 'authenticated')::text);
end;
$$;

create or replace function pg_temp.act_as_service()
returns void
language plpgsql
as $$
begin
  execute 'reset role';
  execute 'set local request.jwt.claims = ' || quote_literal('{}');
end;
$$;

-- === Fixture ================================================================

select pg_temp.make_user('d1111111-dddd-4ddd-8ddd-111111111111', 'rl.one@test.invalid');
select pg_temp.make_user('d2222222-dddd-4ddd-8ddd-222222222222', 'rl.two@test.invalid');

insert into public.organizations (id, name, code)
values ('d0000000-0000-4000-8000-000000000001', 'Universitas Laju', 'ULJ');

insert into public.profiles (id, organization_id, full_name, identifier) values
  ('d1111111-dddd-4ddd-8ddd-111111111111', 'd0000000-0000-4000-8000-000000000001', 'Pengguna Satu', 'RL-01'),
  ('d2222222-dddd-4ddd-8ddd-222222222222', 'd0000000-0000-4000-8000-000000000001', 'Pengguna Dua', 'RL-02');

-- === Perilaku pembatas ======================================================

select pg_temp.act_as('d1111111-dddd-4ddd-8ddd-111111111111');

-- 1. Pemakaian pertama diizinkan.
select is(
  public.consume_rate_limit('uji', 3, 3600),
  true,
  'Pemakaian pertama diizinkan'
);

-- 2. Pemakaian tepat pada batas masih diizinkan.
select public.consume_rate_limit('uji', 3, 3600);
select is(
  public.consume_rate_limit('uji', 3, 3600),
  true,
  'Pemakaian ketiga masih dalam batas tiga'
);

-- 3. Pemakaian keempat ditolak.
select is(
  public.consume_rate_limit('uji', 3, 3600),
  false,
  'Pemakaian melewati batas ditolak'
);

-- 4. Aksi berbeda punya penghitung sendiri.
select is(
  public.consume_rate_limit('uji_lain', 3, 3600),
  true,
  'Aksi lain memakai penghitung terpisah'
);

-- 5. Pengguna lain tidak terpengaruh penghitung tetangganya.
select pg_temp.act_as('d2222222-dddd-4ddd-8ddd-222222222222');
select is(
  public.consume_rate_limit('uji', 3, 3600),
  true,
  'Penghitung terpisah per pengguna'
);

-- 6. Batas tidak masuk akal ditolak.
select throws_ok(
  $$select public.consume_rate_limit('uji', 0, 3600)$$,
  '22023',
  null,
  'Batas nol ditolak'
);

-- 7. Penghitung tidak dapat dibaca klien.
select is(
  (select count(*)::int from public.rate_limit_counters),
  0,
  'Klien tidak dapat membaca penghitung siapa pun'
);

-- 8. Pemangkasan hanya untuk koneksi istimewa.
select throws_ok(
  $$select public.prune_rate_limit_counters(48)$$,
  '42501',
  null,
  'Klien tidak dapat memangkas penghitung'
);

-- 9. Koneksi istimewa memangkas jendela lama saja.
select pg_temp.act_as_service();
update public.rate_limit_counters
set window_start = now() - interval '5 days'
where action = 'uji_lain';

select is(
  public.prune_rate_limit_counters(48),
  1,
  'Hanya penghitung jendela lama yang dipangkas'
);

select * from finish();
rollback;
