/** @format */

import type { Guide } from "./types";

export const lecturerGuide: Guide = {
  title: "Panduan Penggunaan PT-AI untuk Dosen",
  audience: "lecturer",
  intro:
    "Panduan ini mengikuti aplikasi yang berjalan sekarang. Setiap langkah menyebut menu dan tombol yang benar-benar ada di layar Anda.",
  sections: [
    {
      id: "mengenal",
      title: "Mengenal PT-AI",
      blocks: [
        {
          kind: "paragraph",
          text: "PT-AI adalah kelas daring biasa yang di dalamnya terdapat rangkaian latihan berpikir kritis. Mahasiswa membaca materi seperti di LMS pada umumnya, lalu mengerjakan aktivitas PT-AI yang menuntut mereka menjawab lebih dahulu, memeriksa bukti, memperbaiki jawaban, dan merefleksikan cara berpikirnya.",
        },
        {
          kind: "paragraph",
          text: "AI berperan sebagai pendamping proses: ia memancing pertanyaan, menunjukkan bukti, dan memberi saran. Keputusan nilai tetap sepenuhnya milik Anda.",
        },
      ],
    },
    {
      id: "masuk",
      title: "Masuk ke aplikasi",
      blocks: [
        {
          kind: "steps",
          items: [
            "Buka halaman masuk aplikasi.",
            "Masukkan surel dan kata sandi akun dosen Anda.",
            "Setelah masuk, Anda akan melihat menu Pengajaran di sisi kiri.",
          ],
        },
        {
          kind: "note",
          text: "Akun dibuat oleh administrator kampus. Aplikasi ini tidak menyediakan pendaftaran mandiri.",
        },
      ],
    },
    {
      id: "membuat-kelas",
      title: "Membuat kelas",
      blocks: [
        {
          kind: "steps",
          items: [
            "Buka menu Kelas.",
            "Tekan tombol + Buat kelas.",
            "Pilih Mata kuliah.",
            "Isi Kelas dengan penanda rombongan, misalnya A.",
            "Pilih Periode akademik. Periode yang sedang berjalan sudah terpilih lebih dulu.",
            "Isi Kapasitas bila perlu; kolom ini boleh dikosongkan.",
            "Tekan Buat kelas.",
          ],
        },
        {
          kind: "paragraph",
          text: "Nama kelas disusun otomatis dari nama mata kuliah dan penanda yang Anda isi, misalnya Pendidikan Kewarganegaraan A. Anda dapat melihat hasilnya di layar sebelum menekan tombol.",
        },
        {
          kind: "list",
          items: [
            "Daftar mata kuliah berasal dari data kampus yang dikelola administrator.",
            "Anda tidak membuat mata kuliah baru dari alur ini.",
            "Anda langsung tercatat sebagai dosen pengampu kelas tersebut.",
            "Kelas baru berstatus Draf, sehingga belum terlihat oleh mahasiswa.",
          ],
        },
        {
          kind: "limit",
          text: "Bila daftar mata kuliah kosong, mata kuliah Anda belum didaftarkan. Hubungi administrator.",
        },
      ],
    },
    {
      id: "menambahkan-mahasiswa",
      title: "Menambahkan mahasiswa",
      blocks: [
        {
          kind: "steps",
          items: [
            "Buka kelas Anda, lalu pilih Mahasiswa.",
            "Tekan + Tambah mahasiswa.",
            "Ketik nama atau NIM mahasiswa, minimal dua huruf.",
            "Tekan Cari.",
            "Tekan Daftarkan pada nama yang sesuai.",
          ],
        },
        {
          kind: "paragraph",
          text: "Hasil pencarian hanya memuat akun mahasiswa di kampus Anda yang belum terdaftar di kelas ini. Mahasiswa yang sudah didaftarkan hilang dari daftar hasil.",
        },
        {
          kind: "limit",
          text: "Pencarian melalui alamat surel, pendaftaran massal lewat berkas, pendaftaran mandiri oleh mahasiswa, dan pengeluaran mahasiswa dari kelas belum tersedia.",
        },
      ],
    },
    {
      id: "menyiapkan-kelas",
      title: "Menyiapkan kelas",
      blocks: [
        {
          kind: "paragraph",
          text: "Setiap kelas memiliki bagian yang sama, dapat dibuka dari bilah di bawah nama kelas.",
        },
        {
          kind: "definitions",
          items: [
            {
              term: "Ringkasan",
              description:
                "Pintu masuk kelas, status terbit, dan jalan pintas ke bagian lain.",
            },
            {
              term: "Materi",
              description: "Bahan ajar berupa berkas, tautan, atau catatan.",
            },
            {
              term: "Pertemuan",
              description: "Susunan pertemuan beserta tujuannya.",
            },
            {
              term: "PT-AI",
              description:
                "Unit berpikir kritis, kasus pemantik, dan aktivitasnya.",
            },
            {
              term: "Mahasiswa",
              description: "Peserta kelas dan pintu ke portofolio mereka.",
            },
            {
              term: "Review",
              description: "Antrean pekerjaan mahasiswa yang menunggu dinilai.",
            },
            {
              term: "Progres",
              description: "Gambaran capaian kelas.",
            },
          ],
        },
        {
          kind: "note",
          text: "Kelas yang masih kosong menampilkan dua ajakan di Ringkasan: Tambah materi dan Siapkan dari RPS.",
        },
      ],
    },
    {
      id: "menambahkan-materi",
      title: "Menambahkan materi",
      blocks: [
        {
          kind: "paragraph",
          text: "Buka kelas, lalu pilih Materi. Tersedia tiga cara menambahkan bahan.",
        },
        {
          kind: "definitions",
          items: [
            {
              term: "Unggah berkas",
              description:
                "Untuk dokumen seperti PDF atau Word. Berkas disimpan tertutup dan hanya dapat dibuka melalui aplikasi dengan menekan Lihat.",
            },
            {
              term: "Simpan tautan",
              description: "Untuk bahan yang sudah tersedia di internet.",
            },
            {
              term: "Simpan materi",
              description:
                "Untuk catatan yang Anda tulis sendiri langsung di aplikasi.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Setiap bahan bermula sebagai draf. Tekan Terbitkan agar mahasiswa dapat melihatnya, dan Tarik bila ingin menyembunyikannya kembali. Tekan Ubah untuk menyunting judul atau keterangannya.",
        },
        {
          kind: "note",
          text: "Bahan berstatus draf tidak pernah terlihat oleh mahasiswa, meskipun kelasnya sudah terbit.",
        },
      ],
    },
    {
      id: "quick-setup",
      title: "Menyiapkan kelas dari RPS atau CPMK dengan AI",
      blocks: [
        {
          kind: "paragraph",
          text: "Bila Anda sudah memiliki RPS atau daftar CPMK, AI dapat menyusunkan rancangan pertemuan dari dokumen itu.",
        },
        {
          kind: "steps",
          items: [
            "Buka Ringkasan kelas, lalu tekan Siapkan dari RPS. Anda juga dapat membuka Quick Setup dari daftar tautan di bawah Ringkasan.",
            "Unggah RPS atau CPMK dengan tombol Unggah dokumen. Dokumennya sekaligus tersimpan sebagai bahan kelas.",
            "Tunggu sampai teks dokumen terbaca. Bila belum terbaca, buka Materi lalu tekan Baca teks pada dokumen tersebut.",
            "Pada bagian Susun draf baru, pilih dokumen dan jenisnya, lalu tekan Susun draf dengan AI.",
          ],
        },
        {
          kind: "note",
          text: "Hasilnya selalu berupa draf. AI tidak pernah mengubah kelas Anda dengan sendirinya dan tidak pernah menerbitkan apa pun.",
        },
        {
          kind: "limit",
          text: "Jika dokumen PDF tidak memiliki teks yang dapat dibaca — misalnya hasil pindaian — aplikasi akan memberi tahu bahwa dokumen tidak dapat dibaca. Pembacaan tulisan dari gambar belum tersedia. Gunakan dokumen dalam bentuk teks.",
        },
      ],
    },
    {
      id: "memeriksa-draf",
      title: "Memeriksa hasil Quick Setup",
      blocks: [
        {
          kind: "steps",
          items: [
            "Pada bagian Draf tersimpan, tekan Tinjau draf.",
            "Baca daftar CPMK/Sub-CPMK, pertemuan, dan referensi yang dibaca AI.",
            "Sunting bagian yang keliru langsung di halaman itu.",
            "Bila sudah sesuai, tekan Setujui draf. Bila tidak terpakai, tekan Buang draf.",
          ],
        },
        {
          kind: "paragraph",
          text: "Draf tetap tersimpan meskipun Anda menutup halaman, sehingga pemeriksaan dapat dilanjutkan kapan saja.",
        },
        {
          kind: "note",
          text: "Periksa isi draf terhadap dokumen aslinya. AI dapat salah membaca, dan yang bertanggung jawab atas isi kelas tetap Anda.",
        },
      ],
    },
    {
      id: "menerapkan-pertemuan",
      title: "Menerapkan struktur pertemuan",
      blocks: [
        {
          kind: "steps",
          items: [
            "Pada draf yang sudah disetujui, tekan Terapkan ke kelas.",
            "Baca pratinjau daftar pertemuan yang akan dibuat.",
            "Tekan Terapkan ke kelas sekali lagi untuk memastikan.",
          ],
        },
        {
          kind: "paragraph",
          text: "Pertemuan dibuat sebagai draf. Pertemuan yang sudah ada tidak ditimpa, dan tidak ada yang diterbitkan kepada mahasiswa.",
        },
        {
          kind: "limit",
          text: "CPMK dan Sub-CPMK yang dibaca AI tetap tersedia pada draf untuk ditinjau, tetapi belum tersimpan sebagai struktur capaian pembelajaran tersendiri di aplikasi.",
        },
      ],
    },
    {
      id: "aktivitas-ptai",
      title: "Menyiapkan aktivitas PT-AI",
      blocks: [
        {
          kind: "paragraph",
          text: "Buka kelas, lalu pilih PT-AI. Setiap pertemuan dapat berisi unit pembelajaran, dan setiap unit memiliki enam tahap berpikir kritis yang urutannya tetap.",
        },
        {
          kind: "paragraph",
          text: "Di dalam satu unit, Anda menyiapkan kasus pemantik, sumber yang boleh dirujuk, dan aktivitas pada tiap tahap. Pada tiap aktivitas Anda menentukan instruksi tugas dan apakah bantuan AI diaktifkan beserta bentuk bantuannya.",
        },
        {
          kind: "paragraph",
          text: "Alur yang dijalani mahasiswa selalu sama: membaca kasus, menulis respons awal, baru kemudian memperoleh bantuan AI, memverifikasi sumber, merevisi jawaban, dan menulis refleksi. Penilaian Anda menutup rangkaian itu.",
        },
        {
          kind: "note",
          text: "Bantuan AI baru terbuka setelah mahasiswa mengirim respons awal. Urutan ini disengaja agar AI membantu proses berpikir, bukan menggantikannya.",
        },
      ],
    },
    {
      id: "rubrik",
      title: "Menggunakan rubrik standar PT-AI",
      blocks: [
        {
          kind: "steps",
          items: [
            "Buka menu Rubrik.",
            "Pada bagian Rubrik standar berpikir kritis PT-AI, tekan Gunakan template PT-AI.",
            "Buka kelas, pilih PT-AI, lalu buka unit yang bersangkutan.",
            "Pada aktivitas yang ingin dinilai, pilih rubrik tersebut lalu tekan Simpan rubrik.",
          ],
        },
        {
          kind: "paragraph",
          text: "Rubrik standar memuat enam dimensi berpikir kritis: Interpretasi, Analisis, Evaluasi, Inferensi, Eksplanasi, dan Regulasi diri. Setiap dimensi memiliki lima tingkat.",
        },
        {
          kind: "definitions",
          items: [
            { term: "0", description: "Tidak terlihat" },
            { term: "1", description: "Sangat terbatas" },
            { term: "2", description: "Berkembang" },
            { term: "3", description: "Baik" },
            { term: "4", description: "Sangat baik" },
          ],
        },
        {
          kind: "note",
          text: "Anda cukup memilih tingkat pada tiap dimensi. Aplikasi yang mengubahnya menjadi nilai 0–100 dengan memperhitungkan bobot rubrik, sehingga tidak ada perhitungan manual.",
        },
      ],
    },
    {
      id: "menerbitkan-kelas",
      title: "Menerbitkan kelas",
      blocks: [
        {
          kind: "steps",
          items: [
            "Buka Ringkasan kelas.",
            "Tekan Terbitkan kelas.",
            "Baca keterangan yang muncul, lalu tekan Ya, terbitkan.",
          ],
        },
        {
          kind: "paragraph",
          text: "Setelah diterbitkan, mahasiswa yang sudah terdaftar dapat membuka kelas. Bila perlu menyembunyikannya lagi, tekan Kembalikan ke draf.",
        },
        {
          kind: "note",
          text: "Mahasiswa hanya dapat melihat kelas bila dua syarat terpenuhi sekaligus: kelas sudah terbit dan namanya sudah terdaftar di kelas itu.",
        },
      ],
    },
    {
      id: "portofolio",
      title: "Memantau portofolio mahasiswa",
      blocks: [
        {
          kind: "steps",
          items: [
            "Buka kelas, lalu pilih Mahasiswa.",
            "Tekan Lihat portofolio pada nama mahasiswa.",
            "Pilih pertemuan untuk melihat prosesnya.",
          ],
        },
        {
          kind: "paragraph",
          text: "Portofolio dapat memuat respons awal, bantuan AI yang diterima, verifikasi sumber, revisi beserta alasannya, refleksi, umpan balik Anda, dan hasil ketuntasan — sejauh mahasiswa sudah mengerjakannya.",
        },
        {
          kind: "note",
          text: "Portofolio terbentuk sendiri dari proses PT-AI. Anda tidak perlu meminta mahasiswa mengunggah portofolio terpisah.",
        },
      ],
    },
    {
      id: "penilaian",
      title: "Melakukan penilaian",
      blocks: [
        {
          kind: "steps",
          items: [
            "Buka menu Review, lalu pilih pekerjaan yang akan dinilai.",
            "Baca respons awal, revisi, dan refleksi mahasiswa.",
            "Pada Penilaian rubrik, pilih tingkat 0–4 untuk setiap dimensi. Uraian tiap tingkat tertulis di layar.",
            "Perhatikan Nilai rubrik yang terhitung sendiri di bawah daftar dimensi.",
            "Tetapkan Hasil ketuntasan.",
            "Tulis Catatan untuk mahasiswa, minimal sepuluh karakter.",
            "Tekan Simpan penilaian.",
          ],
        },
        {
          kind: "note",
          text: "Tombol simpan baru aktif setelah semua dimensi dipilih dan catatan terisi. Bila rubrik belum lengkap, aplikasi memberi tahu dan tidak menghitung nilai apa pun secara diam-diam.",
        },
      ],
    },
    {
      id: "bantuan-ai-review",
      title: "Menggunakan bantuan AI saat review",
      blocks: [
        {
          kind: "paragraph",
          text: "Pada halaman penilaian terdapat panel Bantuan penilaian AI. Panel ini hanya bekerja bila Anda menekan Bantu review dengan AI.",
        },
        {
          kind: "paragraph",
          text: "Yang dapat dilakukan AI:",
        },
        {
          kind: "list",
          items: [
            "membaca pekerjaan mahasiswa yang tercatat;",
            "mengusulkan tingkat rubrik untuk tiap dimensi;",
            "menunjukkan potongan bukti yang menjadi dasar usulannya;",
            "menuliskan alasan usulannya;",
            "mengusulkan draf catatan untuk mahasiswa;",
            "menyatakan bila buktinya belum cukup untuk menilai.",
          ],
        },
        {
          kind: "paragraph",
          text: "Yang tidak dapat dilakukan AI:",
        },
        {
          kind: "list",
          items: [
            "menyimpan nilai;",
            "menyatakan mahasiswa tuntas atau tidak tuntas;",
            "mengubah jalur belajar mahasiswa;",
            "menggantikan keputusan Anda.",
          ],
        },
        {
          kind: "steps",
          items: [
            "Tekan Bantu review dengan AI.",
            "Baca usulan beserta bukti dan alasannya.",
            "Tekan Gunakan saran bila setuju; tingkat itu akan terpilih pada formulir.",
            "Ubah pilihan Anda kapan saja, atau abaikan usulan sepenuhnya.",
            "Tekan Pakai sebagai draf catatan bila ingin menyunting saran umpan balik.",
            "Tekan Simpan penilaian.",
          ],
        },
        {
          kind: "note",
          text: "Tidak ada yang tersimpan sampai Anda menekan Simpan penilaian. Nilai yang tercatat selalu nilai yang Anda pilih, bukan usulan AI.",
        },
      ],
    },
    {
      id: "dimensi",
      title: "Memahami nilai dan enam dimensi berpikir kritis",
      blocks: [
        {
          kind: "definitions",
          items: [
            { term: "Interpretasi", description: "memahami masalah." },
            {
              term: "Analisis",
              description: "membongkar klaim, alasan, dan asumsi.",
            },
            { term: "Evaluasi", description: "menilai sumber dan bukti." },
            {
              term: "Inferensi",
              description: "menarik kesimpulan berdasarkan bukti.",
            },
            {
              term: "Eksplanasi",
              description: "menjelaskan alasan secara runtut.",
            },
            {
              term: "Regulasi diri",
              description: "memeriksa dan memperbaiki cara berpikir sendiri.",
            },
          ],
        },
        {
          kind: "paragraph",
          text: "Tingkat yang Anda pilih pada setiap dimensi disimpan apa adanya, lalu diubah menjadi nilai 0–100 sesuai bobot rubrik. Nilai itu bukan label permanen tentang mahasiswa, melainkan hasil pengukuran pada satu waktu.",
        },
      ],
    },
    {
      id: "batas-ai",
      title: "Hal yang tidak dilakukan AI",
      blocks: [
        {
          kind: "list",
          items: [
            "AI tidak menerbitkan kelas, pertemuan, materi, maupun aktivitas.",
            "AI tidak menetapkan nilai akhir maupun hasil ketuntasan.",
            "AI tidak mengubah jalur belajar mahasiswa.",
            "AI tidak menyetujui rancangannya sendiri.",
            "AI tidak menjawab tugas untuk mahasiswa.",
          ],
        },
        {
          kind: "note",
          text: "Setiap usulan AI selalu menunggu keputusan manusia sebelum berlaku.",
        },
      ],
    },
    {
      id: "kendala",
      title: "Kendala yang sering muncul",
      blocks: [
        {
          kind: "definitions",
          items: [
            {
              term: "Daftar mata kuliah kosong saat membuat kelas",
              description:
                "Mata kuliah belum didaftarkan administrator. Hubungi administrator kampus.",
            },
            {
              term: "Pencarian mahasiswa tidak menemukan siapa pun",
              description:
                "Pastikan ejaan nama atau NIM benar dan minimal dua huruf. Mahasiswa yang sudah terdaftar di kelas ini memang tidak ditampilkan.",
            },
            {
              term: "Dokumen tidak dapat dibaca",
              description:
                "Dokumen kemungkinan berupa hasil pindaian tanpa teks. Gunakan versi teks dokumen tersebut.",
            },
            {
              term: "Tombol Bantu review dengan AI tidak dapat ditekan",
              description:
                "Aktivitas tersebut belum memiliki rubrik berkriteria. Pasang rubrik pada aktivitas terlebih dahulu.",
            },
            {
              term: "Mahasiswa mengaku tidak melihat kelas",
              description:
                "Periksa dua hal: apakah kelas sudah Terbit, dan apakah nama mahasiswa sudah terdaftar di kelas itu.",
            },
            {
              term: "Tombol Simpan penilaian tidak aktif",
              description:
                "Masih ada dimensi yang belum dipilih, atau catatan untuk mahasiswa belum mencapai sepuluh karakter.",
            },
          ],
        },
      ],
    },
  ],
};
