-- Migration : CHECK constraint strict sur audits.status.
-- Session 2B — cadre les statuts autorisés pour éviter les fautes de frappe.
--
-- Statuts autorisés (liste définitive, incluant ceux prévus pour Session 2C) :
--   draft           : formulaire en cours
--   running         : pipeline des 5 skills en cours
--   pending_review  : pipeline terminé, en attente de revue par Christian
--   approved        : Christian a approuvé le rapport (Session 2C)
--   delivered       : rapport final envoyé au client (Session 2C)
--   error           : échec pendant le pipeline
--
-- ⚠️ Si la DB contient des rows avec des statuts legacy ('paid', 'completed',
-- 'failed', 'exported', etc.), la migration échouera. Les nettoyer ou les
-- remapper AVANT d'appliquer cette migration.

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
    'approved',
    'delivered',
    'error'
  ));

COMMENT ON CONSTRAINT audits_status_allowed_chk ON audits IS
  'Statuts autorisés pour le cycle de vie complet d''un audit. Session 2B/2C.';
