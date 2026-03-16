-- Digital Twin: Initial Schema
-- Run this in your Supabase SQL Editor or via `supabase db push`

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ── Resume Chunks (for RAG) ─────────────────────────
CREATE TABLE IF NOT EXISTS resume_chunks (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'resume',
  embedding VECTOR(768),
  similarity FLOAT DEFAULT 1.0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resume_chunks_embedding
  ON resume_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Full-text search index for Phase 1 (pre-embedding) fallback
ALTER TABLE resume_chunks
  ADD COLUMN IF NOT EXISTS fts TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX IF NOT EXISTS idx_resume_chunks_fts
  ON resume_chunks USING gin (fts);

-- ── Checkpoints (for LangGraph durable execution) ───
CREATE TABLE IF NOT EXISTS checkpoints (
  thread_id TEXT NOT NULL,
  checkpoint_id TEXT NOT NULL,
  parent_id TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_thread
  ON checkpoints (thread_id, created_at DESC);

-- ── RPC: Match Resume Chunks (vector similarity) ────
CREATE OR REPLACE FUNCTION match_resume_chunks(
  query_embedding VECTOR(768),
  match_count INT DEFAULT 5,
  match_threshold FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  source TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rc.id,
    rc.content,
    rc.source,
    1 - (rc.embedding <=> query_embedding) AS similarity
  FROM resume_chunks rc
  WHERE 1 - (rc.embedding <=> query_embedding) > match_threshold
  ORDER BY rc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
