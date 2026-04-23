-- Migration : aligner la colonne patterns.embedding sur Voyage-3 (1024 dims).
-- Session 2B — utilisé par le matching sémantique du pipeline d'audit.
--
-- IMPORTANT : cette migration DROP la colonne embedding existante. Après
-- application, il faut obligatoirement rouler `npm run embeddings:generate`
-- pour regénérer les embeddings avec Voyage-3.
--
-- Idempotent via DO block qui vérifie le type actuel.

DO $$
DECLARE
  current_udt TEXT;
BEGIN
  SELECT format_type(atttypid, atttypmod)
    INTO current_udt
  FROM pg_attribute
  WHERE attrelid = 'patterns'::regclass
    AND attname  = 'embedding'
    AND NOT attisdropped;

  IF current_udt IS NULL THEN
    ALTER TABLE patterns ADD COLUMN embedding VECTOR(1024);
  ELSIF current_udt <> 'vector(1024)' THEN
    -- Supprimer l'index existant avant de changer la dimension.
    DROP INDEX IF EXISTS idx_patterns_embedding;
    ALTER TABLE patterns DROP COLUMN embedding;
    ALTER TABLE patterns ADD COLUMN embedding VECTOR(1024);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_patterns_embedding_1024
  ON patterns USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RPC dédiée Voyage-3 : le paramètre est VECTOR(1024) et non 1536.
CREATE OR REPLACE FUNCTION match_patterns_voyage3 (
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.0,
  match_count     INT   DEFAULT 12
)
RETURNS TABLE (
  id          TEXT,
  content     JSONB,
  title_fr    TEXT,
  category    TEXT,
  similarity  FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    patterns.id,
    patterns.content,
    patterns.title_fr,
    patterns.category,
    1 - (patterns.embedding <=> query_embedding) AS similarity
  FROM patterns
  WHERE patterns.embedding IS NOT NULL
    AND 1 - (patterns.embedding <=> query_embedding) > match_threshold
  ORDER BY patterns.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION match_patterns_voyage3 IS
  'Recherche sémantique pgvector pour embeddings Voyage-3 (1024 dims). Session 2B.';
