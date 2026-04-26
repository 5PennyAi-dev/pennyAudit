-- Migration : table sector_profiles pour l'intelligence sectorielle
-- consommée par le Skill 1 (Context Builder) du pipeline d'audit.
-- Session 2F — Étape 1.
--
-- Crée une table dédiée aux profils sectoriels (séparée de `patterns`
-- pour ne pas polluer le matching sémantique horizontal du Skill 2).
-- Chaque profil contient un YAML enrichi (cadre réglementaire, persona
-- métier, outils sectoriels, KPIs, pain points, risques) converti en
-- JSONB, plus un embedding Voyage-3 (1024 dims) pour matching sémantique
-- de fallback, et un tableau `industry_keywords` pour matching
-- déterministe (préféré par le Skill 1).
--
-- Pilote : profil-sectoriel-courtage-immobilier-qc (résidentiel).
-- Système conçu pour accueillir d'autres profils sans modif de schéma.

-- ─────────────────────────────────────────────────────────────
-- 1. Table sector_profiles
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sector_profiles (
  id TEXT PRIMARY KEY,  -- ex: 'secteur-courtage-immobilier-qc-residentiel'

  -- Contenu complet du profil (YAML converti en JSON)
  content JSONB NOT NULL,

  -- Champs extraits pour filtrage et matching déterministe
  title_fr TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'profil-sectoriel',
  version TEXT NOT NULL,
  language TEXT DEFAULT 'fr',

  -- Mots-clés d'industrie pour matching déterministe par le Skill 1
  -- Ex: ['courtage-immobilier', 'agent-immobilier', 'courtier-immobilier', 'immobilier']
  industry_keywords TEXT[],

  -- Texte concaténé utilisé pour générer l'embedding
  embedding_source TEXT,

  -- Embedding vectoriel (Voyage-3, 1024 dims)
  embedding VECTOR(1024),

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sector_profiles IS 'Profils sectoriels pour enrichir le contexte du Skill 1 (Context Builder)';

-- ─────────────────────────────────────────────────────────────
-- 2. Index
-- ─────────────────────────────────────────────────────────────

-- Index pour matching sémantique
CREATE INDEX IF NOT EXISTS sector_profiles_embedding_idx
  ON sector_profiles
  USING hnsw (embedding vector_cosine_ops);

-- Index pour matching déterministe par mots-clés
CREATE INDEX IF NOT EXISTS sector_profiles_industry_keywords_idx
  ON sector_profiles
  USING gin (industry_keywords);

-- ─────────────────────────────────────────────────────────────
-- 3. Fonction RPC : matching déterministe par mots-clés
--    (le Skill 1 préfère ça à un matching sémantique pour cette fonction)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_sector_profile_by_industry(
  industry_tag TEXT
)
RETURNS TABLE (
  id TEXT,
  title_fr TEXT,
  content JSONB,
  match_strength INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.title_fr,
    sp.content,
    array_length(
      ARRAY(
        SELECT unnest(sp.industry_keywords)
        INTERSECT
        SELECT industry_tag
      ),
      1
    ) AS match_strength
  FROM sector_profiles sp
  WHERE industry_tag = ANY(sp.industry_keywords)
  ORDER BY match_strength DESC NULLS LAST
  LIMIT 1;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. Fonction RPC : matching sémantique (fallback si aucun mot-clé
--    ne match exactement)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_sector_profiles_semantic(
  query_embedding VECTOR(1024),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 1
)
RETURNS TABLE (
  id TEXT,
  title_fr TEXT,
  content JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id,
    sp.title_fr,
    sp.content,
    1 - (sp.embedding <=> query_embedding) AS similarity
  FROM sector_profiles sp
  WHERE 1 - (sp.embedding <=> query_embedding) > match_threshold
  ORDER BY sp.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. Trigger updated_at
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_sector_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sector_profiles_updated_at ON sector_profiles;
CREATE TRIGGER sector_profiles_updated_at
  BEFORE UPDATE ON sector_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_sector_profiles_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Vérifications post-migration (à exécuter manuellement)
-- ─────────────────────────────────────────────────────────────
--
-- SELECT
--   EXISTS(SELECT 1 FROM pg_tables WHERE tablename = 'sector_profiles') AS table_exists,
--   EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'match_sector_profile_by_industry') AS fn1_exists,
--   EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'match_sector_profiles_semantic') AS fn2_exists;
-- -- les 3 doivent retourner true
--
-- \d sector_profiles
-- -- doit montrer embedding VECTOR(1024) et industry_keywords text[]
