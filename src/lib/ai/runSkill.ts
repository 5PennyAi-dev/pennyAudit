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
  const { model, maxTokens } = SKILL_MODEL_CONFIG[skillId];

  const started = Date.now();
  const claudeResult = await callClaudeJSON({
    systemPrompt,
    userInput: JSON.stringify(parsedInput.data),
    model,
    maxTokens,
  });
  const durationMs = Date.now() - started;

  // Validation de l'output — sécurité anti-hallucination de schéma.
  const parsedOutput = outputSchema.safeParse(claudeResult.parsedJson);
  if (!parsedOutput.success) {
    throw new Error(
      `Skill ${skillId}: output Claude ne respecte pas le schéma — ${parsedOutput.error.issues
        .slice(0, 5)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  }

  return {
    output: parsedOutput.data,
    tokensUsed: claudeResult.tokensUsed,
    durationMs,
    attempts: claudeResult.attempts,
    model: claudeResult.model,
  };
}
