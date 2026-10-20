/** @format */

import type { Schema } from "@google/genai";

export interface GenerationResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface StructuredRequest {
  systemInstruction: string;
  prompt: string;
  schema: Schema;
}

export interface AiProvider {
  generateStructured(input: StructuredRequest): Promise<GenerationResult>;
  /** Teks JSON yang sama, dikirim bertahap; penyedia tanpa aliran cukup memakai generateStructured. */
  streamStructured?(input: StructuredRequest): AsyncIterable<string>;
  embed(texts: string[]): Promise<number[][]>;
}
