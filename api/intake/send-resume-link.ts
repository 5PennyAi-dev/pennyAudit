import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, parseJsonBody } from '../_supabaseAdmin';
import { sendResumeEmail } from '../_sendResumeEmail';

interface SendResumeLinkPayload {
  auditId?: string;
  email?: string;
  firstName?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody<SendResumeLinkPayload>(req.body);
  if (!body?.auditId || !body.email) {
    return res.status(400).json({ error: 'auditId et email requis.' });
  }

  const supabase = getSupabaseAdmin();
  const { data: audit, error } = await supabase
    .from('audits')
    .select('id, status, intake_data')
    .eq('id', body.auditId)
    .single();

  if (error || !audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }
  if (audit.status !== 'draft') {
    return res.status(410).json({ error: 'Cet audit est déjà soumis.' });
  }

  const firstName =
    body.firstName ??
    ((audit.intake_data as Record<string, unknown>)?.first_name as
      | string
      | undefined);

  const result = await sendResumeEmail({
    auditId: audit.id,
    email: body.email,
    firstName,
  });

  if (!result.sent && !result.dev) {
    return res.status(502).json({ error: result.error ?? 'Envoi du courriel échoué.' });
  }

  // Marquer comme relancé pour que le cron ne renvoie pas un second courriel.
  await supabase
    .from('audits')
    .update({ resume_email_sent_at: new Date().toISOString() })
    .eq('id', audit.id);

  return res.status(200).json({
    success: true,
    dev: result.dev,
    ...(result.dev ? { resumeUrl: result.resumeUrl } : {}),
  });
}
