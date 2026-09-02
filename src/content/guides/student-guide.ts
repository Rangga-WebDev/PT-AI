/** @format */

import type { Guide } from "./types";

export const studentGuide: Guide = {
  title: "Panduan Penggunaan PT-AI untuk Mahasiswa",
  audience: "student",
  intro:
    "Panduan ini mengikuti aplikasi yang berjalan sekarang. Setiap langkah menyebut menu dan tombol yang benar-benar ada di layar Anda.",
  sections: [
    {
      id: "mengenal",
      title: "Mengenal PT-AI",
      blocks: [
        {
          kind: "paragraph",
          text: "PT-AI adalah kelas daring biasa yang di dalamnya terdapat latihan berpikir kritis. Anda membaca materi seperti di kelas daring pada umumnya, lalu mengerjakan aktivitas PT-AI yang melatih cara Anda menilai klaim, memeriksa bukti, dan memperbaiki penalaran sendiri.",
        },
        {
          kind: "paragraph",
          text: "AI di sini bukan tempat meminta jawaban. Ia menemani proses berpikir Anda: memancing pertanyaan, menunjukkan hal yang perlu diperiksa, dan memberi masukan atas cara Anda menalar.",
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
            "Masukkan surel dan kata sandi akun mahasiswa Anda.",
            "Setelah masuk, Anda akan melihat menu Belajar di sisi kiri.",
          ],
        },
        {
          kind: "note",
          text: "Akun dibuat oleh kampus. Aplikasi ini tidak menyediakan pendaftaran mandiri.",
        },
      ],
    },
    {
      id: "kelas-saya",
      title: "Membuka Kelas saya",
      blocks: [
        {
          kind: "steps",
          items: ["Tekan menu Kelas saya.", "Pilih kelas yang ingin dibuka."],
        },
        {
          kind: "paragraph",
          text: "Sebuah kelas baru muncul di sini bila dosen sudah menerbitkannya dan nama Anda sudah didaftarkan di kelas itu.",
        },
        {
          kind: "limit",
          text: "Anda tidak dapat mendaftarkan diri sendiri ke sebuah kelas. Pendaftaran dilakukan dosen atau administrator. Bila kelas yang Anda tunggu belum muncul, hubungi dosen pengampu.",
        },
      ],
    },
    {
      id: "ringkasan",
      title: "Membaca Ringkasan kelas",
      blocks: [
        {
          kind: "paragraph",
          text: "Ringkasan adalah halaman pertama sebuah kelas. Dari bilah di bawah nama kelas, Anda dapat berpindah ke Materi, Pertemuan, PT-AI, Portofolio, dan Progres.",
        },
        {
          kind: "note",
          text: "Membaca materi tidak mengharuskan Anda masuk ke bagian PT-AI. Keduanya terpisah.",
        },
      ],
    },
    {
      id: "materi",
      title: "Membuka Materi",
      blocks: [
        {
          kind: "steps",
          items: [
            "Pada kelas yang terbuka, pilih Materi.",
            "Pilih bahan yang ingin dibaca.",
            "Untuk bahan berupa berkas, bukalah melalui aplikasi.",
          ],
        },
        {
          kind: "paragraph",
          text: "Bahan dapat berupa berkas, tautan ke sumber luar, atau catatan yang ditulis dosen langsung di aplikasi.",
        },
        {
          kind: "note",
          text: "Anda hanya melihat bahan yang sudah diterbitkan dosen. Bahan yang masih disiapkan belum tampak.",
        },
      ],
    },
    {
      id: "pertemuan",
      title: "Melihat Pertemuan",
      blocks: [
        {
          kind: "paragraph",
          text: "Bagian Pertemuan memperlihatkan susunan pertemuan kelas beserta tujuannya, sehingga Anda tahu apa yang sedang dipelajari dan apa yang menyusul.",
        },
      ],
    },
    {
      id: "memulai-ptai",
      title: "Memulai aktivitas PT-AI",
      blocks: [
        {
          kind: "steps",
          items: [
            "Pada kelas yang terbuka, pilih PT-AI.",
            "Pilih unit yang ingin dikerjakan.",
            "Kerjakan tahap demi tahap sesuai urutannya.",
          ],
        },
        {
          kind: "paragraph",
          text: "Setiap unit terdiri atas enam tahap yang urutannya tetap: Interpretasi, Analisis, Evaluasi, Inferensi, Eksplanasi, dan Refleksi. Tahap berikutnya terbuka setelah tahap sebelumnya Anda kerjakan.",
        },
      ],
    },
    {
      id: "respons-awal",
      title: "Memberikan respons awal",
      blocks: [
        {
          kind: "steps",
          items: [
            "Baca kasus pemantik dan pertanyaan kuncinya.",
            "Baca instruksi aktivitas pada tahap itu.",
            "Tulis jawaban Anda sendiri pada kolom yang tersedia.",
            "Tekan Simpan respons awal.",
          ],
        },
        {
          kind: "paragraph",
          text: "Bantuan AI baru tersedia setelah respons awal Anda tersimpan. Urutan ini disengaja: tujuannya agar AI membantu Anda memperbaiki pemikiran yang sudah Anda bangun sendiri, bukan menggantikannya.",
        },
        {
          kind: "note",
          text: "Respons awal tersimpan permanen dan tidak dapat diubah maupun dihapus, termasuk oleh dosen. Perbaikan dilakukan lewat revisi, dan justru perubahan itulah yang dinilai. Tulislah pendirian Anda, bukan ringkasan kasus.",
        },
      ],
    },
    {
      id: "bantuan-ai",
      title: "Menggunakan bantuan AI",
      blocks: [
        {
          kind: "paragraph",
          text: "Bila dosen mengaktifkannya pada suatu aktivitas, bantuan AI muncul setelah respons awal Anda tersimpan. Bentuknya dapat berupa:",
        },
        {
          kind: "list",
          items: [
            "pertanyaan penuntun untuk menguji penalaran Anda;",
            "petunjuk atas bagian yang belum Anda pertimbangkan;",
            "arahan untuk memeriksa bukti atau sumber;",
            "masukan atas cara Anda menyusun argumen.",
          ],
        },
        {
          kind: "paragraph",
          text: "Setiap saran AI menunggu sikap Anda. Anda boleh menerimanya, menolaknya, atau melaporkannya bila keliru atau menyesatkan.",
        },
        {
          kind: "note",
          text: "AI bukan tempat meminta jawaban akhir tugas. Ia juga dapat salah, dan kekeliruannya justru menjadi bahan latihan Anda memeriksa klaim.",
        },
        {
          kind: "limit",
          text: "Pada aktivitas yang tidak mengaktifkan bantuan AI, layar akan menyatakan bahwa bantuan AI tidak diaktifkan pada aktivitas itu.",
        },
      ],
    },
    {
      id: "verifikasi",
      title: "Melakukan verifikasi sumber",
      blocks: [
        {
          kind: "steps",
          items: [
            "Buka sumber yang disediakan pada tahap tersebut.",
            "Nilai sumber itu pada enam kriteria yang tersedia.",
            "Tulis catatan Anda.",
            "Tekan Simpan verifikasi.",
          ],
        },
        {
          kind: "paragraph",
          text: "Verifikasi menuntut Anda menilai keenam kriteria, bukan sebagian. Tujuannya agar penilaian sumber menjadi kebiasaan yang utuh, bukan kesan sekilas.",
        },
      ],
    },
    {
      id: "revisi",
      title: "Memperbaiki jawaban",
      blocks: [
        {
          kind: "steps",
          items: [
            "Tulis jawaban Anda yang sudah diperbaiki.",
            "Pilih alasan revisi.",
            "Bila alasannya berkaitan dengan saran AI, pilih saran yang dimaksud.",
            "Jelaskan alasannya, minimal sepuluh karakter.",
            "Tekan Simpan revisi.",
          ],
        },
        {
          kind: "paragraph",
          text: "Anda boleh merevisi lebih dari sekali. Setiap revisi tersimpan berurutan beserta alasannya, sehingga perkembangan pemikiran Anda terlihat.",
        },
        {
          kind: "note",
          text: "Revisi tidak menghapus respons awal. Keduanya tersimpan berdampingan.",
        },
      ],
    },
    {
      id: "refleksi",
      title: "Menulis refleksi",
      blocks: [
        {
          kind: "paragraph",
          text: "Refleksi menutup satu putaran belajar. Anda menjawab sembilan pertanyaan singkat:",
        },
        {
          kind: "list",
          items: [
            "Apa jawaban awal Anda?",
            "Umpan balik apa yang Anda terima?",
            "Sumber apa yang Anda verifikasi?",
            "Apa jawaban akhir Anda?",
            "Mengapa Anda mengubahnya?",
            "Saran AI mana yang Anda terima?",
            "Saran AI mana yang Anda tolak?",
            "Bias apa yang Anda temukan?",
            "Apa strategi Anda berikutnya?",
          ],
        },
        {
          kind: "paragraph",
          text: "Setelah semuanya terisi, tekan Simpan refleksi.",
        },
        {
          kind: "note",
          text: "Kesembilan pertanyaan wajib diisi. Refleksi hanya dapat disimpan satu kali untuk setiap respons awal.",
        },
      ],
    },
    {
      id: "portofolio",
      title: "Melihat Portofolio",
      blocks: [
        {
          kind: "steps",
          items: [
            "Pada kelas yang terbuka, pilih Portofolio.",
            "Pilih pertemuan yang ingin dilihat.",
          ],
        },
        {
          kind: "paragraph",
          text: "Portofolio memperlihatkan kembali proses belajar Anda: respons awal, bantuan AI yang Anda terima, verifikasi sumber, revisi beserta alasannya, refleksi, dan umpan balik dosen.",
        },
        {
          kind: "note",
          text: "Portofolio terbentuk sendiri dari aktivitas yang Anda kerjakan. Anda tidak perlu mengunggah apa pun. Bila masih kosong, artinya aktivitas PT-AI pada pertemuan itu belum dikerjakan.",
        },
      ],
    },
    {
      id: "progres",
      title: "Melihat umpan balik dan progres",
      blocks: [
        {
          kind: "paragraph",
          text: "Menu Progres memperlihatkan capaian Anda pada enam dimensi berpikir kritis beserta waktu pengukurannya. Umpan balik dosen atas setiap pekerjaan dapat dibaca kembali melalui Portofolio.",
        },
        {
          kind: "note",
          text: "Angka pada Progres adalah hasil pengukuran pada satu waktu, bukan label tentang diri Anda. Angka itu dapat berubah seiring latihan.",
        },
      ],
    },
    {
      id: "dimensi",
      title: "Enam dimensi berpikir kritis",
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
      ],
    },
    {
      id: "penggunaan-ai",
      title: "Penggunaan AI yang bertanggung jawab",
      blocks: [
        {
          kind: "list",
          items: [
            "Tulis jawaban Anda sendiri terlebih dahulu.",
            "Perlakukan saran AI sebagai klaim yang perlu diperiksa, bukan kebenaran.",
            "Periksa sumber sebelum memakai informasi dari AI.",
            "Nyatakan dengan jujur saran mana yang Anda terima dan tolak pada refleksi.",
            "Laporkan saran AI yang keliru atau menyesatkan.",
          ],
        },
        {
          kind: "note",
          text: "Seluruh penggunaan AI Anda tercatat sebagai bagian dari proses belajar dan terlihat oleh dosen. Kejujuran menyatakan sikap terhadap saran AI adalah bagian yang dinilai.",
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
              term: "Kelas tidak muncul di Kelas saya",
              description:
                "Kelas mungkin belum diterbitkan dosen, atau nama Anda belum didaftarkan. Hubungi dosen pengampu.",
            },
            {
              term: "Tombol Simpan respons awal tidak aktif",
              description:
                "Jawaban Anda masih terlalu pendek. Tulis jawaban yang lebih utuh.",
            },
            {
              term: "Bantuan AI tidak muncul",
              description:
                "Respons awal Anda belum tersimpan, atau dosen memang tidak mengaktifkan bantuan AI pada aktivitas itu.",
            },
            {
              term: "Tahap berikutnya terkunci",
              description:
                "Tahap sebelumnya belum selesai atau belum dinilai dosen. Layar akan menyebutkan alasannya.",
            },
            {
              term: "Refleksi tidak dapat disimpan",
              description:
                "Masih ada pertanyaan yang kosong, atau refleksi untuk respons awal itu sudah pernah disimpan.",
            },
            {
              term: "Portofolio kosong",
              description:
                "Aktivitas PT-AI pada pertemuan itu belum dikerjakan.",
            },
          ],
        },
      ],
    },
  ],
};
