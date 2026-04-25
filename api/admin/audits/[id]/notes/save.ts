// POST /api/admin/audits/[id]/notes/save
// Body : { section: 'context'|'opportunities'|'risks'|'stack'|'report'|'global', content: string }
//
// Sections → colonne JSON dans audits, sous-clé reviewer_notes :
//   context        → skill_1_output.reviewer_notes
//   opportunities  → skill_2_output.reviewer_notes
//   risks          → skill_3_output.reviewer_notes
//   stack          → skill_4_output.reviewer_notes
//   report         → skill_5_output.reviewer_notes
//   global         → admin_notes_global (colonne text directement)
//
// Émet un event 'note_saved' avec { section, length } dans le payload —
// jamais le contenu (historique propre, pas un log à fuiter).

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../../../_supabaseAdmin';
import { requireAdmin } from '../../../../_adminAuth';

const SECTION_TO_COLUMN: Record<string, string> = {
  context: 'skill_1_output',
  opportunities: 'skill_2_output',
  risks: 'skill_3_output',
  stack: 'skill_4_output',
  report: 'skill_5_output',
};
const ALLOWED_SECTIONS = new Set([...Object.keys(SECTION_TO_COLUMN), 'global']);
const MAX_CONTENT_LENGTH = 10_000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAdmin(req);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: 'ID d\'audit invalide.' });
  }

  const body = (req.body ?? {}) as { section?: unknown; content?: unknown };
  const section = String(body.section ?? '');
  const content = typeof body.content === 'string' ? body.content : '';

  if (!ALLOWED_SECTIONS.has(section)) {
    return res.status(400).json({ error: `Section invalide : ${section}` });
  }
  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(413).json({
      error: `Note trop longue (max ${MAX_CONTENT_LENGTH} caractères).`,
    });
  }

  const supabase = getSupabaseAdmin();

  if (section === 'global') {
    const { data: updated, error } = await supabase
      .from('audits')
      .update({ admin_notes_global: content })
      .eq('id', id)
      .select('id, admin_notes_global');
    if (error) {
      console.error('[notes/save] update global error:', error);
      return res.status(500).json({ error: error.message });
    }
    console.log('[notes/save] update global ok, rows:', updated?.length ?? 0, 'id:', id);
    if (!updated || updated.length === 0) {
      return res.status(404).json({
        error: 'Audit introuvable ou aucune ligne modifiée.',
        debug: { id },
      });
    }
  } else {
    const column = SECTION_TO_COLUMN[section];
    // jsonb_set côté SDK : on fetch le JSON courant, on modifie, on update.
    const { data: row, error: fetchErr } = await supabase
      .from('audits')
      .select(`id, ${column}`)
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) {
      console.error('[notes/save] fetch error:', fetchErr);
      return res.status(500).json({ error: fetchErr.message });
    }
    if (!row) return res.status(404).json({ error: 'Audit introuvable.' });

    const current = (row as unknown as Record<string, unknown>)[column];
    const next: Record<string, unknown> =
      current && typeof current === 'object' && !Array.isArray(current)
        ? { ...(current as Record<string, unknown>) }
        : {};
    next.reviewer_notes = content;

    const { error: updErr } = await supabase
      .from('audits')
      .update({ [column]: next })
      .eq('id', id);
    if (updErr) {
      console.error('[notes/save] update section error:', updErr);
      return res.status(500).json({ error: updErr.message });
    }
  }

  // Event 'note_saved' — best-effort, on ne plante pas la réponse si l'insert rate
  void supabase
    .from('audit_review_events')
    .insert({
      audit_id: id,
      event_type: 'note_saved',
      actor_email: auth.email,
      payload: { section, length: content.length },
    })
    .then(({ error }) => {
      if (error) console.error('[notes/save] insert event:', error);
    });

  return res.status(200).json({ ok: true, section, length: content.length });
}
