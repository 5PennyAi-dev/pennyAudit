-- Migration : ajouter pipeline_completed_at + statuts pending_review/error.
-- Session 2B — orchestrateur /api/audit/run.

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS pipeline_completed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN audits.pipeline_completed_at IS
  'Horodatage de fin du pipeline des 5 skills. Sert à calculer le SLA 48h.';

-- Le champ status est un TEXT (pas un enum), donc aucun ALTER TYPE requis.
-- Les statuts possibles deviennent :
--   draft, paid, running, pending_review, error, completed, failed, exported
-- Documenté dans src/types/database.ts.
