/** @format */

import { z } from "zod";

import { CRITERION_KEYS } from "@/lib/constants/verification";

const uuid = (label: string) => z.string().uuid(`${label} tidak valid.`);

export const sourceSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, "Judul sumber minimal 5 karakter.")
    .max(300, "Judul sumber terlalu panjang."),
  authors: z.string().trim().max(200).optional(),
  publisher: z.string().trim().max(200).optional(),
  sourceType: z.enum(
    [
      "regulation",
      "official_document",
      "journal_article",
      "book",
      "news",
      "report",
      "dataset",
      "other",
    ],
    { message: "Jenis sumber tidak valid." },
  ),
  publishedAt: z.string().optional(),
  url: z.union([z.string().url("URL tidak valid."), z.literal("")]).optional(),
  curationNote: z.string().trim().max(2000).optional(),
});

export const sourceVersionSchema = z.object({
  sourceId: uuid("Sumber"),
  versionLabel: z
    .string()
    .trim()
    .min(1, "Label versi wajib diisi.")
    .max(64, "Label versi terlalu panjang."),
  retrievedAt: z.string().min(1, "Tanggal pengambilan wajib diisi."),
  contentText: z
    .string()
    .trim()
    .min(20, "Kutipan sumber minimal 20 karakter.")
    .max(50000, "Kutipan sumber terlalu panjang."),
  notes: z.string().trim().max(2000).optional(),
});

export const caseSourceSchema = z.object({
  caseId: uuid("Kasus"),
  sourceId: uuid("Sumber"),
  isRequired: z.boolean().default(true),
});

export const caseClaimSchema = z.object({
  caseId: uuid("Kasus"),
  text: z
    .string()
    .trim()
    .min(10, "Klaim minimal 10 karakter.")
    .max(1000, "Klaim terlalu panjang."),
});

/** Keenam kunci wajib ada; database menolak checklist yang tidak lengkap. */
export const verificationSchema = z.object({
  sourceId: uuid("Sumber"),
  sourceVersionId: z.string().uuid().optional().or(z.literal("")),
  activityId: uuid("Aktivitas"),
  verdict: z.enum(["credible", "questionable", "not_usable"], {
    message: "Kesimpulan verifikasi tidak valid.",
  }),
  checklist: z
    .record(z.string(), z.boolean())
    .refine(
      (value) => CRITERION_KEYS.every((key) => key in value),
      "Keenam kriteria wajib dinilai sebelum verifikasi disimpan.",
    ),
  note: z
    .string()
    .trim()
    .min(10, "Catatan alasan minimal 10 karakter.")
    .max(2000, "Catatan terlalu panjang."),
});

export const claimLinkSchema = z.object({
  claimId: uuid("Klaim"),
  sourceId: uuid("Sumber"),
  linkType: z.enum(["supports", "refutes", "contextualizes"], {
    message: "Jenis tautan tidak valid.",
  }),
  note: z.string().trim().max(500).optional(),
});

export type SourceInput = z.infer<typeof sourceSchema>;
export type VerificationInput = z.infer<typeof verificationSchema>;
