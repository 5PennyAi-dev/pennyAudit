// Courriel envoyé à Christian quand un audit entre en pending_review.
// Dense en info pour amorcer la révision sans quitter l'inbox.

import type { EmailContent } from './resume-template';

export interface AuditPendingReviewAdminParams {
  auditId: string;
  businessName: string | null;
  firstName: string | null;
  email: string | null;
  industry: string | null;
  companySize: string | null;
  primaryLocation: string | null;
  budgetRange: string | null;
  preferredApproach: string | null;
  pipelineCompletedAt: string; // ISO
  slaDeadlineIso: string;
  slaDeadlineFormatted: string;
  // Aperçu synthèse
  skill5ConfidenceLevel: string | null;
  opportunitiesCount: number | null;
  overallRiskLevel: string | null;
  recommendedPath: string | null;
  // Lien suggéré
  reviewLink: string;
}

export function buildAuditPendingReviewAdminEmail(
  p: AuditPendingReviewAdminParams,
): EmailContent {
  const subject = `[5PennyAi Admin] Nouvel audit à réviser — ${p.businessName ?? p.firstName ?? p.auditId}`;

  const text = `Nouvel audit en attente de révision

Client : ${p.businessName ?? '(sans nom)'} (${p.firstName ?? '?'}, ${p.email ?? '?'})
Secteur : ${p.industry ?? '—'}
Taille : ${p.companySize ?? '—'}
Localisation : ${p.primaryLocation ?? '—'}
Budget : ${p.budgetRange ?? '—'}
Voie préférée : ${p.preferredApproach ?? '—'}

Audit ID : ${p.auditId}
Complété à : ${p.pipelineCompletedAt}
Délai SLA : 48 heures ouvrables (avant ${p.slaDeadlineFormatted})

Aperçu rapide :
— Niveau de confiance global (skill 5) : ${p.skill5ConfidenceLevel ?? '—'}
— Nombre d'opportunités sélectionnées : ${p.opportunitiesCount ?? '—'}
— Niveau de risque global : ${p.overallRiskLevel ?? '—'}
— Voie recommandée : ${p.recommendedPath ?? '—'}

Pour réviser :
${p.reviewLink}

Note : en attendant la Session 2C, la révision se fait via Supabase
SQL Editor. Query suggérée :
SELECT skill_1_output, skill_2_output, skill_3_output,
       skill_4_output, skill_5_output
FROM audits WHERE id = '${p.auditId}';`;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#FBFBFB;font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#0F2744;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 16px;">
    <tr><td align="center">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #E3E8EE;border-radius:16px;padding:32px;">
        <tr><td>
          <p style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#F57D20;margin:0 0 12px;">Audit · pending_review</p>
          <h1 style="font-size:22px;font-weight:700;line-height:1.25;margin:0 0 20px;color:#0F2744;">Nouvel audit à réviser</h1>

          <h2 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#0F2744;">Client</h2>
          <table cellpadding="4" cellspacing="0" style="width:100%;font-size:13px;color:#0F2744;margin:0 0 20px;">
            <tr><td style="color:#5B6B7E;width:160px;">Entreprise</td><td>${p.businessName ?? '—'}</td></tr>
            <tr><td style="color:#5B6B7E;">Contact</td><td>${p.firstName ?? '?'} — <a href="mailto:${p.email ?? ''}">${p.email ?? '?'}</a></td></tr>
            <tr><td style="color:#5B6B7E;">Secteur</td><td>${p.industry ?? '—'}</td></tr>
            <tr><td style="color:#5B6B7E;">Taille</td><td>${p.companySize ?? '—'}</td></tr>
            <tr><td style="color:#5B6B7E;">Localisation</td><td>${p.primaryLocation ?? '—'}</td></tr>
            <tr><td style="color:#5B6B7E;">Budget</td><td>${p.budgetRange ?? '—'}</td></tr>
            <tr><td style="color:#5B6B7E;">Voie préférée</td><td>${p.preferredApproach ?? '—'}</td></tr>
          </table>

          <h2 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#0F2744;">Méta</h2>
          <table cellpadding="4" cellspacing="0" style="width:100%;font-size:13px;color:#0F2744;margin:0 0 20px;">
            <tr><td style="color:#5B6B7E;width:160px;">Audit ID</td><td style="font-family:'JetBrains Mono',monospace;">${p.auditId}</td></tr>
            <tr><td style="color:#5B6B7E;">Complété à</td><td>${p.pipelineCompletedAt}</td></tr>
            <tr><td style="color:#5B6B7E;">SLA 48 h avant</td><td><strong>${p.slaDeadlineFormatted}</strong></td></tr>
          </table>

          <h2 style="font-size:14px;font-weight:700;margin:0 0 8px;color:#0F2744;">Aperçu rapide</h2>
          <table cellpadding="4" cellspacing="0" style="width:100%;font-size:13px;color:#0F2744;margin:0 0 20px;">
            <tr><td style="color:#5B6B7E;width:220px;">Confiance skill 5</td><td>${p.skill5ConfidenceLevel ?? '—'}</td></tr>
            <tr><td style="color:#5B6B7E;">Opportunités sélectionnées</td><td>${p.opportunitiesCount ?? '—'}</td></tr>
            <tr><td style="color:#5B6B7E;">Niveau de risque global</td><td>${p.overallRiskLevel ?? '—'}</td></tr>
            <tr><td style="color:#5B6B7E;">Voie recommandée</td><td>${p.recommendedPath ?? '—'}</td></tr>
          </table>

          <p style="margin:0 0 20px;">
            <a href="${p.reviewLink}" style="display:inline-block;background:#0F2744;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">Ouvrir dans Supabase</a>
          </p>

          <p style="font-size:12px;color:#5B6B7E;margin:24px 0 0;border-top:1px solid #E3E8EE;padding-top:16px;">
            Session 2C : une UI admin remplacera ce lien.<br>
            En attendant, query suggérée :<br>
            <code style="display:block;margin-top:8px;padding:10px;background:#F5F7FA;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;">SELECT skill_1_output, skill_2_output, skill_3_output, skill_4_output, skill_5_output<br>FROM audits WHERE id = '${p.auditId}';</code>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}

export function buildAuditErrorAdminEmail(params: {
  auditId: string;
  errorMessage: string;
  businessName: string | null;
  firstName: string | null;
  email: string | null;
}): EmailContent {
  const subject = `[5PennyAi Admin] ⚠️ Un audit a échoué — ${params.businessName ?? params.auditId}`;
  const text = `Un audit a échoué pendant l'exécution du pipeline.

Client : ${params.businessName ?? '(sans nom)'} — ${params.firstName ?? '?'} — ${params.email ?? '?'}
Audit ID : ${params.auditId}

Erreur :
${params.errorMessage}

Le client a reçu un message d'excuse. À recontacter personnellement.
`;
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#0F2744;padding:24px;">
    <h1>⚠️ Audit en erreur — ${params.auditId}</h1>
    <p><strong>Client :</strong> ${params.businessName ?? '—'} (${params.firstName ?? '?'}, ${params.email ?? '?'})</p>
    <pre style="background:#FEE2E2;padding:12px;border-radius:8px;white-space:pre-wrap;">${params.errorMessage}</pre>
    <p>Le client a reçu un message d'excuse. À recontacter personnellement.</p>
  </body></html>`;
  return { subject, text, html };
}

export function buildAuditErrorClientEmail(params: {
  firstName: string | null;
}): EmailContent {
  const greeting = params.firstName ? `Bonjour ${params.firstName}` : 'Bonjour';
  const subject = '[5PennyAi] Un petit contretemps avec votre audit';
  const text = `${greeting},

Merci d'avoir rempli votre audit IA. Malheureusement, une erreur technique
s'est produite pendant la génération de votre rapport.

Pas de panique : j'ai été notifié personnellement et je vais vous recontacter
par courriel sous peu pour reprendre la production manuellement. Vous n'avez
rien à faire.

Merci de votre patience,
Christian Couillard
Fondateur, 5PennyAi`;
  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#0F2744;padding:24px;max-width:560px;margin:auto;">
    <h2>${greeting},</h2>
    <p>Merci d'avoir rempli votre audit IA. Malheureusement, une erreur technique s'est produite pendant la génération de votre rapport.</p>
    <p>Pas de panique : j'ai été notifié personnellement et je vais vous recontacter par courriel sous peu pour reprendre la production manuellement. Vous n'avez rien à faire.</p>
    <p>Merci de votre patience,<br><strong>Christian Couillard</strong><br>Fondateur, 5PennyAi</p>
  </body></html>`;
  return { subject, text, html };
}
