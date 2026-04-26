import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_supabaseAdmin';

// GET /api/intake/status?auditId=<uuid>
// Retourne { status } pour permettre au front de détecter si un draft
// localStorage correspond encore à un audit modifiable. Lecture seule,
// non sensible (le status seul ne révèle rien).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auditId = req.query.auditId;
  if (typeof auditId !== 'string' || !auditId) {
    return res.status(400).json({ error: 'auditId requis.' });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('audits')
    .select('status')
    .eq('id', auditId)
    .maybeSingle();

  if (error) {
    console.error('[intake/status] error:', error);
    return res.status(500).json({ error: error.message });
  }
  if (!data) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }

  return res.status(200).json({ status: data.status as string });
}
