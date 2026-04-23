-- Migration : suivi du courriel de reprise d'intake
-- Session 2A — cron qui envoie un magic link après 10 min d'inactivité.
--
-- Usage : exécuter dans Supabase SQL Editor, ou via psql.
-- Idempotent (IF NOT EXISTS).

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS resume_email_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN audits.resume_email_sent_at IS
  'Horodatage du courriel de reprise envoyé par le cron. NULL = jamais envoyé. Une seule relance par draft.';

-- Index partiel pour accélérer le SELECT du cron : ne garde que les drafts
-- qui n''ont pas encore reçu de relance.
CREATE INDEX IF NOT EXISTS audits_draft_resume_pending_idx
  ON audits (updated_at)
  WHERE status = 'draft' AND resume_email_sent_at IS NULL;
