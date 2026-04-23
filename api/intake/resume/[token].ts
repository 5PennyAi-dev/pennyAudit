import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_supabaseAdmin';
import { verifyResumeToken } from '../../_resumeToken';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const raw = req.query.token;
  const token = Array.isArray(raw) ? raw[0] : raw;
  if (!token) return res.status(400).json({ error: 'Token manquant.' });

  let payload;
  try {
    payload = verifyResumeToken(token);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Token invalide.';
    return res.status(401).json({ error: message });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('audits')
    .select('id, intake_data, status')
    .eq('id', payload.auditId)
    .single();

  if (error) {
    console.error('[intake/resume] error:', error);
    return res.status(404).json({ error: 'Audit introuvable.' });
  }

  if (data.status !== 'draft') {
    return res
      .status(410)
      .json({ error: 'Cet audit a déjà été soumis.', status: data.status });
  }

  const intake = (data.intake_data ?? {}) as Record<string, unknown>;
  const currentScreen =
    typeof intake._currentScreen === 'number' ? intake._currentScreen : 1;
  const { _currentScreen: _cs, ...formData } = intake;
  void _cs;

  return res.status(200).json({
    auditId: data.id,
    formData,
    currentScreen,
  });
}
