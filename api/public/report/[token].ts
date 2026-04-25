// GET /api/public/report/[token]
// Page rapport publique — accès via JWT signé, pas d'auth admin requise.
//
// Validations :
//   - Signature JWT OK
//   - Token non expiré (90 jours par défaut)
//   - Audit existe et a bien le même token stocké en DB (révocation possible
//     en effaçant la colonne audits.public_report_token).
//   - Statut audit doit être 'delivered' (pas de fuite si rejeté/etc.)
//
// Réponse : { audit: { id, intake_data.first_name, skill_5_output, delivered_at } }
// Le client ne reçoit QUE le rapport final (skill_5_output) — pas les
// sections intermédiaires (cuisine interne).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_supabaseAdmin';
import { verifyReportToken } from '../../_reportToken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = String(
    Array.isArray(req.query.token) ? req.query.token[0] : req.query.token ?? '',
  );
  if (!token) {
    return res.status(400).json({ error: 'Token manquant.' });
  }

  let payload;
  try {
    payload = verifyReportToken(token);
  } catch (err) {
    return res.status(401).json({
      error: err instanceof Error ? err.message : 'Token invalide.',
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: audit, error } = await supabase
    .from('audits')
    .select(
      'id, status, intake_data, skill_5_output, public_report_token, public_report_token_expires_at, delivered_at',
    )
    .eq('id', payload.auditId)
    .maybeSingle();

  if (error) {
    console.error('[public/report] supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  if (!audit) {
    return res.status(404).json({ error: 'Rapport introuvable.' });
  }
  if (audit.public_report_token !== token) {
    return res.status(401).json({ error: 'Lien révoqué ou périmé.' });
  }
  if (audit.status !== 'delivered') {
    return res.status(403).json({ error: 'Rapport non disponible.' });
  }

  const intake = (audit.intake_data ?? {}) as Record<string, unknown>;
  const firstName = typeof intake.first_name === 'string' ? intake.first_name : null;
  const businessName = typeof intake.business_name === 'string' ? intake.business_name : null;

  // Cache léger côté client (révision périodique)
  res.setHeader('Cache-Control', 'private, max-age=60');

  return res.status(200).json({
    audit: {
      id: audit.id,
      first_name: firstName,
      business_name: businessName,
      delivered_at: audit.delivered_at,
      report: audit.skill_5_output,
    },
  });
}
