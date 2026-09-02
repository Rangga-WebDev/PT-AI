/** @format */

// Membandingkan bentuk basis data sekarang dengan inventaris rujukan yang
// diambil sebelum pembangunan ulang. Rujukan itu berasal dari basis data yang
// sudah lulus seluruh pengujian, sehingga selisih apa pun berarti migrasi
// tidak mampu membangun ulang dirinya sendiri.
//
// Jalankan: npm run check:schema -- backup/<stempel>/inventory.json

import { readFile } from "node:fs/promises";
import process from "node:process";

import pg from "pg";

import { CREDENTIAL_HELP, resolveConnectionString } from "./db-connection.mjs";

const reference = process.argv[2];
if (!reference) {
  console.error("\n[GAGAL] Sebutkan berkas inventory.json rujukan.\n");
  process.exit(1);
}

const connectionString = resolveConnectionString();
if (!connectionString) {
  console.error(`\n[GAGAL] ${CREDENTIAL_HELP}\n`);
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const INVENTORY = `
  select 'table' as kind, schemaname as schema, tablename as name from pg_tables where schemaname in ('public','research','ops')
  union all
  select 'view', schemaname, viewname from pg_views where schemaname in ('public','research')
  union all
  select 'function', ns.nspname, p.proname from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname in ('public','research')
  union all
  select 'policy', schemaname, schemaname || '.' || tablename || '.' || policyname from pg_policies where schemaname in ('public','research')
  union all
  select 'type', ns.nspname, t.typname from pg_type t join pg_namespace ns on ns.oid = t.typnamespace where ns.nspname = 'public' and t.typtype = 'e'
  order by 1, 2, 3`;

const { rows: current } = await client.query(INVENTORY);
const expected = JSON.parse(await readFile(reference, "utf8")).objects;

const key = (row) => `${row.kind}|${row.schema}|${row.name}`;
// Penanda migrasi bukan bagian dari bentuk aplikasi.
const relevant = (row) => row.schema !== "ops";

const currentKeys = new Set(current.filter(relevant).map(key));
const expectedKeys = new Set(expected.filter(relevant).map(key));

const missing = [...expectedKeys].filter((k) => !currentKeys.has(k)).sort();
const extra = [...currentKeys].filter((k) => !expectedKeys.has(k)).sort();

let fail = 0;
const ok = (label, condition, detail = "") => {
  if (condition) console.log(`  ok   ${label}`);
  else {
    fail += 1;
    console.log(`  FAIL ${label} ${detail}`);
  }
};

const tally = (set, kind) =>
  [...set].filter((k) => k.startsWith(`${kind}|`)).length;

console.log("1. Inventaris objek");
for (const kind of ["table", "view", "function", "policy", "type"]) {
  ok(
    `${kind}: ${tally(currentKeys, kind)}`,
    tally(currentKeys, kind) === tally(expectedKeys, kind),
    `rujukan ${tally(expectedKeys, kind)}`,
  );
}
ok(
  "tidak ada objek hilang",
  missing.length === 0,
  missing.slice(0, 5).join(", "),
);
ok("tidak ada objek asing", extra.length === 0, extra.slice(0, 5).join(", "));

console.log("\n2. Struktur pendukung");
const one = async (sql) => (await client.query(sql)).rows[0].n;

ok(
  `index: ${await one("select count(*)::int n from pg_indexes where schemaname in ('public','research')")}`,
  (await one(
    "select count(*)::int n from pg_indexes where schemaname in ('public','research')",
  )) > 100,
);
ok(
  `foreign key: ${await one("select count(*)::int n from pg_constraint c join pg_namespace ns on ns.oid=c.connamespace where ns.nspname='public' and c.contype='f'")}`,
  (await one(
    "select count(*)::int n from pg_constraint c join pg_namespace ns on ns.oid=c.connamespace where ns.nspname='public' and c.contype='f'",
  )) > 50,
);
ok(
  `trigger: ${await one("select count(*)::int n from pg_trigger where not tgisinternal")}`,
  (await one("select count(*)::int n from pg_trigger where not tgisinternal")) >
    50,
);
ok(
  "setiap tabel public ber-RLS",
  (await one(`
    select count(*)::int n from pg_tables t
    join pg_class c on c.relname = t.tablename
    join pg_namespace ns on ns.oid = c.relnamespace and ns.nspname = t.schemaname
    where t.schemaname = 'public' and not c.relrowsecurity`)) === 0,
);

console.log("\n3. Perlindungan yang harus tetap ada");
ok(
  "tidak ada fungsi definer yang dapat dieksekusi anon",
  (await one(`
    select count(*)::int n from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.prosecdef
      and has_function_privilege('anon', p.oid, 'execute')`)) === 0,
);
ok(
  "pembantu policy dapat dieksekusi authenticated",
  (await one(`
    select count(*)::int n from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'is_admin_of_organization'
      and has_function_privilege('authenticated', p.oid, 'execute')`)) === 1,
);
ok(
  "policy admin selalu terikat organisasi",
  (await one(`
    select count(*)::int n from pg_policies
    where schemaname = 'public'
      and coalesce(qual,'') || coalesce(with_check,'') like '%is_admin()%'
      and coalesce(qual,'') || coalesce(with_check,'') not like '%organization%'`)) ===
    0,
);
ok(
  "pembekuan rubrik terpasang",
  (await one(`
    select count(*)::int n from pg_trigger
    where not tgisinternal and tgname in (
      'trg_rubric_criteria_protect_used',
      'trg_rubric_levels_protect_used',
      'trg_rubrics_protect_used')`)) === 3,
);
ok(
  "pembatas laju tersedia",
  (await one(`
    select count(*)::int n from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname in ('consume_rate_limit', 'prune_rate_limit_counters')`)) ===
    2,
);
ok(
  "penutup sesi terbengkalai tersedia",
  (await one(`
    select count(*)::int n from pg_proc p
    join pg_namespace ns on ns.oid = p.pronamespace
    where ns.nspname = 'public' and p.proname = 'close_stale_learning_sessions'`)) ===
    1,
);
ok(
  "view penelitian terbentuk",
  (await one(
    "select count(*)::int n from pg_views where schemaname = 'research'",
  )) > 0,
);
ok(
  "bucket aplikasi terbentuk sebagai privat",
  (await one(
    "select count(*)::int n from storage.buckets where id in ('materials','sources') and not public",
  )) === 2,
);

await client.end();

console.log(
  fail === 0
    ? "\n[LULUS] Skema sesuai rujukan.\n"
    : `\n[GAGAL] ${fail} pemeriksaan.\n`,
);
process.exit(fail === 0 ? 0 : 1);
