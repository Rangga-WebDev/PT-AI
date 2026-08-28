/** @format */

import "server-only";

import { GoogleGenAI } from "@google/genai";

import { normalizeVector } from "@/lib/ai/vector";

import { fakeProvider } from "./fake-provider";
import type { AiProvider } from "./types";

export type { AiProvider, GenerationResult } from "./types";

/**
 * Satu-satunya titik keluar ke penyedia AI (LOCK-TECH-022). Modul ini
 * `server-only`; memanggilnya dari Client Component akan gagal saat build.
 */

export const CHAT_MODEL = "gemini-3.5-flash-lite";
export const EMBEDDING_MODEL = "gemini-embedding-001";

/** Dikunci ke dimensi kolom source_chunks.embedding (DB-03). */
export const EMBEDDING_DIMENSIONS = 1536;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;

  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum diatur. Isi di .env.local sebelum memakai fitur AI.",
    );
  }

  client = new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Keluaran embedding berdimensi terpotong tidak ternormalisasi (norma L2 ~0,70
 * pada 1536). Normalisasi membuat kosinus setara hasil kali titik.
 */
export const normalize = normalizeVector;

export const geminiProvider: AiProvider = {
  async generateStructured({ systemInstruction, prompt, schema }) {
    const startedAt = Date.now();

    const response = await getClient().models.generateContent({
      model: CHAT_MODEL,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return {
      text: response.text ?? "",
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      latencyMs: Date.now() - startedAt,
    };
  },

  async embed(texts) {
    const response = await getClient().models.embedContent({
      model: EMBEDDING_MODEL,
      contents: texts,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS },
    });

    const embeddings = response.embeddings ?? [];
    if (embeddings.length !== texts.length) {
      throw new Error(
        `Jumlah embedding (${embeddings.length}) tidak sama dengan jumlah teks (${texts.length}).`,
      );
    }

    return embeddings.map((item, index) => {
      const values = item.values;
      if (!values || values.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding ke-${index} berdimensi ${values?.length ?? 0}, seharusnya ${EMBEDDING_DIMENSIONS}.`,
        );
      }
      return normalize(values);
    });
  },
};

// Diganti pada pengujian agar E2E tidak memanggil penyedia sungguhan.
let override: AiProvider | null = null;

export function getProvider(): AiProvider {
  if (override) return override;
  if (process.env["AI_PROVIDER_MODE"] === "fake") return fakeProvider;
  return geminiProvider;
}

export function setProvider(provider: AiProvider | null): void {
  override = provider;
}
