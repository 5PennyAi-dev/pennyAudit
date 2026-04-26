// GET /api/admin/audits/[id]/docx-url
// Retourne une URL signée fraîche (15 min) pour télécharger le dernier
// DOCX déjà stocké, SANS rien régénérer. Utilisé par le bouton
// « Télécharger DOCX » de l'admin.
//
// Réponse : { signed_url, expires_at, storage_path }
// 404 si aucun DOCX n'a encore été généré (docx_storage_path est NULL).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../../_supabaseAdmin';
import { requireAdmin } from '../../../_adminAuth';
import { getSignedUrl } from '../../../_storageAuditReports';

const SIGNED_URL_TTL_SECONDS = 900;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAdmin(req);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

  const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "ID d'audit invalide." });
  }

  const supabase = getSupabaseAdmin();
  const { data: audit, error } = await supabase
    .from('audits')
    .select('docx_storage_path, docx_generated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[docx-url] fetch error:', error);
    return res.status(500).json({ error: error.message });
  }
  if (!audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }
  if (!audit.docx_storage_path) {
    return res.status(404).json({
      error: "Aucun DOCX disponible. Génère-le d'abord.",
    });
  }

  let signedUrl: string;
  try {
    signedUrl = await getSignedUrl(audit.docx_storage_path, SIGNED_URL_TTL_SECONDS);
  } catch (err) {
    console.error('[docx-url] signed url error:', err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : 'Erreur signature URL.',
    });
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString();

  return res.status(200).json({
    signed_url: signedUrl,
    expires_at: expiresAt,
    storage_path: audit.docx_storage_path,
    generated_at: audit.docx_generated_at,
  });
}
