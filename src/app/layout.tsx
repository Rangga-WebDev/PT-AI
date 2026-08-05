/** @format */

import type { Metadata } from "next";
import "./globals.css";

import { fontBody, fontHeading, fontMono } from "@/lib/fonts";

export const metadata: Metadata = {
  title: {
    default: "PT-AI LMS",
    template: "%s — PT-AI LMS",
  },
  description:
    "Sistem manajemen pembelajaran terprogram dengan integrasi AI untuk meningkatkan kemampuan berpikir kritis mahasiswa dalam Pendidikan Kewarganegaraan.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${fontHeading.variable} ${fontBody.variable} ${fontMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
