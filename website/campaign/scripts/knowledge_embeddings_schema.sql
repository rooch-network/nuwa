-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create knowledge embeddings table
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  airtable_id TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  description TEXT,
  embedding VECTOR(1536) NOT NULL,  -- text-embedding-3-small dimension is 1536
  tags TEXT[] DEFAULT '{}',
  last_modified_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create vector index to speed up queries
CREATE INDEX IF NOT EXISTS knowledge_embeddings_embedding_idx ON knowledge_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);  -- Adjust number of lists based on data volume

-- Create similarity matching function
CREATE OR REPLACE FUNCTION match_knowledge_embeddings(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  airtable_id TEXT,
  title TEXT,
  content TEXT,
  description TEXT,
  tags TEXT[],
  last_modified_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.airtable_id,
    ke.title,
    ke.content,
    ke.description,
    ke.tags,
    ke.last_modified_time,
    ke.created_at,
    ke.updated_at,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM
    knowledge_embeddings ke
  WHERE
    1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY
    ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create last update trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated timestamp trigger
DROP TRIGGER IF EXISTS trigger_knowledge_embeddings_updated_at ON knowledge_embeddings;
CREATE TRIGGER trigger_knowledge_embeddings_updated_at
BEFORE UPDATE ON knowledge_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at(); 