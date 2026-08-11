/** @format */

// MOCK — data contoh untuk prototipe verifikasi sumber (PHASE 9).

import type { ClaimItem } from "@/types/learning";

export const MOCK_CLAIMS: ClaimItem[] = [
  {
    id: "klaim-1",
    text: "Proses konsultasi publik telah memenuhi ketentuan formal.",
    linkedSourceIds: ["sumber-perwali"],
  },
  {
    id: "klaim-2",
    text: "Mayoritas warga mendukung rancangan peraturan daerah tersebut.",
    linkedSourceIds: [],
  },
  {
    id: "klaim-3",
    text: "Sebagian besar masukan tertulis warga tidak memperoleh tanggapan.",
    linkedSourceIds: ["sumber-catatan-osm"],
  },
];
