// Skill 1 — Context Builder
// Reçoit intake_data, produit un contexte structuré pour les 4 skills suivants.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { parseJsonBody } from '../_supabaseAdmin';
import { runSkill } from '../../src/lib/ai/runSkill';
import {
  skill1InputSchema,
  skill1OutputSchema,
} from '../../src/lib/ai/schemas';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody<{ intakeData?: unknown }>(req.body);
  if (!body || !body.intakeData || typeof body.intakeData !== 'object') {
    return res.status(400).json({ error: 'intakeData requis.' });
  }

  try {
    const result = await runSkill({
      skillId: 1,
      input: { intake_data: body.intakeData as Record<string, unknown> },
      inputSchema: skill1InputSchema,
      outputSchema: skill1OutputSchema,
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
    console.error('[skill-1] error:', err);
    return res.status(500).json({ error: message });
  }
}
