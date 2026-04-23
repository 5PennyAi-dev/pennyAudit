// Courriel envoyé au client après pipeline_completed.
// Ton chaleureux, 48h ouvrables mentionnées.

import type { EmailContent } from './resume-template';

export interface AuditSubmittedClientParams {
  firstName: string | null;
}

export function buildAuditSubmittedClientEmail(
  params: AuditSubmittedClientParams,
): EmailContent {
  const greeting = params.firstName ? `Bonjour ${params.firstName}` : 'Bonjour';
  const subject = '[5PennyAi] Votre audit est en production';

  const text = `${greeting},

Merci d'avoir rempli votre audit IA. Votre rapport personnalisé
est maintenant en phase de révision humaine.

Je vais personnellement revoir chaque section du rapport pour
m'assurer qu'il est de qualité et adapté à votre situation.
Vous le recevrez par courriel dans les 48 heures ouvrables.

En attendant, si vous avez des questions ou un contexte
supplémentaire à partager, répondez simplement à ce courriel.

Au plaisir,
Christian Couillard
Fondateur, 5PennyAi`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#FBFBFB;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0F2744;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E3E8EE;border-radius:16px;padding:36px;">
        <tr><td>
          <p style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#F57D20;margin:0 0 16px;">Audit en production</p>
          <h1 style="font-size:24px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;margin:0 0 16px;color:#0F2744;">${greeting},</h1>
          <p style="font-size:15px;line-height:1.65;color:#0F2744;margin:0 0 16px;">
            Merci d'avoir rempli votre audit IA. Votre rapport personnalisé est maintenant en phase de <strong>révision humaine</strong>.
          </p>
          <p style="font-size:15px;line-height:1.65;color:#0F2744;margin:0 0 16px;">
            Je vais personnellement revoir chaque section du rapport pour m'assurer qu'il est de qualité et adapté à votre situation.
            Vous le recevrez par courriel dans les <strong>48 heures ouvrables</strong>.
          </p>
          <p style="font-size:15px;line-height:1.65;color:#0F2744;margin:0 0 24px;">
            En attendant, si vous avez des questions ou un contexte supplémentaire à partager, répondez simplement à ce courriel.
          </p>
          <p style="font-size:15px;line-height:1.5;color:#0F2744;margin:0;">
            Au plaisir,<br>
            <strong>Christian Couillard</strong><br>
            <span style="color:#5B6B7E;">Fondateur, 5PennyAi</span>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
