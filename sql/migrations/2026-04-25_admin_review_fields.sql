-- Migration : champs admin de révision + table audit_review_events.
-- Session 2C — Étape 1.
--
-- Cette migration prépare la table `audits` pour la révision humaine par
-- Christian (annotations, statuts de décision, token de rapport public) et
-- crée la table d'historique `audit_review_events` qui trace toutes les
-- actions admin sur un audit.
--
-- Statuts du cycle de vie complet (final list, Session 2C) :
--   draft             : formulaire en cours
--   running           : pipeline des 5 skills en cours
--   pending_review    : pipeline terminé, en attente de revue par Christian
--   changes_requested : Christian a demandé des modifications, à relancer
--   approved          : Christian a approuvé le rapport
--   rejected          : audit rejeté, ne sera pas livré au client
--   delivered         : rapport final envoyé au client
--   error             : échec pendant le pipeline

-- ─────────────────────────────────────────────────────────────
-- 1. Étendre le CHECK constraint sur audits.status
-- ─────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'audits_status_allowed_chk'
  ) THEN
    ALTER TABLE audits DROP CONSTRAINT audits_status_allowed_chk;
  END IF;
END $$;

ALTER TABLE audits
  ADD CONSTRAINT audits_status_allowed_chk
  CHECK (status IN (
    'draft',
    'running',
    'pending_review',
    'changes_requested',
    'approved',
    'rejected',
    'delivered',
    'error'
  ));

COMMENT ON CONSTRAINT audits_status_allowed_chk ON audits IS
  'Statuts autorisés pour le cycle de vie complet d''un audit. Session 2C : ajout de changes_requested et rejected.';

-- ─────────────────────────────────────────────────────────────
-- 2. Colonnes admin sur audits
-- ─────────────────────────────────────────────────────────────

ALTER TABLE audits ADD COLUMN IF NOT EXISTS admin_notes_global text;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS reviewed_by text;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS approved_at timestamptz;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS public_report_token text;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS public_report_token_expires_at timestamptz;

COMMENT ON COLUMN audits.admin_notes_global IS
  'Note globale de révision rédigée par Christian (onglet Notes & historique).';
COMMENT ON COLUMN audits.reviewed_at IS
  'Horodatage de la première décision admin (approve / changes_requested / reject).';
COMMENT ON COLUMN audits.reviewed_by IS
  'Courriel de l''admin qui a pris la décision de révision.';
COMMENT ON COLUMN audits.approved_at IS
  'Horodatage de l''approbation finale par l''admin.';
COMMENT ON COLUMN audits.delivered_at IS
  'Horodatage de l''envoi du rapport au client (courriel + lien public).';
COMMENT ON COLUMN audits.public_report_token IS
  'JWT signé permettant d''accéder à la page rapport publique sans auth.';
COMMENT ON COLUMN audits.public_report_token_expires_at IS
  'Expiration du token public (90 jours par défaut).';

-- ─────────────────────────────────────────────────────────────
-- 3. Table audit_review_events (historique des décisions admin)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit_review_events IS
  'Historique des actions admin sur un audit. event_type valeurs attendues : opened, note_saved, approved, rejected, changes_requested, pipeline_rerun, sent_to_client.';
COMMENT ON COLUMN audit_review_events.event_type IS
  'Type d''événement. Texte libre (pas un enum) pour souplesse, valeurs documentées sur la table.';
COMMENT ON COLUMN audit_review_events.payload IS
  'Contenu libre selon event_type (raison de rejet, longueur de note, etc.). Ne jamais stocker de PII inutile.';
COMMENT ON COLUMN audit_review_events.actor_email IS
  'Courriel de l''admin auteur de l''action (NULL pour événements système).';

CREATE INDEX IF NOT EXISTS idx_audit_review_events_audit_id
  ON audit_review_events(audit_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 4. Row Level Security (service_role uniquement)
-- ─────────────────────────────────────────────────────────────

ALTER TABLE audit_review_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Review events accessibles au backend uniquement"
  ON audit_review_events;

CREATE POLICY "Review events accessibles au backend uniquement"
  ON audit_review_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- Vérifications post-migration (à exécuter manuellement)
-- ─────────────────────────────────────────────────────────────
--
-- \d audits
-- \d audit_review_events
--
-- SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint WHERE conname = 'audits_status_allowed_chk';
--
-- -- Doit passer :
-- -- UPDATE audits SET status = 'changes_requested' WHERE id = '<un audit>';
-- -- Doit échouer :
-- -- UPDATE audits SET status = 'foo' WHERE id = '<un audit>';
