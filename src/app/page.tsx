/** @format */

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

// Nonce CSP hanya dapat disisipkan saat render per permintaan.
export const dynamic = "force-dynamic";

const PRINSIP = [
  {
    judul: "Menulis lebih dahulu",
    isi: "Bantuan AI terkunci sampai Anda mengirim jawaban sendiri. Yang dinilai adalah penalaran Anda, bukan penalaran mesin.",
  },
  {
    judul: "Respons awal permanen",
    isi: "Jawaban pertama tidak dapat ditimpa siapa pun, termasuk dosen. Perubahan pikiran tersimpan sebagai revisi beralasan.",
  },
  {
    judul: "AI diperiksa, bukan dipercaya",
    isi: "Setiap kutipan AI dapat ditelusuri ke sumber yang dilampirkan dosen. Kutipan yang tidak terlacak ditandai, bukan disembunyikan.",
  },
  {
    judul: "Dosen memegang keputusan",
    isi: "Sistem hanya mengusulkan kelengkapan proses. Ketuntasan dan nilai akhir tetap ditetapkan dosen.",
  },
];

const TAHAP = [
  "Interpretasi",
  "Analisis",
  "Evaluasi",
  "Inferensi",
  "Eksplanasi",
  "Refleksi",
];

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-12 px-6 py-20">
      <section className="flex max-w-3xl flex-col items-center gap-6">
        <p className="rounded-full border border-border px-4 py-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">
          Pendidikan Kewarganegaraan
        </p>

        <h1 className="text-center font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          PT-AI Learning Management System
        </h1>

        <p className="max-w-xl text-center text-lg leading-relaxed text-muted-foreground">
          Pembelajaran terprogram berbantuan AI yang menempatkan mahasiswa
          sebagai pemikir dan AI sebagai objek yang harus diverifikasi.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className={buttonVariants()}>
            Masuk ke aplikasi
          </Link>
          <Link
            href="https://github.com/Rangga-WebDev/PT-AI"
            className={buttonVariants({ variant: "outline" })}
          >
            Dokumentasi proyek
          </Link>
        </div>
      </section>

      <section
        aria-labelledby="tahap-heading"
        className="flex w-full max-w-3xl flex-col items-center gap-4"
      >
        <h2
          id="tahap-heading"
          className="font-mono text-xs tracking-widest text-subtle uppercase"
        >
          Enam tahap berurutan, tidak dapat dilompati
        </h2>
        <ol className="flex flex-wrap items-center justify-center gap-2">
          {TAHAP.map((nama, index) => (
            <li
              key={nama}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm"
            >
              <span className="font-mono text-xs text-subtle">{index + 1}</span>
              {nama}
            </li>
          ))}
        </ol>
        <p className="text-center text-sm text-muted-foreground">
          Setiap tahap menjalankan siklus attempt → feedback → verify → revise →
          mastery.
        </p>
      </section>

      <section
        aria-labelledby="prinsip-heading"
        className="w-full max-w-4xl scroll-mt-24"
      >
        <h2 id="prinsip-heading" className="sr-only">
          Prinsip yang dipegang
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PRINSIP.map((item) => (
            <li
              key={item.judul}
              className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-5"
            >
              <h3 className="font-heading text-base font-semibold">
                {item.judul}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.isi}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="max-w-xl text-center text-sm text-muted-foreground">
        Aturan di atas ditegakkan constraint dan trigger basis data, bukan
        sekadar oleh kode aplikasi.
      </p>
    </main>
  );
}
