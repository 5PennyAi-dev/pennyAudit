// Courriel de livraison du rapport d'audit au client.
// Ton chaleureux mais professionnel, signature Christian, lien CTA grand
// format vers la page rapport publique. Mention validité 90 jours.

import type { EmailContent } from './resume-template';

export interface AuditDeliveryEmailParams {
  firstName: string | null;
  publicReportUrl: string;
}

export function buildAuditDeliveryEmail(
  params: AuditDeliveryEmailParams,
): EmailContent {
  const greeting = params.firstName ? `Bonjour ${params.firstName}` : 'Bonjour';
  const subject = 'Votre audit IA 5PennyAi est prêt';

  const text = `${greeting},

Votre rapport d'audit IA est maintenant prêt. Je l'ai personnellement
révisé pour m'assurer qu'il est concret et adapté à votre situation.

Consultez-le ici :
${params.publicReportUrl}

Le lien restera valide pendant 90 jours. Vous pouvez aussi imprimer le
rapport directement depuis votre navigateur (bouton « Imprimer » au bas
de la page) si vous voulez en garder une copie PDF.

Si vous avez des questions ou voulez aller plus loin sur l'une des
opportunités identifiées, répondez simplement à ce courriel.

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
          <p style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#F57D20;margin:0 0 16px;">Votre audit est prêt</p>
          <h1 style="font-size:24px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;margin:0 0 16px;color:#0F2744;">${greeting},</h1>
          <p style="font-size:15px;line-height:1.65;color:#0F2744;margin:0 0 16px;">
            Votre rapport d'audit IA est maintenant prêt. Je l'ai personnellement révisé pour m'assurer qu'il est <strong>concret et adapté à votre situation</strong>.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
            <tr><td>
              <a href="${params.publicReportUrl}" style="display:inline-block;background:#F57D20;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:8px;">Consulter mon rapport →</a>
            </td></tr>
          </table>
          <p style="font-size:14px;line-height:1.65;color:#5B6B7E;margin:0 0 16px;">
            Le lien restera valide pendant <strong>90 jours</strong>. Vous pouvez aussi imprimer le rapport directement depuis votre navigateur (bouton « Imprimer » au bas de la page).
          </p>
          <p style="font-size:14px;line-height:1.65;color:#5B6B7E;margin:0 0 24px;">
            Si vous avez des questions ou voulez aller plus loin sur l'une des opportunités identifiées, répondez simplement à ce courriel.
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
