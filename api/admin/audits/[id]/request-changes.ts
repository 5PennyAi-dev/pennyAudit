// POST /api/admin/audits/[id]/request-changes
// Body : { reason: string }
// Statut audits.status : pending_review → changes_requested

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../../_supabaseAdmin';
import { requireAdmin } from '../../../_adminAuth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = requireAdmin(req);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

  const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'ID d\'audit invalide.' });
  }

  const body = (req.body ?? {}) as { reason?: unknown };
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) {
    return res.status(400).json({ error: 'Raison requise.' });
  }

  const supabase = getSupabaseAdmin();

  const { data: audit, error: fetchErr } = await supabase
    .from('audits')
    .select('id, status')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr || !audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }
  if (audit.status !== 'pending_review') {
    return res.status(409).json({
      error: `Statut incompatible : ${audit.status}. Attendu : pending_review.`,
    });
  }

  const now = new Date().toISOString();
  const { error: updErr } = await supabase
    .from('audits')
    .update({
      status: 'changes_requested',
      reviewed_at: now,
      reviewed_by: auth.email,
    })
    .eq('id', id);
  if (updErr) {
    console.error('[request-changes] update error:', updErr);
    return res.status(500).json({ error: updErr.message });
  }

  const { error: evErr } = await supabase.from('audit_review_events').insert({
    audit_id: id,
    event_type: 'changes_requested',
    actor_email: auth.email,
    payload: { reason },
  });
  if (evErr) console.error('[request-changes] event insert error:', evErr);

  return res.status(200).json({ ok: true, status: 'changes_requested' });
}
