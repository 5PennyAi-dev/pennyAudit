-- Migration : bucket Supabase Storage pour les diagrammes d'architecture
-- générés par Gemini Nano Banana Pro + colonne de tracking sur la table
-- audits.
-- Session 2E — Étape 1.
--
-- Crée un bucket privé `audit-diagrams` qui stocke les fichiers PNG
-- générés par le modèle gemini-3-pro-image-preview (un diagramme par
-- opportunité phase 1 et phase 2). Accès uniquement via le service_role
-- (URLs signées 15 min côté admin et page publique).
--
-- Ajoute une colonne JSONB `diagrams_metadata` sur `audits` qui contient
-- pour chaque solution un sous-objet :
--   {
--     "<solution_id>": {
--       "title": "Architecture de la solution — ...",
--       "storage_path": "<audit_id>/<solution_id>.png",
--       "prompt_used": "Create a professional technical...",
--       "generated_at": "2026-04-26T14:30:00Z",
--       "status": "ok" | "failed",
--       "failure_reason": "Optional error message"
--     }
--   }
--
-- Documente également les nouveaux event_type acceptés par
-- `audit_review_events` (le champ est texte libre, pas un enum, donc
-- aucune modification de contrainte n'est requise — uniquement le
-- COMMENT mis à jour).

-- ─────────────────────────────────────────────────────────────
-- 1. Bucket Storage privé
-- ─────────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('audit-diagrams', 'audit-diagrams', false)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. Politiques RLS sur storage.objects pour ce bucket
--    (service_role bypass déjà tout, mais on est explicite : aucun
--    autre rôle ne doit pouvoir lire ou écrire dans ce bucket)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "audit-diagrams service role only - select"
  ON storage.objects;
DROP POLICY IF EXISTS "audit-diagrams service role only - insert"
  ON storage.objects;
DROP POLICY IF EXISTS "audit-diagrams service role only - update"
  ON storage.objects;
DROP POLICY IF EXISTS "audit-diagrams service role only - delete"
  ON storage.objects;

CREATE POLICY "audit-diagrams service role only - select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audit-diagrams' AND auth.role() = 'service_role');

CREATE POLICY "audit-diagrams service role only - insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audit-diagrams' AND auth.role() = 'service_role');

CREATE POLICY "audit-diagrams service role only - update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'audit-diagrams' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'audit-diagrams' AND auth.role() = 'service_role');

CREATE POLICY "audit-diagrams service role only - delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audit-diagrams' AND auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────
-- 3. Colonne JSONB de tracking sur audits
-- ─────────────────────────────────────────────────────────────

ALTER TABLE audits ADD COLUMN IF NOT EXISTS diagrams_metadata jsonb;

COMMENT ON COLUMN audits.diagrams_metadata IS
  'Métadonnées des diagrammes d''architecture générés par Gemini, indexées par solution_id. Chaque entrée contient title, storage_path, prompt_used, generated_at, status (ok|failed) et failure_reason optionnel. NULL tant qu''aucune génération n''a eu lieu.';

-- ─────────────────────────────────────────────────────────────
-- 4. Documentation des nouveaux event_type acceptés
--    (pas de contrainte CHECK : le champ event_type est texte libre,
--    on documente seulement les valeurs attendues)
-- ─────────────────────────────────────────────────────────────

COMMENT ON TABLE audit_review_events IS
  'Historique des actions admin sur un audit. event_type valeurs attendues : opened, note_saved, approved, rejected, changes_requested, pipeline_rerun, sent_to_client, docx_generated, diagrams_generation_started, diagram_generated, diagram_regenerated, diagram_failed.';

-- ─────────────────────────────────────────────────────────────
-- Vérifications post-migration (à exécuter manuellement)
-- ─────────────────────────────────────────────────────────────
--
-- SELECT id, name, public FROM storage.buckets WHERE id = 'audit-diagrams';
-- -- doit retourner public = false
--
-- SELECT policyname FROM pg_policies
--   WHERE schemaname = 'storage' AND tablename = 'objects'
--     AND policyname LIKE 'audit-diagrams%';
-- -- doit lister 4 policies
--
-- \d audits
-- -- doit montrer diagrams_metadata jsonb
