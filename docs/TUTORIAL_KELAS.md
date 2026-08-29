<!-- @format -->

# TUTORIAL PENGGUNAAN DI KELAS

Panduan operasional satu semester: apa yang dilakukan administrator, dosen, dan mahasiswa,
pada saat apa, dan apa yang harus diperhatikan.

Dokumen ini mengasumsikan konten sudah diisi. Bila belum, kerjakan
[JUKNIS_KONTEN.md](JUKNIS_KONTEN.md) lebih dahulu.

---

## Peta tanggung jawab

| Peran         | Sebelum semester                              | Selama semester                                 | Akhir semester             |
| ------------- | --------------------------------------------- | ----------------------------------------------- | -------------------------- |
| Administrator | Struktur akademik, akun, pendaftaran kelas    | Menambah mahasiswa susulan                      | Ekspor penelitian, retensi |
| Dosen         | Modul, unit, kasus, sumber, rubrik, aktivitas | Menilai, memutuskan jalur, menangani laporan AI | Posttest, analitik         |
| Mahasiswa     | —                                             | Menulis, memverifikasi, merevisi, merefleksi    | —                          |

Satu hal yang tidak dapat didelegasikan: **keputusan ketuntasan adalah wewenang dosen.**
Sistem hanya mengusulkan, tidak pernah memutuskan.

---

## Bagian 1 — Sebelum pertemuan pertama

### 1.1 Administrator

- [ ] Kelas berstatus **terbit**
- [ ] Seluruh dosen pengampu ditugaskan di `/app/admin/classes/[classId]`
- [ ] Seluruh mahasiswa didaftarkan
- [ ] Kata sandi awal sudah disampaikan lewat jalur aman

> Kata sandi awal hanya ditampilkan **satu kali** setelah akun dibuat. Bila terlewat,
> mahasiswa harus memakai "Lupa kata sandi".

### 1.2 Dosen

- [ ] Unit pertama terbit beserta kasus dan aktivitasnya
- [ ] Source pack terisi; sumber wajib sudah ditandai
- [ ] `npm run ai:index` sudah dijalankan setelah perubahan sumber terakhir
- [ ] Rubrik terpasang pada aktivitas yang akan dinilai
- [ ] Sudah memutuskan aktivitas mana yang boleh dibantu AI

### 1.3 Uji coba mandiri

Sebelum mahasiswa masuk, **kerjakan sendiri satu unit dari awal sampai akhir memakai akun
mahasiswa uji** — bukan akun mahasiswa sungguhan.

Alasannya keras: respons awal, revisi, dan refleksi **tidak dapat dihapus siapa pun**. Salah
kirim pada akun mahasiswa sungguhan akan menetap di jejak belajarnya selamanya.

---

## Bagian 2 — Pertemuan pertama

Sediakan sekitar 30 menit. Empat hal yang wajib disampaikan:

### 2.1 Aturan main

Sampaikan apa adanya, karena mahasiswa akan menemukannya sendiri dalam beberapa menit:

> "Bantuan AI baru terbuka setelah kalian mengirim jawaban sendiri. Ini bukan hambatan teknis;
> ini memang aturannya. Yang dinilai adalah penalaran kalian, dan AI hanya bisa menanggapi
> sesuatu yang sudah kalian pikirkan."

### 2.2 Respons awal bersifat permanen

> "Jawaban pertama kalian tersimpan selamanya dan tidak bisa diubah, bahkan oleh dosen. Bukan
> untuk menghukum, melainkan supaya perkembangan berpikir kalian terlihat. Kalau berubah
> pikiran, tulis revisi — dan revisi yang bagus justru bernilai lebih tinggi daripada jawaban
> pertama yang kebetulan benar."

### 2.3 AI adalah objek yang diperiksa, bukan otoritas

> "AI di sini bisa salah, dan itu disengaja bagian dari latihan. Setiap kutipannya bisa kalian
> telusuri. Kalau kutipannya tidak dapat dilacak, sistem menandainya. Kalau sarannya
> mengarahkan ke jawaban jadi, laporkan — laporan itu masuk ke dosen."

### 2.4 Persetujuan penelitian (bila kelas menjadi bagian penelitian)

Arahkan ke `/app/student/consent`. Tekankan tiga hal:

- Keikutsertaan **sukarela** dan tidak memengaruhi nilai
- Dosen **tidak dapat melihat** keputusan mereka
- Persetujuan dapat ditarik kapan saja

> Jangan mendampingi mahasiswa saat mereka memutuskan. Kehadiran dosen di sebelah layar
> membuat "sukarela" kehilangan artinya.

### 2.5 Login pertama

Mahasiswa masuk di `/login`, lalu diarahkan ke `/app/student/dashboard`.

---

## Bagian 3 — Siklus satu tahap

Inilah inti pemakaian, berulang enam kali per unit. Satu tahap biasanya memakan satu sampai dua
pertemuan.

```
Mahasiswa: baca kasus → tulis respons awal → minta bantuan AI → sikapi saran
           → verifikasi sumber → tautkan klaim ke bukti → revisi → refleksi
Dosen:     tinjau → nilai rubrik → tetapkan ketuntasan → putuskan jalur belajar
Sistem:    buka tahap berikutnya
```

### 3.1 Mahasiswa membaca kasus dan menulis respons awal

**Halaman:** `/app/student/learn/[unitId]/stage/interpretation`

Yang terlihat mahasiswa: kasus pemantik, daftar aktivitas, sumber terkurasi, dan editor jawaban.

- Draf tersimpan otomatis; status penyimpanan terlihat di bawah editor
- Tombol kirim aktif setelah **minimal 20 karakter**
- Setelah dikirim, editor terkunci dan **tidak dapat dibuka lagi**

**Yang perlu diingatkan dosen:** minta mahasiswa menulis pendirian, bukan ringkasan kasus.
Respons yang hanya mengulang isi kasus tidak memberi bahan apa pun untuk dinilai maupun
direvisi.

### 3.2 Bantuan AI terbuka

Setelah respons awal tersimpan, panel bantuan AI muncul — hanya bila dosen mengaktifkannya pada
aktivitas tersebut.

Mahasiswa memilih fungsi yang tersedia, lalu **wajib menyikapi** setiap saran:

| Sikap        | Kapan dipakai                                                  |
| ------------ | -------------------------------------------------------------- |
| **Terima**   | Saran itu mengubah atau memperkuat penalarannya                |
| **Abaikan**  | Saran itu tidak relevan atau sudah dipikirkan                  |
| **Laporkan** | Saran mengarahkan ke jawaban jadi, keliru, atau tidak terlacak |

Saran yang dibiarkan tanpa sikap membuat kriteria proses tahap itu tidak lengkap, dan terlihat
oleh dosen.

**Kutipan AI** dapat ditelusuri ke sumbernya. Kutipan yang tidak dapat dilacak ke source pack
ditandai jelas — bukan disembunyikan. Ini bahan diskusi yang bagus di kelas.

### 3.3 Verifikasi sumber

**Halaman:** `/app/student/sources/[sourceId]?activity=...`, atau lewat kartu sumber di halaman
tahap.

Mahasiswa mengisi checklist enam kriteria:

| Kriteria     | Pertanyaan                                               |
| ------------ | -------------------------------------------------------- |
| Kredibilitas | Siapa penulis atau lembaganya, apa dasar kewenangannya?  |
| Relevansi    | Apakah isinya menjawab pertanyaan kasus?                 |
| Kecukupan    | Apakah buktinya memadai untuk menopang klaim?            |
| Keterlacakan | Dapatkah data atau kutipan ditelusuri ke sumber aslinya? |
| Konsistensi  | Apakah konsisten dengan sumber lain yang kredibel?       |
| Bias         | Adakah kepentingan yang memengaruhi penyajiannya?        |

Lalu menetapkan kesimpulan: **Kredibel**, **Perlu ditelaah**, atau **Tidak layak dipakai**,
disertai catatan minimal 10 karakter.

> Keenam kriteria harus terisi. Basis data menolak checklist setengah jadi, bukan hanya
> formulirnya. Hasil verifikasi juga **permanen**.

### 3.4 Menautkan klaim ke bukti

Pada halaman sumber, mahasiswa menautkan klaim kasus ke sumber dengan salah satu relasi:
**mendukung**, **membantah**, atau **memberi konteks**.

Berbeda dari verifikasi, tautan klaim **dapat dicabut** oleh penautnya — menautkan bukti adalah
kerja eksploratif, dan mahasiswa boleh berubah pikiran.

### 3.5 Revisi

Kembali ke halaman tahap, bagian **Revisi**.

| Isian            | Ketentuan                                                        |
| ---------------- | ---------------------------------------------------------------- |
| Isi revisi       | Minimal 20 karakter                                              |
| Alasan revisi    | Pilih jenisnya                                                   |
| Penjelasan       | Minimal 10 karakter                                              |
| Saran AI terkait | **Wajib ditunjuk** bila alasannya menerima atau menolak saran AI |

Jenis alasan yang tersedia: menerima saran AI, menolak saran AI, menemukan bukti baru,
menindaklanjuti masukan dosen, hasil peninjauan sendiri, lainnya.

Setelah tersimpan, **riwayat revisi** muncul dengan perbandingan kata per kata terhadap versi
sebelumnya — kata yang ditambahkan dan dihapus ditandai berbeda.

**Nilai pedagogisnya ada di sini.** Bawa tampilan diff ini ke layar kelas dan bahas: apa yang
berubah, dan bukti apa yang membuatnya berubah.

### 3.6 Refleksi

Sembilan pertanyaan, masing-masing minimal 10 karakter:

1. Apa jawaban awal Anda?
2. Umpan balik apa yang Anda terima?
3. Sumber apa yang Anda verifikasi?
4. Apa jawaban akhir Anda?
5. Mengapa Anda mengubahnya?
6. Saran AI mana yang Anda terima?
7. Saran AI mana yang Anda tolak?
8. Bias apa yang Anda temukan?
9. Apa strategi Anda berikutnya?

Refleksi **tersimpan permanen** dan hanya dapat diisi sekali per respons awal.

> Refleksi tidak memblokir tahap berikutnya. Yang belum mengisi akan terlihat oleh dosen
> sebagai kriteria proses yang belum lengkap, dan itu bahan percakapan — bukan hukuman
> otomatis.

### 3.7 Pernyataan penggunaan AI

Mahasiswa menuliskan bagaimana mereka memakai AI pada aktivitas itu, minimal 10 karakter.
Fungsi yang benar-benar mereka pakai terisi otomatis.

---

## Bagian 4 — Dosen menilai

### 4.1 Antrean tinjauan

**Halaman:** `/app/lecturer/review`

Berisi respons awal seluruh mahasiswa pada kelas yang Anda ampu, terbaru di atas. Klik **Nilai**
untuk membuka halaman penilaian.

### 4.2 Halaman penilaian

**Halaman:** `/app/lecturer/review/[attemptId]`

Dalam satu layar tersedia: respons awal, riwayat revisi beserta diff, refleksi sembilan unsur,
dan formulir penilaian.

**Penilaian rubrik**

- Isi skor tiap kriteria; skor berbobot dihitung otomatis sebagai bahan pertimbangan
- Tetapkan hasil: **Memenuhi**, **Sebagian memenuhi**, atau **Belum memenuhi**
- Tulis catatan untuk mahasiswa, minimal 10 karakter

Skor per kriteria masuk ke dimensi berpikir kritis mahasiswa. **Aktivitas tanpa rubrik tidak
menghasilkan skor dimensi**, sehingga halaman progres mahasiswa akan tetap kosong.

**Keputusan jalur belajar**

Pilih tindakan — lanjut, remedial, pengayaan, atau tahan sementara — disertai alasan minimal 10
karakter.

> Alasan ini **dibaca mahasiswa** di halaman progresnya. Tulislah sebagai penjelasan kepada
> mereka, bukan catatan untuk diri sendiri.

**Override**

Bila keputusan sebelumnya perlu diubah, pakai override. Nilai lama, nilai baru, dan alasannya
tersimpan; riwayat tidak pernah hilang.

**Umpan balik per revisi**

Di bawah setiap revisi tersedia kolom umpan balik minimal 10 karakter. Catatan bersifat
permanen; koreksi ditulis sebagai catatan baru.

### 4.3 Bagaimana tahap berikutnya terbuka

| Keadaan                                   | Akibat bagi mahasiswa                                    |
| ----------------------------------------- | -------------------------------------------------------- |
| Belum ada penilaian, proses belum lengkap | Tahap berikutnya terkunci                                |
| Proses lengkap, dosen belum menilai       | Tahap berikutnya **terbuka sementara** dengan keterangan |
| Dosen menilai **Memenuhi**                | Tahap berikutnya terbuka penuh                           |
| Dosen menilai **Belum memenuhi**          | Tahap berikutnya terkunci kembali                        |

"Terbuka sementara" berarti mahasiswa boleh melanjutkan sambil menunggu penilaian Anda. Ini
mencegah kelas berhenti hanya karena antrean penilaian menumpuk.

### 4.4 Ritme yang disarankan

Nilai dalam **dua sampai tiga hari kerja**. Lebih lama dari itu, mahasiswa akan terlanjur jauh
di jalur sementara, dan penilaian "Belum memenuhi" yang datang belakangan terasa seperti
membatalkan pekerjaan mereka.

---

## Bagian 5 — Menangani laporan AI

**Halaman:** `/app/lecturer/incidents`

Setiap laporan mahasiswa muncul di sini beserta saran AI yang dilaporkan dan alasannya.

Tetapkan status — **sedang ditinjau**, **selesai ditangani**, atau **tidak berdasar** — disertai
catatan penyelesaian minimal 10 karakter.

**Perlakukan laporan sebagai bahan ajar, bukan keluhan teknis.** Mahasiswa yang berhasil
menunjukkan AI keliru sedang melakukan persis apa yang dilatih mata kuliah ini. Bahas contoh
terbaiknya di kelas.

Bila satu jenis saran keliru berulang, kemungkinan besar source pack-nya yang kurang memadai —
periksa apakah isi kutipan versi sumber cukup lengkap.

---

## Bagian 6 — Memantau kelas

**Halaman:** `/app/lecturer/classes/[classId]/analytics`

| Bagian                | Isi                                                           |
| --------------------- | ------------------------------------------------------------- |
| Distribusi ketuntasan | Berapa mahasiswa memenuhi, sebagian, belum, dan belum dinilai |
| Aktivitas tercatat    | Peristiwa nyata yang tersimpan, bukan estimasi                |
| Pengamatan proses     | Pernyataan faktual per mahasiswa                              |
| Keterlaksanaan model  | Checklist observasi untuk kebutuhan penelitian                |

Pengamatan proses berbunyi seperti "belum mengirim respons awal", "2 saran AI belum
ditanggapi", atau "skor Analisis turun dari 80 ke 65 antar-pengukuran".

> Sistem sengaja **tidak melabeli mahasiswa**. Tidak ada "stagnan" atau "lemah" — yang diukur
> adalah kinerja pada satu waktu, bukan sifat orang. Gunakan pengamatan ini untuk memulai
> percakapan, bukan untuk menyimpulkan.

Isi **checklist keterlaksanaan** secara berkala bila kelas ini bagian dari penelitian. Tanpa
catatan itu, tidak ada bukti bahwa model pembelajaran benar-benar dijalankan sebagaimana
dirancang.

---

## Bagian 7 — Pretest dan posttest

**Halaman:** `/app/lecturer/classes/[classId]/instruments`

### Sebelum perlakuan

1. Buat instrumen bertipe **Pretest**
2. Setelah menilai, catat skor per mahasiswa per dimensi

### Sesudah perlakuan

Ulangi dengan instrumen bertipe **Posttest**.

Skor instrumen tersimpan dengan penanda sumber pengukuran tersendiri sehingga tidak bercampur
dengan penilaian rubrik harian. Tanpa pemisahan ini, perbandingan sebelum–sesudah tidak sah
untuk penelitian.

> Pretest harus dilakukan **sebelum** mahasiswa menyentuh unit pertama. Setelah itu, angkanya
> bukan lagi kondisi awal.

---

## Bagian 8 — Akhir semester

### 8.1 Dosen

- [ ] Seluruh respons awal sudah dinilai
- [ ] Posttest tercatat
- [ ] Checklist keterlaksanaan terisi
- [ ] Laporan AI yang masih terbuka sudah ditangani

### 8.2 Administrator

**Ekspor penelitian** — `/app/admin/retention`

Tersedia tiga berkas CSV: metrik respons dan revisi, skor berpikir kritis, dan pemakaian
bantuan AI.

Seluruhnya berpseudonim. Nama, NIM, dan surel tidak pernah ikut. Setiap unduhan tercatat pada
log audit.

> Mahasiswa yang menarik persetujuan otomatis hilang dari seluruh berkas ekspor. Bila jumlah
> baris lebih sedikit dari yang Anda harapkan, kemungkinan besar itu sebabnya — dan itu memang
> perilaku yang benar.

**Retensi data** — halaman yang sama

Tetapkan masa simpan untuk domain yang tunduk retensi. Jalankan sebagai simulasi lebih dahulu:

```bash
npm run data:retention           # dry-run, tidak mengubah apa pun
npm run data:retention -- --apply
```

---

## Yang tidak dapat dilakukan siapa pun

Sampaikan ini kepada dosen dan mahasiswa di awal agar tidak menjadi konflik di tengah semester:

| Permintaan                                 | Jawaban                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| "Hapus jawaban pertama saya, saya salah"   | Tidak bisa. Tulis revisi — perubahan pikiran justru yang dinilai.                        |
| "Ubah hasil verifikasi saya"               | Tidak bisa. Verifikasi bersifat permanen.                                                |
| "Hapus refleksi saya"                      | Tidak bisa. Refleksi hanya dapat diisi sekali.                                           |
| "Admin tolong lihat nilai saya"            | Administrator tidak memiliki akses ke nilai maupun jawaban.                              |
| "Bu/Pak, saya ikut penelitian atau tidak?" | Dosen tidak dapat melihat keputusan itu, dan memang dirancang begitu.                    |
| "Lewati saja tahap ini"                    | Urutan enam tahap dikunci basis data.                                                    |
| "Hapus semua data saya dari penelitian"    | Kaitan identitas diputus permanen; jejak belajar tetap ada tetapi tidak dapat dikaitkan. |

---

## Masalah yang mungkin muncul saat kelas berjalan

| Gejala                                    | Periksa                                                          |
| ----------------------------------------- | ---------------------------------------------------------------- |
| Mahasiswa tidak melihat unit              | Kelas, modul, dan unit sudah terbit? Mahasiswa sudah terdaftar?  |
| Panel AI tidak muncul                     | Respons awal sudah dikirim? Bantuan AI aktif pada aktivitas itu? |
| AI menjawab tanpa kutipan                 | `npm run ai:index` sudah dijalankan? Source pack terisi?         |
| "Batas per jam bantuan AI sudah tercapai" | Kuota 20 per jam per mahasiswa; tunggu, atau lanjutkan tanpa AI  |
| Tahap berikutnya tetap terkunci           | Anda sudah menetapkan ketuntasan tahap sebelumnya?               |
| Progres dimensi kosong                    | Aktivitas berubrik? Anda sudah mengisi skor kriteria?            |
| Mahasiswa susulan tidak dapat masuk kelas | Admin belum mendaftarkannya                                      |

---

## Ringkasan untuk dibagikan kepada mahasiswa

Bagian ini dapat disalin utuh ke lembar panduan kelas.

> **Cara kerja PT-AI LMS**
>
> 1. Baca kasus, lalu **tulis jawabanmu sendiri**. Jawaban pertama tersimpan permanen dan tidak
>    dapat diubah — termasuk oleh dosen.
> 2. Setelah itu **bantuan AI terbuka**. AI tidak memberi jawaban jadi; ia mengajukan pertanyaan
>    dan menunjukkan celah.
> 3. **Sikapi setiap saran AI**: terima, abaikan, atau laporkan. Saran yang dibiarkan membuat
>    prosesmu dianggap belum lengkap.
> 4. **Periksa sumber** pada enam kriteria, lalu tautkan klaim ke bukti.
> 5. **Tulis revisi** disertai alasan. Revisi yang beralasan bernilai lebih tinggi daripada
>    jawaban pertama yang kebetulan benar.
> 6. **Isi refleksi** sembilan pertanyaan.
> 7. Tahap berikutnya terbuka setelah dosen menilai. Kadang terbuka sementara sambil menunggu.
>
> **AI di sini bisa salah, dan itu memang bagian dari latihan.** Kalau kamu menemukan
> kutipannya tidak dapat ditelusuri atau sarannya mengarahkan ke jawaban jadi, laporkan.
> Menemukan kesalahan AI adalah keterampilan yang sedang kita latih.
