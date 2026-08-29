<!-- @format -->

# JUKNIS — Mengisi Konten Nyata PT-AI LMS

Petunjuk teknis pengisian konten dari keadaan kosong sampai unit dapat dikerjakan mahasiswa.
Urutan di bawah **tidak boleh dibalik**: setiap langkah memakai hasil langkah sebelumnya, dan
sebagian ditolak basis data bila prasyaratnya belum ada.

Peran yang dibutuhkan: **Administrator** (langkah 1–3) dan **Dosen** (langkah 4–8).

---

## Ringkasan alur

```
Admin                                     Dosen
─────                                     ─────
1. Fakultas & program studi
2. Periode, mata kuliah, kelas
3. Akun + penugasan & pendaftaran
                                          4. Modul
                                          5. Unit  → 6 tahap dibuat otomatis
                                          6. Kasus pemantik        (wajib)
                                          7. Sumber → versi → source pack
                                          8. Rubrik → aktivitas    (wajib)
                                          9. Terbitkan unit & modul

Terminal                                  10. npm run ai:index
```

---

## Prasyarat: organisasi

Organisasi **belum memiliki formulir di antarmuka**. Saat ini organisasi hanya dibuat lewat
berkas seed `supabase/seed/0001_development_seed.sql`.

Untuk institusi baru, tambahkan barisnya di berkas itu lalu jalankan:

```bash
npm run db:seed
```

Seluruh langkah berikutnya bergantung pada satu organisasi yang sudah ada.

---

## 1. Fakultas dan program studi — Admin

**Halaman:** `/app/admin/organizations`

| Urutan | Formulir      | Isian                                                  |
| ------ | ------------- | ------------------------------------------------------ |
| 1      | Fakultas      | Organisasi, nama, kode                                 |
| 2      | Program studi | Fakultas, nama, kode, jenjang (`d3`, `s1`, `s2`, `s3`) |

Program studi menuntut fakultas sudah ada. Kode fakultas dan program studi harus unik dalam
organisasinya.

---

## 2. Periode, mata kuliah, dan kelas — Admin

### 2.1 Periode akademik

**Halaman:** `/app/admin/academic-periods`

Isi nama (misalnya "Ganjil 2026/2027"), kode, tanggal mulai, dan tanggal selesai.

> Tanggal selesai harus **setelah** tanggal mulai. Constraint basis data menolak yang terbalik,
> bukan hanya formulirnya.

Tandai satu periode sebagai aktif.

### 2.2 Mata kuliah

**Halaman:** `/app/admin/courses`

Isi program studi, kode (misalnya `PKN-101`), nama, dan jumlah SKS.

### 2.3 Kelas

**Halaman:** `/app/admin/classes`

Isi mata kuliah, periode akademik, kode kelas (misalnya `A`), dan nama.

Kelas dibuat berstatus **draf**. Ubah ke **terbit** setelah dosen dan mahasiswa terdaftar —
mahasiswa tidak dapat melihat kelas yang masih draf.

---

## 3. Akun dan keanggotaan kelas — Admin

### 3.1 Membuat akun

**Halaman:** `/app/admin/users`

Isi nama lengkap, surel institusi, identifier (NIP untuk dosen, NIM untuk mahasiswa), dan peran.

Kata sandi awal dibuat sistem dan ditampilkan **satu kali** setelah akun dibuat. Catat dan
sampaikan kepada pemiliknya melalui jalur yang aman.

### 3.2 Menugaskan dosen dan mendaftarkan mahasiswa

**Halaman:** `/app/admin/classes/[classId]`

- **Dosen pengampu** — dosen tanpa penugasan ini **tidak dapat membuka kelas sama sekali**,
  termasuk perancang materinya.
- **Mahasiswa** — daftarkan satu per satu. Mahasiswa yang tidak terdaftar tidak dapat melihat
  unit mana pun dari kelas tersebut.

> Batas ini ditegakkan Row Level Security, bukan hanya oleh tampilan. Melewatkan langkah ini
> membuat dosen melihat halaman kosong tanpa pesan galat yang jelas.

---

## 4. Modul — Dosen

**Halaman:** `/app/lecturer/classes/[classId]/builder`

Isi judul modul dan deskripsi singkat. Modul adalah wadah unit; satu mata kuliah biasanya
terdiri atas beberapa modul tematik.

---

## 5. Unit pembelajaran — Dosen

**Halaman:** `/app/lecturer/classes/[classId]/builder`

| Isian               | Keterangan                                                     |
| ------------------- | -------------------------------------------------------------- |
| Modul               | Modul induk                                                    |
| Judul               | Nama unit                                                      |
| Tujuan pembelajaran | Minimal 10 karakter; yang dibaca mahasiswa sebagai fokus tahap |
| Jenis unit          | `core` (inti), `remedial`, atau `enrichment` (pengayaan)       |
| Dibuka / ditutup    | Opsional                                                       |

**Enam tahap dibuat otomatis** saat unit tersimpan — Interpretasi, Analisis, Evaluasi,
Inferensi, Eksplanasi, Refleksi. Urutannya dikunci trigger `protect_stage_order()` dan tidak
dapat diubah siapa pun. Anda hanya dapat menyunting judul, fokus, dan status aktif tiap tahap.

---

## 6. Kasus pemantik — Dosen (wajib)

**Halaman:** `/app/lecturer/classes/[classId]/builder/units/[unitId]` → bagian **Kasus pemantik**

| Isian            | Batas minimum   |
| ---------------- | --------------- |
| Judul kasus      | 3 karakter      |
| Konteks          | 10 karakter     |
| Isi kasus        | **50 karakter** |
| Pertanyaan kunci | 10 karakter     |

Pisahkan paragraf isi kasus dengan **baris kosong** — pembaca kasus memecahnya menjadi paragraf
berdasarkan itu.

### Ciri kasus yang layak

Kasus yang baik untuk sistem ini bukan kasus yang punya satu jawaban benar. Yang dibutuhkan:

- Bukti yang **tidak lengkap atau saling bertentangan**, sehingga mahasiswa harus menimbang
- Klaim yang **terlihat masuk akal tetapi belum terbukti**, sehingga verifikasi jadi bermakna
- Pertanyaan kunci yang **menuntut posisi beralasan**, bukan menuntut penyebutan fakta

Kasus dengan jawaban tunggal membuat seluruh siklus revisi dan refleksi kehilangan gunanya.

---

## 7. Sumber, versi, dan source pack — Dosen

Ini adalah bagian yang paling sering terlewat, dan tanpanya bantuan AI tidak dapat mengutip
apa pun.

### 7.1 Membuat sumber

**Halaman:** `/app/lecturer/sources`

| Isian          | Keterangan                                                                                         |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Judul          | Minimal 5 karakter                                                                                 |
| Jenis          | `regulation`, `official_document`, `journal_article`, `book`, `news`, `report`, `dataset`, `other` |
| Penulis        | Opsional                                                                                           |
| Penerbit       | Opsional                                                                                           |
| Tanggal terbit | Opsional                                                                                           |
| URL            | Opsional, harus URL sah bila diisi                                                                 |
| Catatan kurasi | Alasan Anda memilih sumber ini                                                                     |

### 7.2 Menambahkan versi sumber

**Halaman yang sama**, pada sumber yang baru dibuat.

| Isian               | Keterangan                                                         |
| ------------------- | ------------------------------------------------------------------ |
| Label versi         | Misalnya `2026-08-29` atau `edisi-2`                               |
| Tanggal pengambilan | Kapan Anda mengambil isinya                                        |
| **Isi kutipan**     | **Minimal 20 karakter, maksimal 50.000** — teks yang akan diindeks |
| Catatan             | Opsional                                                           |

> **Isi kutipan inilah yang membatasi AI.** Yang tidak Anda tempelkan di sini tidak akan pernah
> dapat dikutip AI. Versi dipisahkan agar kutipan lama tetap terlacak ketika sumber diperbarui.

Salin bagian yang relevan saja — bukan seluruh dokumen — dan pastikan Anda berhak menyalinnya.

### 7.3 Melampirkan sumber ke kasus

**Halaman:** `.../builder/units/[unitId]` → bagian **Source pack kasus**

Pilih sumber, lalu tandai **wajib** atau tidak.

- Sumber **wajib** harus diverifikasi mahasiswa sebelum kriteria proses tahap itu dianggap
  lengkap.
- Source pack ini sekaligus menjadi **batas cakupan AI**: `match_source_chunks()` hanya mencari
  di dalamnya.

### 7.4 Klaim kasus

**Halaman yang sama** → bagian **Klaim kasus**

Tulis pernyataan yang harus ditimbang mahasiswa, minimal 10 karakter. Klaim inilah yang nanti
ditautkan mahasiswa ke bukti dengan relasi mendukung, membantah, atau memberi konteks.

Tulis klaim yang **dapat diperdebatkan**, bukan fakta yang tinggal dicek.

---

## 8. Rubrik dan aktivitas — Dosen

### 8.1 Rubrik (buat lebih dahulu bila aktivitas akan dinilai)

**Halaman:** `/app/lecturer/rubrics`

1. Buat rubrik: judul dan deskripsi.
2. Tambahkan kriteria: kode, deskripsi, **dimensi berpikir kritis**, dan bobot.
3. Tambahkan level untuk tiap kriteria: label, deskriptor, dan nilai.

Dimensi yang tersedia: `interpretation`, `analysis`, `evaluation`, `inference`, `explanation`,
`self_regulation`. Dimensi inilah yang muncul pada progres mahasiswa, jadi pemetaannya harus
sungguh-sungguh.

### 8.2 Aktivitas (wajib, minimal satu per unit)

**Halaman:** `.../builder/units/[unitId]` → bagian **Tambah aktivitas**

| Isian             | Keterangan                                                               |
| ----------------- | ------------------------------------------------------------------------ |
| Tahap             | Salah satu dari enam tahap                                               |
| Judul             | Nama aktivitas                                                           |
| Instruksi tugas   | Yang dibaca mahasiswa; minimal 10 karakter                               |
| Jenis             | `written_response`, `claim_mapping`, `source_verification`, `reflection` |
| Rubrik            | Opsional, tetapi **wajib bila ingin skor dimensi muncul**                |
| Ambang ketuntasan | 0–100, opsional                                                          |
| **Bantuan AI**    | **Mati secara bawaan** — nyalakan secara sadar                           |
| Fungsi AI         | Pilih hanya yang relevan untuk tahap itu                                 |

Enam fungsi AI yang tersedia: pertanyaan penuntun, umpan balik rubrik, petunjuk, kontraargumen,
klasifikasi kesalahan, rekomendasi jalur belajar.

> Aktivitas tanpa rubrik tetap dapat dinilai dosen, tetapi tidak menghasilkan
> `critical_thinking_scores`, sehingga dimensi mahasiswa tetap kosong.

### 8.3 Instruksi tambahan

**Bagian:** **Instruksi tambahan**

Tambahkan instruksi beraudiens `student` atau `lecturer`. Instruksi beraudiens `lecturer` tidak
pernah terlihat mahasiswa — pakai untuk catatan penilaian.

---

## 9. Menerbitkan — Dosen

Publikasi berjenjang dan ditolak bila prasyaratnya belum lengkap:

| Yang diterbitkan | Prasyarat                                        |
| ---------------- | ------------------------------------------------ |
| Aktivitas        | —                                                |
| **Unit**         | **Wajib punya kasus dan minimal satu aktivitas** |
| Modul            | —                                                |
| Kelas            | Diubah admin di `/app/admin/classes`             |

Keempatnya harus berstatus terbit agar mahasiswa dapat melihat unitnya. Melewatkan salah satu
membuat unit tidak muncul tanpa pesan galat.

---

## 10. Mengindeks sumber untuk AI — Terminal

Setelah source pack terisi, jalankan:

```bash
npm run ai:index
```

Perintah ini memotong isi versi sumber menjadi bagian-bagian, membuat embedding 1536 dimensi,
dan menyimpannya ke `source_chunks`.

**Wajib dijalankan ulang setiap kali Anda menambah atau mengubah versi sumber.** Tanpa itu,
bantuan AI berjalan tanpa bahan dan tidak akan menghasilkan kutipan.

Verifikasi hasilnya:

```bash
npm run ai:check
```

---

## Daftar periksa sebelum kelas dimulai

| #   | Pemeriksaan                                                             |
| --- | ----------------------------------------------------------------------- |
| 1   | Kelas berstatus **terbit**                                              |
| 2   | Seluruh dosen pengampu sudah ditugaskan                                 |
| 3   | Seluruh mahasiswa sudah didaftarkan                                     |
| 4   | Modul dan unit berstatus **terbit**                                     |
| 5   | Setiap unit punya kasus dan minimal satu aktivitas                      |
| 6   | Source pack terisi, sumber wajib sudah ditandai                         |
| 7   | Setiap versi sumber punya isi kutipan yang memadai                      |
| 8   | `npm run ai:index` sudah dijalankan setelah perubahan sumber terakhir   |
| 9   | `npm run ai:check` hijau                                                |
| 10  | Rubrik terpasang pada aktivitas yang akan dinilai                       |
| 11  | Aktivitas dengan bantuan AI sudah dinyalakan secara sengaja             |
| 12  | Mahasiswa sudah membuka `/app/student/consent` bila penelitian berjalan |

---

## Gejala yang sering muncul

| Gejala                             | Sebab yang paling sering                                           |
| ---------------------------------- | ------------------------------------------------------------------ |
| Mahasiswa melihat "belum ada unit" | Kelas, modul, atau unit masih draf; atau mahasiswa belum terdaftar |
| Dosen tidak dapat membuka kelas    | Belum ditugaskan sebagai dosen pengampu                            |
| Tombol terbitkan unit menolak      | Kasus atau aktivitas belum ada                                     |
| Panel AI terkunci                  | Mahasiswa belum mengirim respons awal — ini memang disengaja       |
| AI tidak memberi kutipan           | `npm run ai:index` belum dijalankan, atau source pack kosong       |
| Progres dimensi kosong             | Aktivitas belum berubrik, atau dosen belum menilai                 |
| Tahap berikutnya terkunci          | Dosen belum menetapkan ketuntasan tahap sebelumnya                 |

---

## Batas yang perlu diketahui sebelum mengisi

- **Respons awal, revisi, dan refleksi mahasiswa tidak dapat dihapus siapa pun.** Uji coba
  sebaiknya memakai kelas terpisah, bukan kelas yang akan dipakai sungguhan.
- **Urutan enam tahap tidak dapat diubah.** Bila rancangan Anda menuntut urutan lain, itu
  perubahan keputusan LOCKED yang harus melalui Change Request.
- **Bantuan AI mati secara bawaan** pada setiap aktivitas. Ini disengaja: menyalakannya adalah
  keputusan pedagogis yang harus diambil sadar, per aktivitas.
- **Kuota bantuan AI 20 per jam dan 80 per hari per mahasiswa.** Untuk kelas besar, periksa
  lebih dahulu apakah totalnya masih muat dalam batas penyedia.
