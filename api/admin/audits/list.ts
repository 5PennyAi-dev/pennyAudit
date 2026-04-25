// GET /api/admin/audits/list — liste paginée des audits pour la révision admin.
//
// Query params :
//   status   : statut(s) à filtrer (peut être répété ou séparé par virgule)
//   q        : recherche texte sur first_name / email (intake_data)
//   page     : numéro de page (1-indexé), défaut 1
//   sort_by  : status | client | industry | created_at | sla, défaut created_at
//   sort_dir : asc | desc, défaut desc
//
// Réponse :
//   {
//     audits: [{ id, status, first_name, email, industry, created_at,
//                pipeline_completed_at, sla_deadline, sla_overdue_seconds }],
//     total, page, page_size: 25
//   }

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../_supabaseAdmin';
import { requireAdmin } from '../../_adminAuth';

const PAGE_SIZE = 25;
const SLA_HOURS = 48;

type SortBy = 'status' | 'client' | 'industry' | 'created_at' | 'sla';
type SortDir = 'asc' | 'desc';

const ALLOWED_STATUSES = new Set([
  'draft',
  'running',
  'pending_review',
  'changes_requested',
  'approved',
  'rejected',
  'delivered',
  'error',
]);

interface AuditRow {
  id: string;
  status: string;
  intake_data: Record<string, unknown> | null;
  created_at: string;
  pipeline_completed_at: string | null;
}

function parseStatusParam(raw: unknown): string[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [String(raw)];
  const out: string[] = [];
  for (const item of arr) {
    for (const part of String(item).split(',')) {
      const trimmed = part.trim();
      if (trimmed && ALLOWED_STATUSES.has(trimmed)) out.push(trimmed);
    }
  }
  return [...new Set(out)];
}

function parseSortBy(raw: unknown): SortBy {
  const v = String(Array.isArray(raw) ? raw[0] : raw ?? '');
  if (v === 'status' || v === 'client' || v === 'industry' || v === 'sla') return v;
  return 'created_at';
}

function parseSortDir(raw: unknown): SortDir {
  return String(Array.isArray(raw) ? raw[0] : raw ?? '').toLowerCase() === 'asc'
    ? 'asc'
    : 'desc';
}

function strField(intake: Record<string, unknown> | null, key: string): string {
  if (!intake) return '';
  const v = intake[key];
  return typeof v === 'string' ? v : '';
}

function computeSla(row: AuditRow): { deadline: string; overdueSeconds: number } {
  const start = new Date(row.created_at).getTime();
  const deadlineMs = start + SLA_HOURS * 3600 * 1000;
  const now = Date.now();
  return {
    deadline: new Date(deadlineMs).toISOString(),
    overdueSeconds: Math.floor((now - deadlineMs) / 1000),
  };
}

function compareStrings(a: string, b: string, dir: SortDir): number {
  const cmp = a.localeCompare(b, 'fr', { sensitivity: 'base' });
  return dir === 'asc' ? cmp : -cmp;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAdmin(req);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const statuses = parseStatusParam(req.query.status);
  const q = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q ?? '')
    .trim()
    .toLowerCase();
  const page = Math.max(
    1,
    Number.parseInt(
      String(Array.isArray(req.query.page) ? req.query.page[0] : req.query.page ?? '1'),
      10,
    ) || 1,
  );
  const sortBy = parseSortBy(req.query.sort_by);
  const sortDir = parseSortDir(req.query.sort_dir);

  const supabase = getSupabaseAdmin();

  // On charge tout (avec filtre statut) puis on filtre/tri/pagine en mémoire.
  // Volume actuel : faible. À optimiser quand > quelques centaines d'audits.
  let query = supabase
    .from('audits')
    .select(
      'id, status, intake_data, created_at, pipeline_completed_at',
      { count: 'exact' },
    )
    .neq('status', 'draft'); // on n'affiche pas les brouillons

  if (statuses.length > 0) {
    query = query.in('status', statuses);
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(500);

  if (error) {
    console.error('[admin/audits/list] supabase error:', error);
    return res.status(500).json({ error: error.message });
  }

  let rows = (data ?? []) as AuditRow[];

  // Filtre texte (q) sur first_name / email
  if (q) {
    rows = rows.filter((r) => {
      const fn = strField(r.intake_data, 'first_name').toLowerCase();
      const em = strField(r.intake_data, 'email').toLowerCase();
      return fn.includes(q) || em.includes(q);
    });
  }

  // Tri
  rows.sort((a, b) => {
    if (sortBy === 'status') return compareStrings(a.status, b.status, sortDir);
    if (sortBy === 'client') {
      return compareStrings(
        strField(a.intake_data, 'first_name'),
        strField(b.intake_data, 'first_name'),
        sortDir,
      );
    }
    if (sortBy === 'industry') {
      return compareStrings(
        strField(a.intake_data, 'industry'),
        strField(b.intake_data, 'industry'),
        sortDir,
      );
    }
    if (sortBy === 'sla') {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortDir === 'asc' ? da - db : db - da;
    }
    // created_at default
    const da = new Date(a.created_at).getTime();
    const db = new Date(b.created_at).getTime();
    return sortDir === 'asc' ? da - db : db - da;
  });

  const total = rows.length;
  const start = (page - 1) * PAGE_SIZE;
  const paged = rows.slice(start, start + PAGE_SIZE);

  const audits = paged.map((r) => {
    const sla = computeSla(r);
    return {
      id: r.id,
      status: r.status,
      first_name: strField(r.intake_data, 'first_name') || null,
      email: strField(r.intake_data, 'email') || null,
      industry: strField(r.intake_data, 'industry') || null,
      industry_other: strField(r.intake_data, 'industry_other') || null,
      business_name: strField(r.intake_data, 'business_name') || null,
      created_at: r.created_at,
      pipeline_completed_at: r.pipeline_completed_at,
      sla_deadline: sla.deadline,
      sla_overdue_seconds: sla.overdueSeconds,
    };
  });

  return res.status(200).json({
    audits,
    total,
    page,
    page_size: PAGE_SIZE,
  });
}
