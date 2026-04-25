// GET /api/admin/audits/[id]/get — récupère un audit complet pour la révision admin.
//
// Réponse : { audit: <row complet>, review_events: [...] }
// 401 si pas admin, 404 si audit introuvable.
//
// Effet de bord : émet un événement 'opened' dans audit_review_events à chaque appel.
// (Bruyant volontairement — utile pour debug. Filtrage côté UI plus tard si besoin.)

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../../_supabaseAdmin';
import { requireAdmin } from '../../../_adminAuth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAdmin(req);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'ID d\'audit invalide.' });
  }

  const supabase = getSupabaseAdmin();

  const { data: audit, error: auditErr } = await supabase
    .from('audits')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (auditErr) {
    console.error('[admin/audits/get] supabase error:', auditErr);
    return res.status(500).json({ error: auditErr.message });
  }
  if (!audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }

  const { data: events, error: evErr } = await supabase
    .from('audit_review_events')
    .select('id, event_type, payload, actor_email, created_at')
    .eq('audit_id', id)
    .order('created_at', { ascending: false })
    .limit(200);

  if (evErr) {
    console.error('[admin/audits/get] events error:', evErr);
  }

  // Émet un event 'opened'. Best-effort : on n'échoue pas la requête si l'insert rate.
  void supabase
    .from('audit_review_events')
    .insert({
      audit_id: id,
      event_type: 'opened',
      actor_email: auth.email,
      payload: null,
    })
    .then(({ error }) => {
      if (error) console.error('[admin/audits/get] insert opened event:', error);
    });

  return res.status(200).json({
    audit,
    review_events: events ?? [],
  });
}
