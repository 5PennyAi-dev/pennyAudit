-- ═══════════════════════════════════════════════════════════════════════
-- Schéma Supabase — Outil d'audit IA 5PennyAi
-- ═══════════════════════════════════════════════════════════════════════
--
-- Usage :
--   1. Se connecter à Supabase SQL Editor (supabase.com/dashboard)
--   2. Exécuter ce fichier en entier (ou par blocs)
--   3. Vérifier que toutes les tables et indexes sont créés
--
-- Dépendances :
--   - Extension pgvector (pour la recherche sémantique sur les patterns)
--   - Auth Supabase (déjà activé par défaut)
--
-- Ordre d'exécution :
--   1. Extensions
--   2. Tables (clients, audits, patterns, audit_templates)
--   3. Indexes
--   4. Row Level Security policies
--   5. Triggers (updated_at automatique)
--   6. Fonctions utilitaires (recherche vectorielle, etc.)
--
-- ═══════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- ─────────────────────────────────────────────────────────────
-- 2. TABLES
-- ─────────────────────────────────────────────────────────────

-- ═══════ CLIENTS ═══════
-- Un client = une entreprise qui utilise l'outil d'audit.
-- Lié à auth.users de Supabase pour l'authentification.

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Infos de base
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  business_name TEXT,
  business_type TEXT,        -- ex: 'plomberie', 'clinique', 'consultant'
  business_size TEXT,        -- 'solopreneur' | 'micro-2-9' | 'petite-10-49'
  industry TEXT,
  language TEXT DEFAULT 'fr', -- 'fr' | 'en'
  location_province TEXT,    -- 'QC', 'ON', etc.
  location_city TEXT,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

COMMENT ON TABLE clients IS 'Entreprises utilisatrices de l''outil d''audit';

-- ═══════ AUDITS ═══════
-- Un audit = une instance d'audit lancée par un client.
-- Contient les 5 outputs des skills + les métadonnées.

CREATE TABLE IF NOT EXISTS audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Statut et progression
  status TEXT NOT NULL DEFAULT 'draft',
    -- 'draft'      : formulaire en cours de remplissage
    -- 'paid'       : paiement reçu, en attente du lancement
    -- 'running'    : skills en cours d'exécution
    -- 'completed'  : audit généré avec succès
    -- 'failed'     : erreur pendant le traitement
    -- 'exported'   : le client a téléchargé le rapport
  current_skill INTEGER DEFAULT 0,  -- 0-5 : quel skill tourne en ce moment

  -- Paiement
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',  -- 'pending' | 'paid' | 'refunded'
  amount_cad INTEGER,                     -- Montant en cents CAD
  tier TEXT DEFAULT 'A',                  -- 'A' (self-serve), 'B' (accompagné), 'C' (custom)

  -- Données du formulaire d'intake (JSON structuré)
  intake_data JSONB DEFAULT '{}'::jsonb,
    -- Structure typique :
    -- {
    --   "business": { "name": "...", "industry": "...", "size": "..." },
    --   "context": { "years_active": 5, "employees": 3, "location": "Québec" },
    --   "stack": { "has_website": true, "uses_crm": false, ... },
    --   "pain_points": ["Appels manqués", "Trop de courriels"],
    --   "goals": { "primary": "Gagner du temps", "budget": "1000-5000" },
    --   "tech_comfort": "moyen",
    --   "preferred_path": "equilibre"
    -- }

  -- Outputs des 5 skills (chacun est un JSON riche)
  skill_1_output JSONB,  -- Context profile structuré
  skill_2_output JSONB,  -- Opportunities (3-5 patterns sélectionnés + adaptations)
  skill_3_output JSONB,  -- Risks (identifiés et priorisés)
  skill_4_output JSONB,  -- Tech stack audit
  skill_5_output JSONB,  -- Synthesis + ROI + roadmap

  -- Patterns utilisés dans cet audit (pour analytics futurs)
  pattern_ids TEXT[],

  -- Document final
  final_document_url TEXT,           -- URL Supabase Storage du PDF/DOCX
  final_document_generated_at TIMESTAMPTZ,

  -- Timestamps des transitions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ,

  -- Erreurs éventuelles
  error_message TEXT,
  error_at_skill INTEGER,

  -- Reprise d'intake : horodatage du courriel de reprise envoyé par le cron
  resume_email_sent_at TIMESTAMPTZ
);

COMMENT ON TABLE audits IS 'Audits générés par l''outil';

-- ═══════ PATTERNS ═══════
-- Librairie de patterns d'opportunités IA.
-- Chaque pattern = un cas d'usage (ex: réceptionniste IA vocale).
-- L'embedding permet la recherche sémantique via pgvector.

CREATE TABLE IF NOT EXISTS patterns (
  id TEXT PRIMARY KEY,  -- ex: 'ai-voice-receptionist' (même que dans YAML)

  -- Contenu complet du pattern (YAML converti en JSON)
  content JSONB NOT NULL,

  -- Champs extraits pour filtrage rapide (évite de parser le JSON complet)
  title_fr TEXT NOT NULL,
  title_en TEXT,
  category TEXT,
  version TEXT NOT NULL,
  target_industries TEXT[],
  target_business_sizes TEXT[],
  tech_comfort_required TEXT,

  -- Texte concaténé utilisé pour générer l'embedding
  -- (summary_long_fr + pain_point_fr + description pour chaque voie)
  embedding_source TEXT,

  -- Embedding vectoriel pour recherche sémantique
  -- 1536 dims = text-embedding-3-small (OpenAI) ou voyage-3 (Anthropic)
  -- Si on utilise voyage-code-2 : 1536 dims aussi
  embedding VECTOR(1536),

  -- Métadonnées
  confidence_level TEXT,  -- 'low' | 'medium' | 'high'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE patterns IS 'Librairie de patterns d''opportunités IA avec embeddings';

-- ═══════ AUDIT_TEMPLATES ═══════
-- Versioning des prompts des 5 skills.
-- Permet de tester de nouvelles versions sans casser l'existant.

CREATE TABLE IF NOT EXISTS audit_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  skill_number INTEGER NOT NULL CHECK (skill_number BETWEEN 1 AND 5),
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  output_schema JSONB,       -- JSON Schema attendu pour valider l'output
  model TEXT DEFAULT 'claude-sonnet-4-5-20251022',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(skill_number, version)
);

COMMENT ON TABLE audit_templates IS 'Prompts versionnés des 5 skills';

-- ═══════ AUDIT_LOGS ═══════
-- Journal des appels API et événements système pour debugging.

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID REFERENCES audits(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
    -- 'skill_started', 'skill_completed', 'skill_failed',
    -- 'vector_search', 'document_generated', 'payment_received', etc.
  skill_number INTEGER,
  metadata JSONB,
  duration_ms INTEGER,
  tokens_used INTEGER,
  cost_usd NUMERIC(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Journal des événements pendant la génération d''audit';

-- ─────────────────────────────────────────────────────────────
-- 3. INDEXES
-- ─────────────────────────────────────────────────────────────

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_auth_user ON clients(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_clients_created ON clients(created_at DESC);

-- Audits
CREATE INDEX IF NOT EXISTS idx_audits_client ON audits(client_id);
CREATE INDEX IF NOT EXISTS idx_audits_status ON audits(status);
CREATE INDEX IF NOT EXISTS idx_audits_created ON audits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audits_completed ON audits(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Patterns — recherche vectorielle (ivfflat pour grands volumes)
-- lists=100 est bon pour 100-10 000 patterns. Augmenter si > 10k.
CREATE INDEX IF NOT EXISTS idx_patterns_embedding
  ON patterns USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Patterns — recherche par catégorie/industrie
CREATE INDEX IF NOT EXISTS idx_patterns_category ON patterns(category);
CREATE INDEX IF NOT EXISTS idx_patterns_industries ON patterns USING GIN (target_industries);
CREATE INDEX IF NOT EXISTS idx_patterns_sizes ON patterns USING GIN (target_business_sizes);

-- Audit logs
CREATE INDEX IF NOT EXISTS idx_logs_audit ON audit_logs(audit_id);
CREATE INDEX IF NOT EXISTS idx_logs_created ON audit_logs(created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- Activer RLS sur toutes les tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ═══════ Policies clients ═══════

-- Les clients voient leur propre profil
CREATE POLICY "Clients peuvent voir leur profil"
  ON clients FOR SELECT
  USING (auth_user_id = auth.uid());

-- Les clients peuvent mettre à jour leur profil
CREATE POLICY "Clients peuvent modifier leur profil"
  ON clients FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- L'admin voit tout (identifié par un email dans une liste ou un custom claim)
-- IMPORTANT : à ajuster avec ta stratégie d'identification admin
-- Pour le MVP : ta propre auth_user_id peut être dans une table admin_users

-- ═══════ Policies audits ═══════

-- Les clients voient leurs propres audits
CREATE POLICY "Clients peuvent voir leurs audits"
  ON audits FOR SELECT
  USING (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Les clients créent leurs audits (via client_id matching)
CREATE POLICY "Clients peuvent créer leurs audits"
  ON audits FOR INSERT
  WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE auth_user_id = auth.uid()
    )
  );

-- Mise à jour limitée (pas de status manipulation directe côté client)
CREATE POLICY "Clients peuvent modifier leurs audits draft"
  ON audits FOR UPDATE
  USING (
    client_id IN (SELECT id FROM clients WHERE auth_user_id = auth.uid())
    AND status = 'draft'
  );

-- ═══════ Policies patterns ═══════

-- Tous les utilisateurs authentifiés peuvent lire les patterns (pour les skills)
-- IMPORTANT : les patterns sont du contenu interne, le client n'y accède JAMAIS directement.
-- Cette policy ne laisse passer que le service_role (backend) côté serveur.
CREATE POLICY "Patterns accessibles en lecture au backend"
  ON patterns FOR SELECT
  USING (auth.role() = 'service_role');

-- Seul le service_role peut modifier les patterns (via le script de seed)
CREATE POLICY "Patterns modifiables par backend uniquement"
  ON patterns FOR ALL
  USING (auth.role() = 'service_role');

-- ═══════ Policies audit_templates ═══════

CREATE POLICY "Templates accessibles au backend uniquement"
  ON audit_templates FOR ALL
  USING (auth.role() = 'service_role');

-- ═══════ Policies audit_logs ═══════

-- Les logs sont écrits uniquement par le backend
CREATE POLICY "Logs écrits par backend"
  ON audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Les clients voient les logs de leurs propres audits
CREATE POLICY "Clients voient logs de leurs audits"
  ON audit_logs FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE client_id IN (
        SELECT id FROM clients WHERE auth_user_id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 5. TRIGGERS
-- ─────────────────────────────────────────────────────────────

-- Trigger : mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audits_updated_at
  BEFORE UPDATE ON audits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patterns_updated_at
  BEFORE UPDATE ON patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 6. FONCTIONS UTILITAIRES
-- ─────────────────────────────────────────────────────────────

-- ═══════ Recherche vectorielle de patterns ═══════
-- Cette fonction sera appelée par le Skill 2 (Opportunity identifier).
-- Elle retourne les N patterns les plus similaires à un embedding donné,
-- avec filtres optionnels sur l'industrie et la taille d'entreprise.

CREATE OR REPLACE FUNCTION match_patterns (
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 10,
  filter_industry TEXT DEFAULT NULL,
  filter_size TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  title_fr TEXT,
  category TEXT,
  content JSONB,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    patterns.id,
    patterns.title_fr,
    patterns.category,
    patterns.content,
    1 - (patterns.embedding <=> query_embedding) AS similarity
  FROM patterns
  WHERE
    (filter_industry IS NULL OR filter_industry = ANY(patterns.target_industries))
    AND (filter_size IS NULL OR filter_size = ANY(patterns.target_business_sizes))
    AND 1 - (patterns.embedding <=> query_embedding) > match_threshold
  ORDER BY patterns.embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON FUNCTION match_patterns IS 'Recherche sémantique de patterns par similarité cosinus';

-- ═══════ Statistiques admin ═══════
-- Fonction qui retourne des stats globales pour le dashboard admin.

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB
LANGUAGE sql STABLE
SECURITY DEFINER
AS $$
  SELECT jsonb_build_object(
    'total_clients', (SELECT COUNT(*) FROM clients),
    'total_audits', (SELECT COUNT(*) FROM audits),
    'audits_completed', (SELECT COUNT(*) FROM audits WHERE status = 'completed'),
    'audits_last_30_days', (SELECT COUNT(*) FROM audits WHERE created_at > NOW() - INTERVAL '30 days'),
    'total_revenue_cad_cents', (SELECT COALESCE(SUM(amount_cad), 0) FROM audits WHERE payment_status = 'paid'),
    'total_patterns', (SELECT COUNT(*) FROM patterns),
    'avg_audit_duration_seconds', (
      SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 0)::INT
      FROM audits
      WHERE status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL
    )
  );
$$;

COMMENT ON FUNCTION get_admin_stats IS 'Retourne les statistiques globales pour le dashboard admin';

-- ─────────────────────────────────────────────────────────────
-- 7. STORAGE BUCKETS
-- ─────────────────────────────────────────────────────────────

-- À exécuter via l'interface Supabase Storage ou via API,
-- car CREATE BUCKET n'est pas dispo en SQL direct dans tous les cas :
--
-- Buckets à créer :
--   - 'audit-reports' (private)  : PDFs/DOCX générés, accessibles uniquement au client propriétaire
--   - 'audit-assets' (public)    : images/icônes utilisées dans les rapports
--
-- Policies storage à configurer manuellement dans le dashboard Supabase :
--   audit-reports :
--     SELECT : client peut voir son propre fichier (path doit commencer par son user_id)
--     INSERT : service_role uniquement
--   audit-assets :
--     SELECT : public
--     INSERT : service_role uniquement

-- ─────────────────────────────────────────────────────────────
-- 8. DONNÉES DE RÉFÉRENCE (seed minimal)
-- ─────────────────────────────────────────────────────────────

-- Insérer les templates de prompts initiaux (versions placeholder)
-- Les vrais prompts seront ajoutés en Session 2 quand on concevra les skills

INSERT INTO audit_templates (skill_number, name, version, prompt_template, is_active) VALUES
(1, 'Context Profile', '1.0', 'À définir en session 2', FALSE),
(2, 'Opportunities', '1.0', 'À définir en session 2', FALSE),
(3, 'Risk Analyzer', '1.0', 'À définir en session 2', FALSE),
(4, 'Tech Stack Audit', '1.0', 'À définir en session 2', FALSE),
(5, 'Synthesis + ROI', '1.0', 'À définir en session 2', FALSE)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- FIN DU SCHÉMA
-- ═══════════════════════════════════════════════════════════════════════
--
-- Vérification après exécution :
--
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
--   -- Doit lister : clients, audits, patterns, audit_templates, audit_logs
--
--   SELECT extname FROM pg_extension WHERE extname IN ('vector', 'uuid-ossp');
--   -- Doit retourner les deux extensions
--
--   SELECT COUNT(*) FROM audit_templates;
--   -- Doit retourner 5
--
-- ═══════════════════════════════════════════════════════════════════════
