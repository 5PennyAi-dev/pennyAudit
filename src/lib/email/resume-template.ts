// Template de courriel « Reprenez où vous en étiez ».
// Utilisé par l'endpoint serverless /api/intake/send-resume-link.

export interface ResumeEmailParams {
  firstName?: string;
  resumeUrl: string;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function buildResumeEmail({
  firstName,
  resumeUrl,
}: ResumeEmailParams): EmailContent {
  const greeting = firstName ? `Bonjour ${firstName}` : 'Bonjour';
  const subject = 'Votre audit IA 5PennyAi — Reprenez où vous en étiez';

  const text = `${greeting},

Vous avez commencé votre audit IA sur 5PennyAi, mais il vous reste quelques
questions à compléter. Pas de panique — on a sauvegardé vos réponses.

Cliquez sur le lien ci-dessous pour reprendre exactement là où vous étiez :

${resumeUrl}

Ce lien est valide 7 jours. Après ça, il vous faudra recommencer le formulaire
(ce qui prend environ 5 minutes).

Une question ? Répondez simplement à ce courriel.

— L'équipe 5PennyAi`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#FBFBFB;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0F2744;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E3E8EE;border-radius:16px;padding:36px;">
        <tr><td>
          <p style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#F57D20;margin:0 0 16px;">Audit en pause</p>
          <h1 style="font-size:26px;font-weight:700;line-height:1.2;letter-spacing:-0.02em;margin:0 0 16px;color:#0F2744;">${greeting}, reprenons votre audit.</h1>
          <p style="font-size:15px;line-height:1.6;color:#5B6B7E;margin:0 0 24px;">
            Vous avez commencé votre audit IA, mais il vous reste quelques questions à compléter.
            On a sauvegardé vos réponses — il suffit d'un clic pour continuer.
          </p>
          <p style="margin:0 0 28px;">
            <a href="${resumeUrl}" style="display:inline-block;background:#F57D20;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:8px;">Reprendre mon audit</a>
          </p>
          <p style="font-size:13px;line-height:1.6;color:#5B6B7E;margin:0 0 8px;">
            Ou copiez ce lien dans votre navigateur :
          </p>
          <p style="font-family:'JetBrains Mono',monospace;font-size:12px;line-height:1.5;color:#5B6B7E;word-break:break-all;margin:0 0 24px;">
            ${resumeUrl}
          </p>
          <p style="font-size:12px;color:#5B6B7E;margin:24px 0 0;border-top:1px solid #E3E8EE;padding-top:16px;">
            Ce lien est valide 7 jours. — L'équipe 5PennyAi
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
