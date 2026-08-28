/** @format */

import type { Schema } from "@google/genai";

export interface GenerationResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
}

export interface AiProvider {
  generateStructured(input: {
    systemInstruction: string;
    prompt: string;
    schema: Schema;
  }): Promise<GenerationResult>;
  embed(texts: string[]): Promise<number[][]>;
}
