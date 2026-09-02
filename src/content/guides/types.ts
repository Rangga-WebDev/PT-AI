/** @format */

/**
 * Struktur panduan dipisahkan dari tampilannya supaya satu isi yang sama
 * dapat dirender di aplikasi dan diterbitkan sebagai berkas Markdown.
 */

export type GuideBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "note"; text: string }
  | { kind: "limit"; text: string }
  | { kind: "definitions"; items: { term: string; description: string }[] };

export interface GuideSection {
  /** Dipakai sebagai jangkar daftar isi; harus stabil. */
  id: string;
  title: string;
  blocks: GuideBlock[];
}

export interface Guide {
  title: string;
  audience: "lecturer" | "student";
  intro: string;
  sections: GuideSection[];
}
