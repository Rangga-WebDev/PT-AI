<!-- @format -->

# DEPLOYMENT — PT-AI Learning Management System

Prosedur rilis dan pemulihan. Dokumen ini ditujukan untuk orang yang menekan
tombolnya, bukan untuk pembaca umum: setiap langkah dapat dijalankan apa adanya.

## 1. Prasyarat

| Kebutuhan        | Nilai                                                       |
| ---------------- | ----------------------------------------------------------- |
| Node.js          | 24.x (diuji pada 24.14.0)                                   |
| npm              | 11.x                                                        |
| Database         | Supabase PostgreSQL 15 dengan `pgvector` dan `pgtap`        |
| Penyedia AI      | Google Gemini, kunci API dengan akses `generateContent`     |
| Runtime aplikasi | Node.js (bukan Edge) — Server Actions memakai `node:crypto` |

## 2. Variabel lingkungan

Wajib ada sebelum `npm run build`:

| Variabel                        | Dipakai di   | Keterangan                             |
| ------------------------------- | ------------ | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | klien+server | URL proyek Supabase                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | klien+server | Kunci anon; seluruh akses dibatasi RLS |
| `SUPABASE_SERVICE_ROLE_KEY`     | server       | **Tidak boleh** sampai ke bundel klien |
| `GEMINI_API_KEY`                | server       | **Tidak boleh** sampai ke bundel klien |
| `SUPABASE_DB_PASSWORD`          | skrip        | Hanya untuk migration dan uji database |
| `AI_PROVIDER_MODE`              | opsional     | `fake` untuk lingkungan uji            |

Verifikasi kebocoran sebelum rilis:

```bash
npm run check:secrets
```

Skrip itu memindai bundel klien hasil build. Kegagalannya **menghentikan rilis**.

## 3. Urutan rilis

```bash
npm ci
npm run lint
npm run typecheck
npm run test
npm run test:db
npm run build
npm run test:e2e
npm run check:secrets
npm run check:sql
```

Setelah seluruhnya hijau:

```bash
# 1. Terapkan migration yang belum tercatat, satu per satu bila perlu
npm run db:migrate -- 20260829100017_research_export.sql

# 2. Indeks ulang sumber untuk RAG bila ada sumber baru
npm run ai:index

# 3. Uji jalur AI sungguhan terhadap penyedia
npm run ai:check

# 4. Jalankan server produksi
npm run start

# 5. Verifikasi header keamanan pada host yang berjalan
npm run check:headers
```

### Catatan migration

`scripts/apply-migrations.mjs` mencatat berkas yang sudah diterapkan di schema
`ops.applied_migrations`. Menjalankannya **tanpa argumen** akan mencoba
menerapkan seluruh berkas termasuk yang sudah pernah dijalankan di luar skrip
ini, dan gagal pada `type "role_key" already exists`. Sebutkan nama berkasnya.

Migration ditulis dengan `create or replace` sedapat mungkin sehingga aman
dijalankan ulang.

## 4. Rollback

### 4.1 Rollback aplikasi

Aplikasi tidak menyimpan keadaan di luar database, sehingga pengembalian versi
cukup dengan menerbitkan commit sebelumnya:

```bash
git log --oneline -5
git checkout <commit-sebelumnya>
npm ci
npm run build
npm run start
```

Jalankan `npm run check:headers` lagi setelah rollback: versi lama mungkin
belum memiliki header keamanan.

### 4.2 Rollback migration

**Migration PT-AI tidak memiliki skrip `down`.** Ini disengaja: sebagian besar
perubahan menyentuh tabel append-only yang tidak dapat dikembalikan tanpa
kehilangan jejak belajar (LOCK-PED-012).

Prosedurnya:

1. **Jangan** membuat migration yang menghapus kolom atau tabel berisi jejak
   mahasiswa. Tambahkan yang baru, jangan buang yang lama.
2. Untuk perubahan fungsi atau policy, tulis migration baru yang mengembalikan
   definisi sebelumnya — bukan menghapus migration yang sudah diterapkan.
3. Untuk kegagalan berat, pulihkan dari Point-in-Time Recovery Supabase.
   Catat waktunya sebelum memulai rilis agar titik pemulihan diketahui.

### 4.3 Pencabutan kunci

Bila `SUPABASE_SERVICE_ROLE_KEY` atau `GEMINI_API_KEY` diduga bocor:

1. Terbitkan kunci baru di dashboard penyedia.
2. Perbarui variabel lingkungan, lalu bangun ulang.
3. Cabut kunci lama.
4. Periksa `audit_logs` untuk pemakaian service role di rentang waktu terdampak.

Urutan ini penting: mencabut lebih dulu akan mematikan aplikasi.

## 5. Setelah rilis

| Pemeriksaan                 | Perintah / tempat                            |
| --------------------------- | -------------------------------------------- |
| Header keamanan             | `npm run check:headers`                      |
| Kebocoran rahasia           | `npm run check:secrets`                      |
| Konsistensi SQL             | `npm run check:sql`                          |
| Kerentanan dependency       | `npm audit --omit=dev`                       |
| Retensi data (dry-run)      | `npm run data:retention`                     |
| Laporan respons AI          | `/app/lecturer/incidents`                    |
| Log akses ekspor penelitian | tabel `audit_logs`, aksi `research_export:*` |

## 6. Yang sengaja tidak dilakukan

- **Tidak ada penghapusan otomatis jejak belajar.** Retensi hanya berlaku pada
  domain yang bukan append-only. Penghapusan data penelitian dilakukan dengan
  memutus pemetaan identitas peserta.
- **Tidak ada `unsafe-inline` pada `script-src`.** `style-src-attr` sengaja
  dilonggarkan karena bar progres memakai atribut `style`; atribut style tidak
  dapat mengeksekusi skrip.
- **Halaman publik dipaksa dinamis** (`force-dynamic`) agar nonce CSP dapat
  disisipkan. Halaman statis kehilangan nonce dan skrip hidrasinya diblokir.
