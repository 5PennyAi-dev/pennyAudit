-- Migration : colonnes dédiées pour la comptabilité des tokens Anthropic.
-- Session 2B — alimente l'endpoint /api/admin/costs.

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS model_used    TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens  INTEGER,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER;

COMMENT ON COLUMN audit_logs.model_used IS
  'Identifiant du modèle Anthropic utilisé (ex: claude-opus-4-7).';
COMMENT ON COLUMN audit_logs.input_tokens IS
  'Tokens d''entrée consommés par cet appel.';
COMMENT ON COLUMN audit_logs.output_tokens IS
  'Tokens de sortie générés par cet appel. tokens_used = input + output.';

-- Index pour l'agrégation sur les 30 derniers jours (admin/costs).
CREATE INDEX IF NOT EXISTS audit_logs_created_skill_idx
  ON audit_logs (created_at DESC, skill_number)
  WHERE skill_number IS NOT NULL;
