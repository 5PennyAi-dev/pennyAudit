import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseJsonBody } from '../_supabaseAdmin';
import { runSkill } from '../../src/lib/ai/runSkill';
import {
  skill2InputSchema,
  skill2OutputSchema,
} from '../../src/lib/ai/schemas';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody<unknown>(req.body);
  if (!body) return res.status(400).json({ error: 'Corps JSON invalide.' });

  try {
    const result = await runSkill({
      skillId: 2,
      input: body as Parameters<typeof skill2InputSchema.parse>[0],
      inputSchema: skill2InputSchema,
      outputSchema: skill2OutputSchema,
    });
    return res.status(200).json({
      output: result.output,
      tokensUsed: result.tokensUsed,
      durationMs: result.durationMs,
      model: result.model,
      attempts: result.attempts,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[skill-2] error:', err);
    return res.status(500).json({ error: message });
  }
}
