/** @format */

// Menyiapkan template prompt AI dan meng-embed potongan sumber terkurasi.
// Idempotent — aman dijalankan berulang.
//
// Jalankan: npm run ai:index

import process from "node:process";

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "\n[GAGAL] NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY harus tersedia di .env.local.\n",
  );
  process.exit(1);
}

if (!geminiKey) {
  console.error("\n[GAGAL] GEMINI_API_KEY harus tersedia di .env.local.\n");
  process.exit(1);
}

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIMENSIONS = 1536;
const CHAT_MODEL = "gemini-3.5-flash-lite";
const CHUNK_TARGET = 900;

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const ai = new GoogleGenAI({ apiKey: geminiKey });

const SYSTEM_PROMPT = `Anda adalah mitra berpikir pada mata kuliah Pendidikan Kewarganegaraan.
Dilarang menuliskan jawaban final, memberi nilai, atau mengarang sumber.
Kutipan hanya boleh berasal dari potongan sumber yang diberikan.`;

const TEMPLATES = [
  ["guiding_questions", "Ajukan pertanyaan penuntun atas jawaban mahasiswa."],
  ["rubric_feedback", "Tunjukkan kekuatan dan kesenjangan terhadap rubrik."],
  ["hint", "Beri satu petunjuk arah berpikir tanpa mengungkap jawaban."],
  ["counter_argument", "Sodorkan kontraargumen terkuat atas posisi mahasiswa."],
  ["error_classification", "Namai jenis kekeliruan penalaran yang tampak."],
  ["learning_path", "Usulkan fokus latihan berikutnya beserta alasannya."],
];

/** Potongan dipisah pada batas paragraf agar kutipan tetap utuh dan bermakna. */
function chunkText(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length > CHUNK_TARGET) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

function normalize(values) {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? values : values.map((v) => v / norm);
}

async function embedBatch(texts) {
  const response = await ai.models.embedContent({
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

  return embeddings.map((item) => {
    if (!item.values || item.values.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding berdimensi ${item.values?.length ?? 0}, seharusnya ${EMBEDDING_DIMENSIONS}.`,
      );
    }
    return normalize(item.values);
  });
}

try {
  // --- Template prompt -------------------------------------------------------
  const { data: admin } = await supabase
    .from("role_assignments")
    .select("profile_id, roles!inner(key)")
    .eq("roles.key", "admin")
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  if (!admin) {
    throw new Error(
      "Akun admin tidak ditemukan. Jalankan npm run db:seed:users.",
    );
  }

  let templateCount = 0;

  for (const [fn, task] of TEMPLATES) {
    const { data: existing } = await supabase
      .from("ai_prompt_templates")
      .select("id")
      .eq("function", fn)
      .eq("version", 1)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from("ai_prompt_templates").insert({
      function: fn,
      version: 1,
      system_prompt: SYSTEM_PROMPT,
      user_prompt_template: task,
      model: CHAT_MODEL,
      parameters: { responseMimeType: "application/json" },
      is_active: true,
      created_by: admin.profile_id,
    });

    if (error) throw new Error(`ai_prompt_templates (${fn}): ${error.message}`);
    templateCount += 1;
  }

  // --- Potongan sumber -------------------------------------------------------
  const { data: versions, error: versionError } = await supabase
    .from("source_versions")
    .select("id, content_text");

  if (versionError) throw new Error(`source_versions: ${versionError.message}`);

  let chunkCount = 0;
  let embeddedCount = 0;

  for (const version of versions ?? []) {
    if (!version.content_text) continue;

    const chunks = chunkText(version.content_text);

    const { data: existing } = await supabase
      .from("source_chunks")
      .select("id, chunk_index, content, embedding")
      .eq("source_version_id", version.id)
      .order("chunk_index");

    const existingByIndex = new Map(
      (existing ?? []).map((row) => [row.chunk_index, row]),
    );

    for (const [index, content] of chunks.entries()) {
      const current = existingByIndex.get(index);

      if (current && current.content === content && current.embedding) {
        continue;
      }

      const [embedding] = await embedBatch([content]);
      const vector = JSON.stringify(embedding);

      if (current) {
        const { error } = await supabase
          .from("source_chunks")
          .update({
            content,
            embedding: vector,
            embedded_at: new Date().toISOString(),
          })
          .eq("id", current.id);
        if (error) throw new Error(`source_chunks update: ${error.message}`);
      } else {
        const { error } = await supabase.from("source_chunks").insert({
          source_version_id: version.id,
          chunk_index: index,
          content,
          token_count: Math.ceil(content.length / 4),
          embedding: vector,
          embedded_at: new Date().toISOString(),
        });
        if (error) throw new Error(`source_chunks insert: ${error.message}`);
        chunkCount += 1;
      }

      embeddedCount += 1;
    }

    // Potongan sisa dari versi teks sebelumnya dibuang agar tidak menjadi
    // kutipan hantu yang tidak lagi ada di sumber.
    for (const [index, row] of existingByIndex) {
      if (index >= chunks.length) {
        await supabase.from("source_chunks").delete().eq("id", row.id);
      }
    }
  }

  console.log("\nIndeks AI siap:");
  console.log(`  Template prompt baru : ${templateCount}`);
  console.log(`  Potongan baru        : ${chunkCount}`);
  console.log(`  Potongan di-embed    : ${embeddedCount}\n`);
} catch (error) {
  console.error(`\n[GAGAL] ${error.message}\n`);
  process.exit(1);
}
