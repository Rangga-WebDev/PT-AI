/** @format */

// Menerbitkan panduan dari sumber tunggal di src/content/guides ke Markdown.
// Satu perubahan alur cukup dilakukan di modul konten; berkas di docs/guides
// hanya hasil terbitannya.
//
// Menjalankan: npm run docs:guides

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { lecturerGuide } from "../src/content/guides/lecturer-guide.ts";
import { studentGuide } from "../src/content/guides/student-guide.ts";

const OUTPUT_DIR = path.resolve("docs/guides");

export function renderGuide(guide) {
  const lines = [
    "<!-- Dihasilkan dari src/content/guides. Jangan disunting langsung. -->",
    "<!-- Perbarui modul kontennya, lalu jalankan: npm run docs:guides -->",
    "",
    `# ${guide.title}`,
    "",
    guide.intro,
    "",
    "## Daftar isi",
    "",
  ];

  guide.sections.forEach((section, index) => {
    lines.push(`${index + 1}. [${section.title}](#${section.id})`);
  });

  for (const [index, section] of guide.sections.entries()) {
    lines.push("", `<a id="${section.id}"></a>`, "");
    lines.push(`## ${index + 1}. ${section.title}`, "");

    for (const block of section.blocks) {
      switch (block.kind) {
        case "paragraph":
          lines.push(block.text, "");
          break;

        case "steps":
          block.items.forEach((item, i) => lines.push(`${i + 1}. ${item}`));
          lines.push("");
          break;

        case "list":
          for (const item of block.items) lines.push(`- ${item}`);
          lines.push("");
          break;

        case "note":
          lines.push(`> **Catatan.** ${block.text}`, "");
          break;

        case "limit":
          lines.push(`> **Belum tersedia.** ${block.text}`, "");
          break;

        case "definitions":
          for (const item of block.items) {
            lines.push(`- **${item.term}** — ${item.description}`);
          }
          lines.push("");
          break;

        default:
          throw new Error(`Blok tidak dikenal: ${JSON.stringify(block)}`);
      }
    }
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export const GUIDE_OUTPUTS = [
  { file: "JUKNIS_DOSEN.md", guide: lecturerGuide },
  { file: "JUKNIS_MAHASISWA.md", guide: studentGuide },
];

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const { file, guide } of GUIDE_OUTPUTS) {
    const target = path.join(OUTPUT_DIR, file);
    await writeFile(target, renderGuide(guide), "utf8");
    console.log(`  diterbitkan: docs/guides/${file}`);
  }
}
