/** @format */

import { z } from "zod";

const uuid = (label: string) => z.string().uuid(`${label} tidak valid.`);

const title = z
  .string()
  .trim()
  .min(3, "Judul minimal 3 karakter.")
  .max(200, "Judul maksimal 200 karakter.");

const longText = (label: string, min = 10, max = 20000) =>
  z
    .string()
    .trim()
    .min(min, `${label} minimal ${min} karakter.`)
    .max(max, `${label} terlalu panjang.`);

export const moduleSchema = z.object({
  classId: uuid("Kelas"),
  title,
  description: z.string().trim().max(2000).optional(),
});

export const learningUnitSchema = z.object({
  moduleId: uuid("Modul"),
  title,
  objective: longText("Tujuan pembelajaran"),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  unitKind: z.enum(["core", "remedial", "enrichment"]).default("core"),
});

export const caseSchema = z.object({
  learningUnitId: uuid("Unit"),
  title,
  context: longText("Konteks kasus"),
  body: longText("Isi kasus", 50),
  keyQuestion: longText("Pertanyaan kunci"),
});

export const activitySchema = z.object({
  learningStageId: uuid("Tahap"),
  title,
  prompt: longText("Instruksi tugas"),
  activityType: z.enum(
    ["written_response", "claim_mapping", "source_verification", "reflection"],
    { message: "Jenis aktivitas tidak valid." },
  ),
  rubricId: z.string().uuid().optional().or(z.literal("")),
  masteryThreshold: z.coerce
    .number()
    .min(0, "Ambang ketuntasan minimal 0.")
    .max(100, "Ambang ketuntasan maksimal 100.")
    .optional(),
  allowsAi: z.boolean().default(false),
  allowedAiFunctions: z.array(z.string()).default([]),
  dueAt: z.string().optional(),
});

export const activityInstructionSchema = z.object({
  activityId: uuid("Aktivitas"),
  audience: z.enum(["student", "lecturer"], {
    message: "Audiens tidak valid.",
  }),
  content: longText("Isi instruksi"),
});

export const stageUpdateSchema = z.object({
  stageId: uuid("Tahap"),
  title,
  focus: longText("Fokus tahap", 5),
  isEnabled: z.boolean().default(true),
});

export const publicationSchema = z.object({
  id: uuid("Entitas"),
  status: z.enum(["draft", "published", "archived"], {
    message: "Status tidak valid.",
  }),
});

export const rubricSchema = z.object({
  title,
  description: z.string().trim().max(2000).optional(),
});

export const rubricCriterionSchema = z.object({
  rubricId: uuid("Rubrik"),
  code: z
    .string()
    .trim()
    .min(1, "Kode kriteria wajib diisi.")
    .max(32, "Kode maksimal 32 karakter."),
  description: longText("Deskripsi kriteria"),
  dimension: z.enum(
    [
      "interpretation",
      "analysis",
      "evaluation",
      "inference",
      "explanation",
      "self_regulation",
    ],
    { message: "Dimensi tidak valid." },
  ),
  weight: z.coerce
    .number()
    .positive("Bobot harus lebih besar dari 0.")
    .max(100, "Bobot maksimal 100."),
});

export const rubricLevelSchema = z.object({
  criterionId: uuid("Kriteria"),
  label: z.string().trim().min(1, "Label wajib diisi.").max(64),
  descriptor: longText("Deskriptor level", 5),
  score: z.coerce
    .number()
    .min(0, "Skor minimal 0.")
    .max(100, "Skor maksimal 100."),
});

export type ModuleInput = z.infer<typeof moduleSchema>;
export type LearningUnitInput = z.infer<typeof learningUnitSchema>;
export type CaseInput = z.infer<typeof caseSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
