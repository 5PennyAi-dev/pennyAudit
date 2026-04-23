// GET /api/admin/costs — résumé des tokens et coûts USD sur les 30 derniers jours.
//
// Protection : header `Authorization: Bearer $ADMIN_API_SECRET`.
// Fallback : si ADMIN_API_SECRET n'est pas défini, on accepte CRON_SECRET
// (pratique en dev pour mutualiser un seul secret).
//
// Réponse :
//   {
//     range: { from, to, days },
//     summary: { audits, skill_runs, input_tokens, output_tokens,
//                total_tokens, total_cost_usd, avg_cost_per_audit_usd },
//     by_skill: [{ skill_number, runs, input_tokens, output_tokens,
//                  total_tokens, total_cost_usd, avg_duration_ms }],
//     by_audit: [{ audit_id, skill_runs, total_tokens, total_cost_usd,
//                  first_log_at, last_log_at }]  // top 50 par coût
//   }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_supabaseAdmin';

const DEFAULT_WINDOW_DAYS = 30;

interface LogRow {
  audit_id: string | null;
  skill_number: number | null;
  model_used: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  tokens_used: number | null;
  cost_usd: number | null;
  duration_ms: number | null;
  created_at: string;
}

function checkSecret(req: VercelRequest): boolean {
  const expected = process.env.ADMIN_API_SECRET ?? process.env.CRON_SECRET;
  if (!expected) {
    console.warn('[admin/costs] Aucun secret configuré — endpoint ouvert.');
    return true;
  }
  return req.headers.authorization === `Bearer ${expected}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!checkSecret(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const days = (() => {
    const raw = req.query.days;
    const v = Array.isArray(raw) ? raw[0] : raw;
    const parsed = v ? Number.parseInt(v, 10) : DEFAULT_WINDOW_DAYS;
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 365
      ? parsed
      : DEFAULT_WINDOW_DAYS;
  })();

  const supabase = getSupabaseAdmin();
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from('audit_logs')
    .select(
      'audit_id, skill_number, model_used, input_tokens, output_tokens, tokens_used, cost_usd, duration_ms, created_at',
    )
    .eq('event_type', 'skill_completed')
    .gte('created_at', from.toISOString())
    .lte('created_at', to.toISOString());

  if (error) {
    console.error('[admin/costs] query error:', error);
    return res.status(500).json({ error: error.message });
  }

  const rows = (data ?? []) as LogRow[];

  // Agrégation globale
  const summary = {
    audits: new Set(rows.map((r) => r.audit_id).filter(Boolean)).size,
    skill_runs: rows.length,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    total_cost_usd: 0,
    avg_cost_per_audit_usd: 0,
  };
  for (const r of rows) {
    summary.input_tokens += r.input_tokens ?? 0;
    summary.output_tokens += r.output_tokens ?? 0;
    summary.total_tokens += r.tokens_used ?? 0;
    summary.total_cost_usd += r.cost_usd ?? 0;
  }
  summary.avg_cost_per_audit_usd =
    summary.audits > 0
      ? round6(summary.total_cost_usd / summary.audits)
      : 0;
  summary.total_cost_usd = round6(summary.total_cost_usd);

  // Agrégation par skill
  const skillBuckets = new Map<
    number,
    {
      runs: number;
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      total_cost_usd: number;
      duration_ms_sum: number;
    }
  >();
  for (const r of rows) {
    if (r.skill_number == null) continue;
    const b = skillBuckets.get(r.skill_number) ?? {
      runs: 0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      total_cost_usd: 0,
      duration_ms_sum: 0,
    };
    b.runs += 1;
    b.input_tokens += r.input_tokens ?? 0;
    b.output_tokens += r.output_tokens ?? 0;
    b.total_tokens += r.tokens_used ?? 0;
    b.total_cost_usd += r.cost_usd ?? 0;
    b.duration_ms_sum += r.duration_ms ?? 0;
    skillBuckets.set(r.skill_number, b);
  }
  const by_skill = [...skillBuckets.entries()]
    .map(([skill_number, b]) => ({
      skill_number,
      runs: b.runs,
      input_tokens: b.input_tokens,
      output_tokens: b.output_tokens,
      total_tokens: b.total_tokens,
      total_cost_usd: round6(b.total_cost_usd),
      avg_duration_ms:
        b.runs > 0 ? Math.round(b.duration_ms_sum / b.runs) : 0,
    }))
    .sort((a, b) => a.skill_number - b.skill_number);

  // Agrégation par audit (top 50 par coût)
  const auditBuckets = new Map<
    string,
    {
      skill_runs: number;
      total_tokens: number;
      total_cost_usd: number;
      first_log_at: string;
      last_log_at: string;
    }
  >();
  for (const r of rows) {
    if (!r.audit_id) continue;
    const b = auditBuckets.get(r.audit_id) ?? {
      skill_runs: 0,
      total_tokens: 0,
      total_cost_usd: 0,
      first_log_at: r.created_at,
      last_log_at: r.created_at,
    };
    b.skill_runs += 1;
    b.total_tokens += r.tokens_used ?? 0;
    b.total_cost_usd += r.cost_usd ?? 0;
    if (r.created_at < b.first_log_at) b.first_log_at = r.created_at;
    if (r.created_at > b.last_log_at) b.last_log_at = r.created_at;
    auditBuckets.set(r.audit_id, b);
  }
  const by_audit = [...auditBuckets.entries()]
    .map(([audit_id, b]) => ({
      audit_id,
      skill_runs: b.skill_runs,
      total_tokens: b.total_tokens,
      total_cost_usd: round6(b.total_cost_usd),
      first_log_at: b.first_log_at,
      last_log_at: b.last_log_at,
    }))
    .sort((a, b) => b.total_cost_usd - a.total_cost_usd)
    .slice(0, 50);

  return res.status(200).json({
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
      days,
    },
    summary,
    by_skill,
    by_audit,
  });
}

function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}
