/** @format */

import { z } from "zod";

import { MESSAGE_MAX_LENGTH } from "@/lib/discussion/messages";

export const classMessageSchema = z.object({
  classId: z.string().uuid("Kelas tidak valid."),
  moduleId: z.string().uuid("Pertemuan tidak valid.").nullable(),
  body: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong.")
    .max(MESSAGE_MAX_LENGTH, `Pesan maksimal ${MESSAGE_MAX_LENGTH} karakter.`),
});

export type ClassMessageInput = z.infer<typeof classMessageSchema>;
