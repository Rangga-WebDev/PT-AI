/** @format */

// Membangun ulang basis data aplikasi dari nol.
//
// Yang dihapus hanya objek milik aplikasi di schema `public`, `research`, dan
// `ops`. Schema itu sendiri tidak di-drop: ACL dan default privileges di
// atasnya milik Supabase, bukan milik aplikasi ini, dan menyusunnya ulang
// dengan tangan justru berisiko menyimpang dari bawaan platform.
//
// Schema terkelola (auth, storage, extensions, realtime, vault) tidak
// disentuh sama sekali. Baris bucket dan pengguna dibersihkan lewat API resmi
// Supabase pada skrip lain, bukan di sini.
//
// Jalankan: npm run db:rebuild -- --yes --confirm-project=<ref>

import process from "node:process";

import pg from "pg";

import { CREDENTIAL_HELP, resolveConnectionString } from "./db-connection.mjs";
import { requireDestructiveConfirmation } from "./destructive-guard.mjs";

requireDestructiveConfirmation("Penghapusan seluruh objek aplikasi");

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

const SCHEMAS = ["public", "research", "ops"];
const list = SCHEMAS.map((name) => `'${name}'`).join(", ");

const before = await client.query(
  `select count(*)::int as n from pg_tables where schemaname in (${list})`,
);

// Urutan: view lebih dulu (bergantung pada tabel), lalu tabel dengan cascade,
// lalu rutin dan tipe yang tersisa. Trigger ikut terhapus bersama tabelnya.
const drops = [];

const { rows: views } = await client.query(
  `select schemaname, viewname from pg_views where schemaname in (${list})`,
);
for (const row of views) {
  drops.push(
    `drop view if exists "${row.schemaname}"."${row.viewname}" cascade`,
  );
}

const { rows: matviews } = await client.query(
  `select schemaname, matviewname from pg_matviews where schemaname in (${list})`,
);
for (const row of matviews) {
  drops.push(
    `drop materialized view if exists "${row.schemaname}"."${row.matviewname}" cascade`,
  );
}

const { rows: tables } = await client.query(
  `select schemaname, tablename from pg_tables where schemaname in (${list})`,
);
for (const row of tables) {
  drops.push(
    `drop table if exists "${row.schemaname}"."${row.tablename}" cascade`,
  );
}

const { rows: routines } = await client.query(`
  select ns.nspname as schema,
         p.proname as name,
         pg_get_function_identity_arguments(p.oid) as args,
         case p.prokind when 'p' then 'procedure' else 'function' end as kind
  from pg_proc p
  join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname in (${list})`);
for (const row of routines) {
  drops.push(
    `drop ${row.kind} if exists "${row.schema}"."${row.name}"(${row.args}) cascade`,
  );
}

const { rows: types } = await client.query(`
  select ns.nspname as schema, t.typname as name
  from pg_type t
  join pg_namespace ns on ns.oid = t.typnamespace
  where ns.nspname in (${list})
    and t.typtype in ('e', 'd', 'c')
    and not exists (select 1 from pg_class c where c.oid = t.typrelid and c.relkind <> 'c')`);
for (const row of types) {
  drops.push(`drop type if exists "${row.schema}"."${row.name}" cascade`);
}

const { rows: sequences } = await client.query(
  `select schemaname, sequencename from pg_sequences where schemaname in (${list})`,
);
for (const row of sequences) {
  drops.push(
    `drop sequence if exists "${row.schemaname}"."${row.sequencename}" cascade`,
  );
}

await client.query("begin");
try {
  for (const statement of drops) await client.query(statement);
  // `research` dan `ops` dibuat oleh migrasi dan penanda migrasi; keduanya
  // boleh hilang sepenuhnya agar migrasi benar-benar mulai dari nol.
  await client.query("drop schema if exists research cascade");
  await client.query("drop schema if exists ops cascade");
  await client.query("commit");
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(`\n[GAGAL] ${error.message}\n`);
  await client.end().catch(() => {});
  process.exit(1);
}

const after = await client.query(`
  select
    (select count(*)::int from pg_tables where schemaname in (${list})) as tables,
    (select count(*)::int from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname in (${list})) as routines,
    (select count(*)::int from pg_policies where schemaname in (${list})) as policies,
    (select count(*)::int from pg_type t join pg_namespace ns on ns.oid = t.typnamespace where ns.nspname in (${list}) and t.typtype = 'e') as enums,
    (select count(*)::int from pg_namespace where nspname in ('research', 'ops')) as schemas`);

const row = after.rows[0];
console.log(`objek dihapus : ${drops.length}`);
console.log(`tabel  : ${before.rows[0].n} -> ${row.tables}`);
console.log(`rutin  : ${row.routines}`);
console.log(`policy : ${row.policies}`);
console.log(`enum   : ${row.enums}`);
console.log(`schema research/ops tersisa : ${row.schemas}`);

await client.end();

const clean =
  row.tables === 0 &&
  row.routines === 0 &&
  row.policies === 0 &&
  row.enums === 0 &&
  row.schemas === 0;

console.log(
  clean
    ? "\n[BERSIH] Basis data aplikasi kosong.\n"
    : "\n[SISA] Masih ada objek tertinggal.\n",
);
process.exit(clean ? 0 : 1);
