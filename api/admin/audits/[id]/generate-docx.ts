// POST /api/admin/audits/[id]/generate-docx
// Génère (ou régénère) le rapport DOCX d'un audit, l'upload dans le
// bucket privé Supabase Storage `audit-reports`, met à jour les
// colonnes de tracking sur audits, et retourne une URL signée
// (15 minutes) pour téléchargement immédiat depuis l'admin.
//
// Effets :
//   1. requireAdmin
//   2. Charge l'audit complet (intake + 5 outputs + champs de révision)
//   3. buildAuditDocx() → Buffer
//   4. uploadDocx() vers <audit_id>/audit-<slug>-<timestamp>.docx
//   5. Update audits.docx_storage_path et audits.docx_generated_at
//   6. Insert event 'docx_generated' dans audit_review_events
//   7. Retourne { ok, storage_path, signed_url, generated_at, size_bytes }
//
// Comportement si appelé deux fois : régénère et écrit un NOUVEAU blob
// (timestamp dans le nom). L'ancien blob reste dans le bucket — cleanup
// possible plus tard via une routine de housekeeping.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../../_supabaseAdmin';
import { requireAdmin } from '../../../_adminAuth';
import {
  buildDocxStoragePath,
  getSignedUrl,
  uploadDocx,
} from '../../../_storageAuditReports';
import { loadDiagramAssetsForAudit } from '../../../_storageAuditDiagrams';
import {
  buildAuditDocx,
  clientFileSlug,
  type AuditForDocx,
} from '../../../../src/lib/report/docx-builder';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAdmin(req);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

  const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "ID d'audit invalide." });
  }

  const supabase = getSupabaseAdmin();

  const { data: audit, error: fetchErr } = await supabase
    .from('audits')
    .select(
      'id, intake_data, skill_1_output, skill_2_output, skill_5_output, admin_notes_global, reviewed_at, delivered_at, created_at, diagrams_metadata',
    )
    .eq('id', id)
    .maybeSingle();

  if (fetchErr) {
    console.error('[generate-docx] fetch error:', fetchErr);
    return res.status(500).json({ error: fetchErr.message });
  }
  if (!audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }
  if (!audit.skill_5_output) {
    return res.status(409).json({
      error: "Audit sans skill_5_output — impossible de générer le DOCX. Le pipeline doit être terminé.",
    });
  }

  const auditForDocx = audit as unknown as AuditForDocx;

  // Pré-charge les diagrammes depuis Storage (best-effort : échec
  // partiel toléré, le builder insérera "Diagramme non disponible"
  // pour les solutions manquantes).
  const diagramAssets = await loadDiagramAssetsForAudit(
    audit.diagrams_metadata as Parameters<typeof loadDiagramAssetsForAudit>[0],
  );

  let buffer: Buffer;
  try {
    buffer = await buildAuditDocx(auditForDocx, diagramAssets);
  } catch (err) {
    console.error('[generate-docx] build error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erreur génération DOCX.',
    });
  }

  const slug = clientFileSlug(auditForDocx);
  const storagePath = buildDocxStoragePath(id, slug);

  try {
    await uploadDocx(storagePath, buffer);
  } catch (err) {
    console.error('[generate-docx] upload error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erreur upload Storage.',
    });
  }

  const generatedAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('audits')
    .update({
      docx_storage_path: storagePath,
      docx_generated_at: generatedAt,
    })
    .eq('id', id);
  if (updErr) {
    console.error('[generate-docx] update error:', updErr);
    return res.status(500).json({ error: updErr.message });
  }

  // Event historique. Best-effort : on ne fait pas échouer la requête.
  void supabase
    .from('audit_review_events')
    .insert({
      audit_id: id,
      event_type: 'docx_generated',
      actor_email: auth.email,
      payload: { storage_path: storagePath, size_bytes: buffer.length },
    })
    .then(({ error }) => {
      if (error) console.error('[generate-docx] event insert error:', error);
    });

  let signedUrl: string;
  try {
    signedUrl = await getSignedUrl(storagePath);
  } catch (err) {
    console.error('[generate-docx] signed url error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erreur signature URL.',
    });
  }

  return res.status(200).json({
    ok: true,
    storage_path: storagePath,
    signed_url: signedUrl,
    generated_at: generatedAt,
    size_bytes: buffer.length,
  });
}
