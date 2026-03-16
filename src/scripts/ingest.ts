/**
 * Data Readiness Pipeline — PDF Resume Ingestion
 *
 * Reads a PDF resume, splits it into chunks, embeds each chunk via
 * Vertex AI text-embedding-004, and upserts into Supabase pgvector.
 *
 * Usage:
 *   pnpm ingest              # defaults to ./data/resume.pdf
 *   pnpm ingest -- --file ./data/cv.pdf --chunk-size 512
 */

import fs from "node:fs";
import path from "node:path";
import pdf from "pdf-parse";
import { createClient } from "@supabase/supabase-js";
import { createVertex } from "@ai-sdk/google-vertex";
import { embed } from "ai";

const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 80;
const TABLE_NAME = "resume_chunks";
const DEFAULT_PATH = path.resolve(process.cwd(), "data/resume.pdf");

function parseArgs() {
  const args = process.argv.slice(2);
  let filePath = DEFAULT_PATH;
  let chunkSize = CHUNK_SIZE;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) filePath = path.resolve(args[++i]);
    if (args[i] === "--chunk-size" && args[i + 1]) chunkSize = parseInt(args[++i], 10);
  }

  return { filePath, chunkSize };
}

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";

  for (const sentence of sentences) {
    if ((current + " " + sentence).length > size && current.length > 0) {
      chunks.push(current.trim());
      const words = current.split(/\s+/);
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      current = overlapWords.join(" ") + " " + sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

async function main() {
  const { filePath, chunkSize } = parseArgs();

  console.log(`\nIngesting: ${filePath}`);
  console.log(`  Chunk size: ${chunkSize} chars, overlap: ${CHUNK_OVERLAP}\n`);

  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    console.log("Create a data/ directory and place your resume.pdf there.");
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  const { text, numpages } = await pdf(buffer);
  console.log(`  Parsed ${numpages} page(s), ${text.length} characters`);

  const chunks = chunkText(text, chunkSize, CHUNK_OVERLAP);
  console.log(`  Split into ${chunks.length} chunks\n`);

  const vertex = createVertex();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let inserted = 0;
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    const { embedding } = await embed({
      model: vertex.textEmbeddingModel("text-embedding-004") as Parameters<typeof embed>[0]["model"],
      value: chunk,
    });

    const { error } = await supabase.from(TABLE_NAME).insert({
      content: chunk,
      embedding,
      metadata: {
        source: path.basename(filePath),
        chunkIndex: i,
        totalChunks: chunks.length,
        pageCount: numpages,
      },
    });

    if (error) {
      console.error(`  x Chunk ${i + 1}: ${error.message}`);
    } else {
      inserted++;
      process.stdout.write(`\r  Embedded & inserted: ${inserted}/${chunks.length}`);
    }
  }

  console.log(`\n\nIngestion complete. ${inserted}/${chunks.length} chunks stored.\n`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
