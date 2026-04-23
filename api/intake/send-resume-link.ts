import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, parseJsonBody } from '../_supabaseAdmin';
import { signResumeToken } from '../_resumeToken';
import { buildResumeEmail } from '../../src/lib/email/resume-template';

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

  const token = signResumeToken(audit.id);
  const baseUrl =
    process.env.PUBLIC_BASE_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:5173';
  const normalizedBase = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const resumeUrl = `${normalizedBase}/intake/resume/${token}`;

  const firstName =
    body.firstName ??
    ((audit.intake_data as Record<string, unknown>)?.first_name as
      | string
      | undefined);

  const email = buildResumeEmail({ firstName, resumeUrl });
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM ?? '5PennyAi <no-reply@5pennyai.com>';

  if (!resendKey) {
    // Mode dev : on log et on retourne resumeUrl au lieu d'envoyer.
    // ⚠️ PRODUCTION : RESEND_API_KEY DOIT être configurée sur Vercel avant
    // le lancement, sinon aucun courriel de reprise ne sera envoyé et les
    // utilisateurs qui abandonnent le formulaire ne pourront pas le reprendre.
    console.warn('[send-resume-link] RESEND_API_KEY absent — email non envoyé.');
    console.log('[send-resume-link] resumeUrl:', resumeUrl);
    return res.status(200).json({
      success: true,
      dev: true,
      resumeUrl,
    });
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [body.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!resendResponse.ok) {
    const text = await resendResponse.text().catch(() => '');
    console.error('[send-resume-link] resend error:', resendResponse.status, text);
    return res.status(502).json({ error: 'Envoi du courriel échoué.' });
  }

  return res.status(200).json({ success: true });
}
