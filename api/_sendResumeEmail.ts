// Logique partagée d'envoi du courriel de reprise d'intake.
// Utilisée par :
//   - POST /api/intake/send-resume-link (déclenchement manuel / dev)
//   - GET  /api/cron/send-resume-emails (cron Vercel toutes les 15 min)

import { signResumeToken } from './_resumeToken';
import { buildResumeEmail } from '../src/lib/email/resume-template';

export interface SendResumeEmailInput {
  auditId: string;
  email: string;
  firstName?: string;
}

export interface SendResumeEmailResult {
  sent: boolean;
  dev: boolean;
  resumeUrl: string;
  error?: string;
}

export async function sendResumeEmail(
  input: SendResumeEmailInput,
): Promise<SendResumeEmailResult> {
  const token = signResumeToken(input.auditId);
  const baseUrl =
    process.env.PUBLIC_BASE_URL ??
    process.env.VERCEL_URL ??
    'http://localhost:5173';
  const normalizedBase = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  const resumeUrl = `${normalizedBase}/intake/resume/${token}`;

  const email = buildResumeEmail({ firstName: input.firstName, resumeUrl });
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_FROM ?? '5PennyAi <no-reply@5pennyai.com>';

  // ⚠️ PRODUCTION : RESEND_API_KEY DOIT être configurée sur Vercel avant
  // le lancement, sinon aucun courriel ne part et les utilisateurs qui
  // abandonnent le formulaire ne pourront pas le reprendre.
  if (!resendKey) {
    console.warn(
      '[sendResumeEmail] RESEND_API_KEY absent — email non envoyé (mode dev).',
    );
    console.log('[sendResumeEmail] resumeUrl:', resumeUrl);
    return { sent: false, dev: true, resumeUrl };
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [input.email],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    console.error('[sendResumeEmail] resend error:', resp.status, text);
    return {
      sent: false,
      dev: false,
      resumeUrl,
      error: `Resend ${resp.status}: ${text || resp.statusText}`,
    };
  }

  return { sent: true, dev: false, resumeUrl };
}
