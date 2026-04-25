-- Migration : bucket Supabase Storage pour les rapports DOCX + colonnes
-- de tracking sur la table audits.
-- Session 2D — Étape 1.
--
-- Crée un bucket privé `audit-reports` qui stocke les fichiers .docx
-- générés à partir des outputs des skills. Accès uniquement via le
-- service_role (URLs signées 15 min pour téléchargement admin, lecture
-- du buffer en mémoire pour la pièce jointe courriel).
--
-- Ajoute deux colonnes sur `audits` pour tracer le dernier fichier
-- généré :
--   docx_storage_path    : chemin du blob dans le bucket (ex.
--                          "<audit_id>/audit-sophie-tremblay-1714000000.docx")
--   docx_generated_at    : horodatage de la dernière régénération

-- ─────────────────────────────────────────────────────────────
-- 1. Bucket Storage privé
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-reports', 'audit-reports', false)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. Politiques RLS sur storage.objects pour ce bucket
--    (service_role bypass déjà tout, mais on est explicite : aucun
--    autre rôle ne doit pouvoir lire ou écrire dans ce bucket)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "audit-reports service role only - select"
  ON storage.objects;
DROP POLICY IF EXISTS "audit-reports service role only - insert"
  ON storage.objects;
DROP POLICY IF EXISTS "audit-reports service role only - update"
  ON storage.objects;
DROP POLICY IF EXISTS "audit-reports service role only - delete"
  ON storage.objects;

CREATE POLICY "audit-reports service role only - select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audit-reports' AND auth.role() = 'service_role');

CREATE POLICY "audit-reports service role only - insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audit-reports' AND auth.role() = 'service_role');

CREATE POLICY "audit-reports service role only - update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'audit-reports' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'audit-reports' AND auth.role() = 'service_role');

CREATE POLICY "audit-reports service role only - delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audit-reports' AND auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 3. Colonnes de tracking sur audits
-- ─────────────────────────────────────────────────────────────

ALTER TABLE audits ADD COLUMN IF NOT EXISTS docx_storage_path text;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS docx_generated_at timestamptz;

COMMENT ON COLUMN audits.docx_storage_path IS
  'Chemin du dernier rapport .docx généré, dans le bucket Storage audit-reports. NULL tant qu''aucune génération n''a eu lieu.';
COMMENT ON COLUMN audits.docx_generated_at IS
  'Horodatage de la dernière régénération du DOCX (écrasement à chaque régénération).';

-- ─────────────────────────────────────────────────────────────
-- Vérifications post-migration (à exécuter manuellement)
-- ─────────────────────────────────────────────────────────────
--
-- SELECT id, name, public FROM storage.buckets WHERE id = 'audit-reports';
-- -- doit retourner public = false
--
-- SELECT policyname FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects'
--     AND policyname LIKE 'audit-reports%';
-- -- doit lister 4 policies
--
-- \d audits
-- -- doit montrer docx_storage_path text, docx_generated_at timestamptz
