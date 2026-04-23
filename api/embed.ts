import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-expect-error — module JS sans types (Vercel ignore le préfixe _)
import { embedQuery } from './_embedCore.mjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'VOYAGE_API_KEY non configurée côté serveur.' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body;
  const query = body?.query;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res
      .status(400)
      .json({ error: 'Le champ `query` (string non vide) est requis.' });
  }

  try {
    const embedding = await embedQuery(query.trim(), apiKey);
    return res.status(200).json({ embedding });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; body?: string };
    return res.status(e.status ?? 500).json({
      error: e.message ?? 'Erreur embedding',
      detail: e.body,
    });
  }
}

function safeJson(input: string): unknown {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}
