import { z } from "zod";
import { createVertex } from "@ai-sdk/google-vertex";
import { embed } from "ai";
import { createServerClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/observability/logger";
import type { RetrievedContext } from "@/lib/agents/state";

const log = createLogger("mcp.search_resume");

export const searchResumeSchema = z.object({
  query: z.string().min(1).max(500),
  matchCount: z.number().int().min(1).max(20).default(5),
  matchThreshold: z.number().min(0).max(1).default(0.5),
});

export type SearchResumeInput = z.infer<typeof searchResumeSchema>;

const vertex = createVertex();

export async function searchResume(
  query: string,
  options?: Partial<Omit<SearchResumeInput, "query">>
): Promise<RetrievedContext[]> {
  const input = searchResumeSchema.parse({ query, ...options });

  log.info("Searching resume", {
    query: input.query,
    matchCount: input.matchCount,
  });

  const { embedding } = await embed({
    model: vertex.textEmbeddingModel("text-embedding-004"),
    value: input.query,
  });

  const supabase = createServerClient();

  const { data, error } = await supabase.rpc("match_resume_chunks", {
    query_embedding: embedding,
    match_count: input.matchCount,
    match_threshold: input.matchThreshold,
  });

  if (error) {
    log.error("Vector search failed", { error: error.message });
    throw new Error(`Vector search failed: ${error.message}`);
  }

  const results: RetrievedContext[] = (data ?? []).map(
    (row: { content: string; similarity: number; metadata?: Record<string, unknown> }) => ({
      source: "resume" as const,
      content: row.content,
      score: row.similarity,
      metadata: row.metadata,
    })
  );

  log.info("Search complete", { count: results.length });
  return results;
}

export const searchResumeToolDefinition = {
  name: "search_resume" as const,
  description:
    "Semantic search against the resume vector store. Returns the most relevant chunks for a given query about professional experience, skills, education, or projects.",
  parameters: searchResumeSchema,
  execute: async (input: SearchResumeInput) =>
    searchResume(input.query, {
      matchCount: input.matchCount,
      matchThreshold: input.matchThreshold,
    }),
};
