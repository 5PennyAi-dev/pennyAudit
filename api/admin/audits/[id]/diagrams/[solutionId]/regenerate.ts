// POST /api/admin/audits/[id]/diagrams/[solutionId]/regenerate
//
// Régénère un diagramme individuel via Gemini, écrase le fichier dans
// Storage au même path, met à jour audits.diagrams_metadata pour cette
// solution, et retourne une signed URL fraîche pour cache-bust côté UI.
//
// Body :
//   { "prompt": "string (optionnel)" }
// Si prompt absent, utilise diagrams_metadata[solutionId].prompt_used
// (= régénération sans édition, après un échec par exemple).
//
// Réponse :
//   200 { ok: true, status: 'ok', signed_url, generated_at, prompt_used }
//   200 { ok: false, status: 'failed', error, generated_at }
//   404 si audit ou solution_id introuvable
//   409 si audit n'a pas de diagrams_metadata

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, parseJsonBody } from '../../../../../_supabaseAdmin';
import { requireAdmin } from '../../../../../_adminAuth';
import {
  buildDiagramStoragePath,
  getDiagramSignedUrl,
  uploadDiagram,
} from '../../../../../_storageAuditDiagrams';
import { generateDiagram } from '../../../../../../src/lib/diagrams/gemini-client';

// Style guide path : résolu depuis ce fichier compilé. Identique à la
// résolution dans diagram-pipeline.ts pour rester cohérent.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const STYLE_GUIDE_PATH = path.resolve(
  HERE,
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  'docs',
  'references',
  'style-guide-v1.png',
);

interface DiagramMetadataEntry {
  title: string;
  storage_path?: string;
  prompt_used: string;
  generated_at: string;
  status: 'ok' | 'failed';
  failure_reason?: string;
}

interface RegenerateBody {
  prompt?: string;
}

export const config = {
  // Une régénération peut prendre 30-90s avec Gemini Thinking 2K.
  maxDuration: 120,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = requireAdmin(req);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

  const id = String(Array.isArray(req.query.id) ? req.query.id[0] : req.query.id ?? '');
  const solutionId = String(
    Array.isArray(req.query.solutionId) ? req.query.solutionId[0] : req.query.solutionId ?? '',
  );

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return res.status(400).json({ error: "ID d'audit invalide." });
  }
  if (!solutionId || !/^[a-z0-9-]+$/i.test(solutionId)) {
    return res.status(400).json({ error: 'solution_id invalide.' });
  }

  const body = parseJsonBody<RegenerateBody>(req.body) ?? {};
  const editedPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : null;

  const supabase = getSupabaseAdmin();

  const { data: audit, error: fetchErr } = await supabase
    .from('audits')
    .select('id, diagrams_metadata')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) {
    console.error('[diagrams/regenerate] fetch error:', fetchErr);
    return res.status(500).json({ error: fetchErr.message });
  }
  if (!audit) return res.status(404).json({ error: 'Audit introuvable.' });

  const metadata = (audit.diagrams_metadata ?? {}) as Record<string, DiagramMetadataEntry>;
  const existing = metadata[solutionId];
  if (!existing) {
    return res.status(404).json({
      error: `Aucune entrée diagrams_metadata pour ${solutionId}.`,
    });
  }

  // Prompt à utiliser : édité si fourni et non vide, sinon le précédent.
  const promptToUse = editedPrompt && editedPrompt.length > 0 ? editedPrompt : existing.prompt_used;
  if (!promptToUse) {
    return res.status(409).json({
      error: 'Aucun prompt disponible (ni édité ni précédemment stocké).',
    });
  }

  console.log(
    `[diagrams/regenerate] audit=${id} solution=${solutionId} edited=${editedPrompt ? 'yes' : 'no'}`,
  );

  const result = await generateDiagram({
    prompt: promptToUse,
    referenceImagePath: STYLE_GUIDE_PATH,
    aspectRatio: '16:9',
    resolution: '2K',
  });

  const generatedAt = new Date().toISOString();

  if (!result.success) {
    const updatedEntry: DiagramMetadataEntry = {
      ...existing,
      prompt_used: promptToUse,
      generated_at: generatedAt,
      status: 'failed',
      failure_reason: result.error,
    };
    delete updatedEntry.storage_path;
    const newMetadata = { ...metadata, [solutionId]: updatedEntry };
    await supabase.from('audits').update({ diagrams_metadata: newMetadata }).eq('id', id);
    void supabase.from('audit_review_events').insert({
      audit_id: id,
      event_type: 'diagram_failed',
      actor_email: auth.email,
      payload: { solution_id: solutionId, error: result.error, regenerated: true },
    });
    return res.status(200).json({
      ok: false,
      status: 'failed',
      error: result.error,
      generated_at: generatedAt,
    });
  }

  // Succès : upload (écrase l'ancien blob au même path)
  let storagePath: string;
  try {
    storagePath = buildDiagramStoragePath(id, solutionId, result.mimeType);
    await uploadDiagram(storagePath, result.imageBuffer, result.mimeType);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur upload Storage.';
    console.error('[diagrams/regenerate] upload error:', err);
    const updatedEntry: DiagramMetadataEntry = {
      ...existing,
      prompt_used: promptToUse,
      generated_at: generatedAt,
      status: 'failed',
      failure_reason: `Upload Storage : ${msg}`,
    };
    delete updatedEntry.storage_path;
    const newMetadata = { ...metadata, [solutionId]: updatedEntry };
    await supabase.from('audits').update({ diagrams_metadata: newMetadata }).eq('id', id);
    return res.status(500).json({ error: msg });
  }

  const updatedEntry: DiagramMetadataEntry = {
    title: existing.title,
    storage_path: storagePath,
    prompt_used: promptToUse,
    generated_at: generatedAt,
    status: 'ok',
  };
  const newMetadata = { ...metadata, [solutionId]: updatedEntry };
  const { error: updErr } = await supabase
    .from('audits')
    .update({ diagrams_metadata: newMetadata })
    .eq('id', id);
  if (updErr) {
    console.error('[diagrams/regenerate] metadata update error:', updErr);
    return res.status(500).json({ error: updErr.message });
  }

  void supabase.from('audit_review_events').insert({
    audit_id: id,
    event_type: 'diagram_regenerated',
    actor_email: auth.email,
    payload: {
      solution_id: solutionId,
      storage_path: storagePath,
      size_bytes: result.imageBuffer.length,
      prompt_edited: !!editedPrompt,
    },
  });

  let signedUrl: string;
  try {
    signedUrl = await getDiagramSignedUrl(storagePath);
  } catch (err) {
    // L'image existe en Storage, juste l'URL signée a foiré — l'UI
    // peut recharger via /get pour récupérer une nouvelle URL.
    console.warn('[diagrams/regenerate] signed url error:', err);
    signedUrl = '';
  }

  return res.status(200).json({
    ok: true,
    status: 'ok',
    signed_url: signedUrl,
    generated_at: generatedAt,
    storage_path: storagePath,
    prompt_used: promptToUse,
  });
}
