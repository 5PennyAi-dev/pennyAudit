// GET /api/public/report/[token]
// Page rapport publique — accès via JWT signé, pas d'auth admin requise.
//
// Validations :
//   - Signature JWT OK
//   - Token non expiré (90 jours par défaut)
//   - Audit existe et a bien le même token stocké en DB (révocation possible
//     en effaçant la colonne audits.public_report_token).
//   - Statut audit doit être 'delivered' (pas de fuite si rejeté/etc.)
//
// Réponse : { audit: { id, intake_data.first_name, skill_5_output, delivered_at } }
// Le client ne reçoit QUE le rapport final (skill_5_output) — pas les
// sections intermédiaires (cuisine interne).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_supabaseAdmin';
import { verifyReportToken } from '../../_reportToken';
import { buildDiagramsSignedMap } from '../../_storageAuditDiagrams';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = String(
    Array.isArray(req.query.token) ? req.query.token[0] : req.query.token ?? '',
  );
  if (!token) {
    return res.status(400).json({ error: 'Token manquant.' });
  }

  let payload;
  try {
    payload = verifyReportToken(token);
  } catch (err) {
    return res.status(401).json({
      error: err instanceof Error ? err.message : 'Token invalide.',
    });
  }

  const supabase = getSupabaseAdmin();
  const { data: audit, error } = await supabase
    .from('audits')
    .select(
      'id, status, intake_data, skill_2_output, skill_5_output, public_report_token, public_report_token_expires_at, delivered_at, reviewed_at, admin_notes_global, diagrams_metadata',
    )
    .eq('id', payload.auditId)
    .maybeSingle();

  if (error) {
    console.error('[public/report] supabase error:', error);
    return res.status(500).json({ error: error.message });
  }
  if (!audit) {
    return res.status(404).json({ error: 'Rapport introuvable.' });
  }
  if (audit.public_report_token !== token) {
    return res.status(401).json({ error: 'Lien révoqué ou périmé.' });
  }
  if (audit.status !== 'delivered') {
    return res.status(403).json({ error: 'Rapport non disponible.' });
  }

  const intake = (audit.intake_data ?? {}) as Record<string, unknown>;
  const firstName = typeof intake.first_name === 'string' ? intake.first_name : null;
  const businessName = typeof intake.business_name === 'string' ? intake.business_name : null;

  // Mapping pattern_id → adapted_title pour rendre les opportunités lisibles
  const opportunityTitles: Record<string, string> = {};
  const skill2 = audit.skill_2_output as Record<string, unknown> | null;
  const opps = Array.isArray(skill2?.selected_opportunities)
    ? (skill2!.selected_opportunities as Array<Record<string, unknown>>)
    : [];
  for (const o of opps) {
    const pid = typeof o.pattern_id === 'string' ? o.pattern_id : null;
    const title = typeof o.adapted_title === 'string' ? o.adapted_title : null;
    if (pid && title) opportunityTitles[pid] = title;
  }

  // Affirmation de révision conditionnelle (Étape 6c) : true uniquement si
  // l'audit a été réellement révisé ET qu'admin_notes_global est non vide.
  // On ne renvoie pas les notes elles-mêmes au client — juste le booléen.
  const reviewed = isHumanReviewed(audit);

  // Filet de sécurité : nettoie closing_notes des mentions de révision
  // humaine quand l'audit n'est pas révisé. Le system_prompt Skill 5 v2
  // n'en génère plus, mais les audits déjà en DB en contiennent.
  const report = (audit.skill_5_output ?? null) as Record<string, unknown> | null;
  const sanitizedReport =
    report && !reviewed && typeof report.closing_notes === 'string'
      ? { ...report, closing_notes: stripReviewMentions(report.closing_notes) }
      : report;

  // Signed URLs (15 min) pour les diagrammes intégrés au rapport HTML.
  // Côté client, les status === 'failed' sont silencieusement masqués
  // (le client n'a pas à voir les échecs techniques).
  const diagramsSigned = await buildDiagramsSignedMap(
    audit.diagrams_metadata as Parameters<typeof buildDiagramsSignedMap>[0],
  );
  const diagramsForClient: Record<string, { title: string; signed_url: string }> = {};
  for (const [solutionId, entry] of Object.entries(diagramsSigned)) {
    if (entry.status === 'ok' && entry.signed_url) {
      diagramsForClient[solutionId] = { title: entry.title, signed_url: entry.signed_url };
    }
  }

  // Cache léger côté client (révision périodique). Volontairement court
  // car les signed URLs expirent en 15 min.
  res.setHeader('Cache-Control', 'private, max-age=60');

  return res.status(200).json({
    audit: {
      id: audit.id,
      first_name: firstName,
      business_name: businessName,
      delivered_at: audit.delivered_at,
      report: sanitizedReport,
      opportunity_titles: opportunityTitles,
      reviewed,
      diagrams: diagramsForClient,
    },
  });
}

const REVIEW_MENTION_REGEX =
  /[^.!?]*(révis(?:é|ée|ion)\s+(?:humain|personnel|manuel)|relu(?:e)?\s+par|christian\s+couillard\s+a\s+(?:révis|relu|appliqu|valid)|révision\s+(?:humaine|manuelle)|relecture\s+par\s+christian)[^.!?]*[.!?]?/gi;

function stripReviewMentions(text: string): string {
  return text
    .replace(REVIEW_MENTION_REGEX, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Affirmation de révision conditionnelle : on n'utilise que
// admin_notes_global comme preuve fiable d'une intervention humaine.
// Les skill_X_output.reviewer_notes sont pré-remplis par le pipeline IA
// (champ requis dans le schema), donc inutilisables pour distinguer.
function isHumanReviewed(audit: {
  reviewed_at?: string | null;
  admin_notes_global?: string | null;
}): boolean {
  if (!audit.reviewed_at) return false;
  return !!audit.admin_notes_global?.trim();
}
