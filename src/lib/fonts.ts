/** @format */

import { IBM_Plex_Mono, Source_Sans_3, Space_Grotesk } from "next/font/google";

// Tipografi tema "Civic Intelligence" (LOCK-TECH-013, DSN-004):
// - Space Grotesk  → heading
// - Source Sans 3  → body dan UI
// - IBM Plex Mono  → metadata teknis

export const fontHeading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const fontBody = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

export const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "swap",
});
