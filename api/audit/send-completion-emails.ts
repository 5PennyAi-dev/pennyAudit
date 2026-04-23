// Endpoint appelé par l'orchestrateur après pipeline_completed (ou _error).
// Envoie 2 courriels :
//   - Client : confirmation chaleureuse, 48 h ouvrables
//   - Admin (Christian) : synthèse pour amorcer la révision
//
// Mode error (errorMode=true) : envoie les variantes d'excuse au client
// et de notification d'échec à l'admin.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, parseJsonBody } from '../_supabaseAdmin';
import { buildAuditSubmittedClientEmail } from '../../src/lib/email/audit-submitted-client';
import {
  buildAuditPendingReviewAdminEmail,
  buildAuditErrorAdminEmail,
  buildAuditErrorClientEmail,
} from '../../src/lib/email/audit-pending-review-admin';
import {
  addBusinessHours,
  formatSlaDeadline,
} from '../../src/lib/dates/businessHours';
import type { EmailContent } from '../../src/lib/email/resume-template';
import type {
  Skill5Output,
  Skill3Output,
  Skill2Output,
} from '../../src/types/skills';

interface Payload {
  auditId?: string;
  errorMode?: boolean;
  errorMessage?: string;
}

async function sendResend(
  to: string,
  email: EmailContent,
  from?: string,
): Promise<{ sent: boolean; dev: boolean; error?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress =
    from ?? process.env.RESEND_FROM ?? '5PennyAi <no-reply@5pennyai.com>';

  // ⚠️ PRODUCTION : RESEND_API_KEY requise sur Vercel. Sans elle, les
  // courriels sont loggés mais non envoyés (utile en dev).
  if (!resendKey) {
    console.warn('[send-completion-emails] RESEND_API_KEY absent — logging only.');
    console.log('[send-completion-emails] to=', to, 'subject=', email.subject);
    console.log(email.text);
    return { sent: false, dev: true };
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    console.error('[send-completion-emails] resend', resp.status, body);
    return { sent: false, dev: false, error: `Resend ${resp.status}` };
  }
  return { sent: true, dev: false };
}

function checkInternalSecret(req: VercelRequest): boolean {
  const expected = process.env.INTERNAL_HOOK_SECRET ?? process.env.CRON_SECRET;
  if (!expected) return true; // en dev sans secret configuré, on laisse passer
  return req.headers.authorization === `Bearer ${expected}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!checkInternalSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = parseJsonBody<Payload>(req.body);
  if (!body?.auditId) {
    return res.status(400).json({ error: 'auditId requis.' });
  }

  const supabase = getSupabaseAdmin();
  const { data: audit, error } = await supabase
    .from('audits')
    .select(
      'id, intake_data, client_id, pipeline_completed_at, skill_2_output, skill_3_output, skill_5_output',
    )
    .eq('id', body.auditId)
    .single();

  if (error || !audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }

  const intake = (audit.intake_data ?? {}) as Record<string, unknown>;
  const firstName =
    typeof intake.first_name === 'string' ? intake.first_name : null;
  const email = typeof intake.email === 'string' ? intake.email : null;
  const businessName =
    typeof intake.business_name === 'string' ? intake.business_name : null;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminFromClient =
    process.env.RESEND_FROM_CLIENT ?? 'Christian Couillard <christian@5pennyai.com>';
  const adminFromSystem =
    process.env.RESEND_FROM ?? '5PennyAi <no-reply@5pennyai.com>';

  // ─────────── Mode erreur ───────────
  if (body.errorMode) {
    const results: Record<string, unknown> = {};
    if (email) {
      results.client = await sendResend(
        email,
        buildAuditErrorClientEmail({ firstName }),
        adminFromClient,
      );
    }
    if (adminEmail) {
      results.admin = await sendResend(
        adminEmail,
        buildAuditErrorAdminEmail({
          auditId: audit.id,
          errorMessage: body.errorMessage ?? 'unknown',
          businessName,
          firstName,
          email,
        }),
        adminFromSystem,
      );
    } else {
      console.warn('[send-completion-emails] ADMIN_EMAIL absent.');
    }
    return res.status(200).json({ success: true, mode: 'error', results });
  }

  // ─────────── Mode succès ───────────
  const clientRes = email
    ? await sendResend(
        email,
        buildAuditSubmittedClientEmail({ firstName }),
        adminFromClient,
      )
    : { sent: false, dev: true, error: 'email client absent' };

  // Préparer l'email admin avec extraits clés des outputs skill.
  const skill2 = audit.skill_2_output as Skill2Output | null;
  const skill3 = audit.skill_3_output as Skill3Output | null;
  const skill5 = audit.skill_5_output as Skill5Output | null;

  const pipelineCompletedAt =
    audit.pipeline_completed_at ?? new Date().toISOString();
  const deadline = addBusinessHours(new Date(pipelineCompletedAt), 48);

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
  const reviewLink = supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, '')}/project/default/sql/new?content=${encodeURIComponent(
        `SELECT * FROM audits WHERE id = '${audit.id}';`,
      )}`
    : `https://app.supabase.com/ (audit ${audit.id})`;

  let adminRes: unknown = null;
  if (adminEmail) {
    adminRes = await sendResend(
      adminEmail,
      buildAuditPendingReviewAdminEmail({
        auditId: audit.id,
        businessName,
        firstName,
        email,
        industry: (intake.industry as string) ?? null,
        companySize: (intake.company_size as string) ?? null,
        primaryLocation: (intake.primary_location as string) ?? null,
        budgetRange: (intake.budget_range as string) ?? null,
        preferredApproach: (intake.preferred_approach as string) ?? null,
        pipelineCompletedAt,
        slaDeadlineIso: deadline.toISOString(),
        slaDeadlineFormatted: formatSlaDeadline(deadline),
        skill5ConfidenceLevel: skill5?.confidence_level ?? null,
        opportunitiesCount: skill2?.selected_opportunities.length ?? null,
        overallRiskLevel: skill3?.overall_risk_level ?? null,
        recommendedPath: skill5?.recommended_path.primary_path ?? null,
        reviewLink,
      }),
      adminFromSystem,
    );
  } else {
    console.warn('[send-completion-emails] ADMIN_EMAIL absent — admin skip.');
  }

  return res.status(200).json({
    success: true,
    mode: 'completed',
    client: clientRes,
    admin: adminRes,
  });
}
