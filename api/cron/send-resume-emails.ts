// Cron Vercel — envoie les courriels de reprise pour les drafts abandonnés.
// Déclenché toutes les 15 min via vercel.json.
//
// Cible : audits où
//   status = 'draft'
//   AND updated_at < NOW() - INTERVAL '30 minutes'
//   AND resume_email_sent_at IS NULL
//   AND intake_data->>'email' IS NOT NULL
//
// Protection : header Authorization: Bearer $CRON_SECRET.
// Vercel Cron envoie automatiquement ce header quand CRON_SECRET est défini
// dans les env vars du projet.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_supabaseAdmin';
import { sendResumeEmail } from '../_sendResumeEmail';

// 30 min : laisse le temps à un utilisateur parti chercher un café / répondre
// au téléphone de revenir sans recevoir de relance prématurée.
const INACTIVITY_MINUTES = 30;
const BATCH_SIZE = 50;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Protection : vérifier le secret.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/send-resume-emails] CRON_SECRET non configuré.');
    return res.status(500).json({ error: 'Cron secret not configured.' });
  }
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabase = getSupabaseAdmin();
  const cutoff = new Date(
    Date.now() - INACTIVITY_MINUTES * 60 * 1000,
  ).toISOString();

  const { data: drafts, error } = await supabase
    .from('audits')
    .select('id, intake_data, updated_at')
    .eq('status', 'draft')
    .is('resume_email_sent_at', null)
    .lt('updated_at', cutoff)
    .order('updated_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error('[cron/send-resume-emails] query error:', error);
    return res.status(500).json({ error: error.message });
  }

  const results: Array<{
    auditId: string;
    status: 'sent' | 'dev' | 'skipped' | 'failed';
    reason?: string;
  }> = [];

  for (const audit of drafts ?? []) {
    const intake = (audit.intake_data ?? {}) as Record<string, unknown>;
    const email = typeof intake.email === 'string' ? intake.email : null;
    const firstName =
      typeof intake.first_name === 'string' ? intake.first_name : undefined;

    if (!email) {
      results.push({ auditId: audit.id, status: 'skipped', reason: 'no email' });
      continue;
    }

    try {
      const result = await sendResumeEmail({
        auditId: audit.id,
        email,
        firstName,
      });

      if (!result.sent && !result.dev) {
        results.push({
          auditId: audit.id,
          status: 'failed',
          reason: result.error,
        });
        continue;
      }

      const { error: updateError } = await supabase
        .from('audits')
        .update({ resume_email_sent_at: new Date().toISOString() })
        .eq('id', audit.id);

      if (updateError) {
        results.push({
          auditId: audit.id,
          status: 'failed',
          reason: `update: ${updateError.message}`,
        });
        continue;
      }

      results.push({
        auditId: audit.id,
        status: result.dev ? 'dev' : 'sent',
      });
    } catch (err) {
      results.push({
        auditId: audit.id,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'unknown',
      });
    }
  }

  const summary = {
    examined: drafts?.length ?? 0,
    sent: results.filter((r) => r.status === 'sent').length,
    dev: results.filter((r) => r.status === 'dev').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    failed: results.filter((r) => r.status === 'failed').length,
  };

  console.log('[cron/send-resume-emails] done:', summary);
  return res.status(200).json({ success: true, summary, results });
}
