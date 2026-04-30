// Helper générique : exécute un skill du pipeline.
// Validation input/output via Zod, appel Claude, mesure durée et tokens.

import type { ZodType } from 'zod';
import { callClaudeJSON } from './anthropic';
import { SKILL_MODEL_CONFIG, type SkillId } from './config';
import { loadSkillPrompt } from '../../prompts/loader';

export interface RunSkillResult<TOutput> {
  output: TOutput;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  durationMs: number;
  attempts: number;
  model: string;
}

export interface RunSkillOptions<TInput, TOutput> {
  skillId: SkillId;
  input: TInput;
  inputSchema: ZodType<TInput>;
  outputSchema: ZodType<TOutput>;
}

export async function runSkill<TInput, TOutput>(
  options: RunSkillOptions<TInput, TOutput>,
): Promise<RunSkillResult<TOutput>> {
  const { skillId, input, inputSchema, outputSchema } = options;

  console.log('[runSkill] START skill', skillId);

  // Validation de l'input — protège contre un upstream corrompu.
  const parsedInput = inputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new Error(
      `Skill ${skillId}: input invalide — ${parsedInput.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }

  const systemPrompt = loadSkillPrompt(skillId);
  const { model, maxTokens, tools } = SKILL_MODEL_CONFIG[skillId];

  const started = Date.now();
  const claudeResult = await callClaudeJSON({
    systemPrompt,
    userInput: JSON.stringify(parsedInput.data),
    model,
    maxTokens,
    tools,
  });
  const durationMs = Date.now() - started;

  // Activable via DEBUG_CLAUDE_RESPONSES=true pour diagnostiquer les
  // dérives de schéma. Off par défaut pour ne pas polluer les logs prod.
  if (process.env.DEBUG_CLAUDE_RESPONSES === 'true') {
    console.log(`[DEBUG] Raw Claude response for skill ${skillId}`);
    console.log(claudeResult.rawResponse);
  }

  // Validation de l'output — sécurité anti-hallucination de schéma.
  const parsedOutput = outputSchema.safeParse(claudeResult.parsedJson);
  if (!parsedOutput.success) {
    // Dump systématique du payload Claude qui a échoué la validation,
    // dans /tmp ou cwd, pour que la valeur fautive soit récupérable
    // même quand le message Zod est tronqué (Invalid option sans
    // mention de la valeur reçue).
    try {
      const fs = await import('fs/promises');
      const dumpPath = `failed-skill-${skillId}-${Date.now()}.json`;
      await fs.writeFile(
        dumpPath,
        JSON.stringify(claudeResult.parsedJson, null, 2),
        'utf8',
      );
      console.error(`[runSkill] Payload fautif dumpé → ${dumpPath}`);
    } catch {
      // best-effort
    }

    const detail = parsedOutput.error.issues
      .slice(0, 5)
      .map((i) => {
        // Zod v4 expose `received` sur les invalid_value/invalid_type
        const received =
          'received' in i && i.received !== undefined
            ? ` (reçu : ${JSON.stringify(i.received)})`
            : '';
        return `${i.path.join('.')}: ${i.message}${received}`;
      })
      .join('; ');
    throw new Error(
      `Skill ${skillId}: output Claude ne respecte pas le schéma — ${detail}`,
    );
  }

  const output = parsedOutput.data;
  console.log(
    '[runSkill] END skill',
    skillId,
    'output keys:',
    output && typeof output === 'object'
      ? Object.keys(output as Record<string, unknown>)
      : typeof output,
  );

  return {
    output,
    tokensUsed: claudeResult.tokensUsed,
    durationMs,
    attempts: claudeResult.attempts,
    model: claudeResult.model,
  };
}
