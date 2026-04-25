// POST /api/audit/[id]/rerun (auth admin requise)
//
// Relance le pipeline des 5 skills sur un audit en statut 'changes_requested'.
//
// Logique :
//   1. Valide auth admin et statut courant
//   2. Backup des 5 outputs + admin_notes_global dans un event 'pipeline_rerun_backup'
//      (recovery possible en cas de crash mid-rerun)
//   3. Émet l'event 'pipeline_rerun'
//   4. Repasse le statut à 'draft' (état requis par /api/audit/run)
//   5. Déclenche /api/audit/run en fire-and-forget (le client n'attend pas)
//   6. Retourne 200 immédiatement
//
// L'orchestrateur /api/audit/run fait passer le statut draft → running →
// pending_review et écrase les *_output au fur et à mesure. La page admin
// peut être rafraîchie pour voir le nouveau statut.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_supabaseAdmin';
import { requireAdmin } from '../../_adminAuth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = requireAdmin(req);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

  const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'ID d\'audit invalide.' });
  }

  const supabase = getSupabaseAdmin();

  const { data: audit, error: fetchErr } = await supabase
    .from('audits')
    .select(
      'id, status, skill_1_output, skill_2_output, skill_3_output, skill_4_output, skill_5_output, admin_notes_global',
    )
    .eq('id', id)
    .maybeSingle();
  if (fetchErr || !audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }
  if (audit.status !== 'changes_requested') {
    return res.status(409).json({
      error: `Statut incompatible : ${audit.status}. Attendu : changes_requested.`,
    });
  }

  // Backup des outputs courants dans un event (recovery manuel possible).
  const { error: backupErr } = await supabase.from('audit_review_events').insert({
    audit_id: id,
    event_type: 'pipeline_rerun_backup',
    actor_email: auth.email,
    payload: {
      previous_outputs: {
        skill_1_output: audit.skill_1_output,
        skill_2_output: audit.skill_2_output,
        skill_3_output: audit.skill_3_output,
        skill_4_output: audit.skill_4_output,
        skill_5_output: audit.skill_5_output,
      },
      previous_admin_notes_global: audit.admin_notes_global,
    },
  });
  if (backupErr) {
    console.error('[rerun] backup event error:', backupErr);
    return res.status(500).json({
      error: 'Échec du backup avant rerun, opération annulée.',
    });
  }

  // /api/audit/run accepte maintenant 'changes_requested' comme état d'entrée.
  // Pas besoin de toucher au statut ici — l'orchestrateur le passera à 'running'.
  // Event de déclenchement (visible dans la timeline).
  const { error: evErr } = await supabase.from('audit_review_events').insert({
    audit_id: id,
    event_type: 'pipeline_rerun',
    actor_email: auth.email,
    payload: null,
  });
  if (evErr) console.error('[rerun] event insert error:', evErr);

  // Déclenche /api/audit/run en fire-and-forget. Pas de await — le pipeline
  // tourne en arrière-plan, le client peut rafraîchir la page pour voir le
  // nouveau statut.
  const base =
    process.env.PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173');
  const runUrl = `${base}/api/audit/run`;
  void fetch(runUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auditId: id }),
  }).catch((err) => {
    console.error('[rerun] /api/audit/run trigger failed:', err);
  });

  return res.status(200).json({
    ok: true,
    status: 'changes_requested',
    message: 'Pipeline relancé. Le statut passera à running puis pending_review.',
  });
}
