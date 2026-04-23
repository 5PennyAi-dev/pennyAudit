// Wrapper autour de l'API Anthropic pour les appels JSON strict des skills.
// Côté serveur uniquement (lit ANTHROPIC_API_KEY depuis process.env).

import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_MODEL_DEFAULT } from './config';

export class InvalidJsonResponseError extends Error {
  readonly rawResponse: string;
  readonly attempts: number;
  constructor(message: string, rawResponse: string, attempts: number) {
    super(message);
    this.name = 'InvalidJsonResponseError';
    this.rawResponse = rawResponse;
    this.attempts = attempts;
  }
}

export interface CallClaudeJsonParams {
  systemPrompt: string;
  userInput: string;
  model?: string;
  maxTokens: number;
  temperature: number;
}

export interface CallClaudeJsonResult<T = unknown> {
  parsedJson: T;
  rawResponse: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
  attempts: number;
}

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY manquant côté serveur.');
  }
  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

function extractTextFromResponse(
  content: Anthropic.Messages.ContentBlock[],
): string {
  return content
    .filter((block): block is Anthropic.Messages.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

// Les skills sont instruits de ne pas utiliser de fences, mais on tolère
// ```json ... ``` au cas où.
function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export async function callClaudeJSON<T = unknown>(
  params: CallClaudeJsonParams,
): Promise<CallClaudeJsonResult<T>> {
  const client = getClient();
  const model = params.model ?? ANTHROPIC_MODEL_DEFAULT;

  let attempt = 0;
  let lastRaw = '';
  let lastError: unknown = null;

  for (attempt = 1; attempt <= 2; attempt++) {
    // 2e tentative : baisser la température pour plus de déterminisme.
    const temperature =
      attempt === 1
        ? params.temperature
        : Math.max(0, params.temperature - 0.1);

    const response = await client.messages.create({
      model,
      max_tokens: params.maxTokens,
      temperature,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userInput }],
    });

    const raw = extractTextFromResponse(response.content);
    lastRaw = raw;

    try {
      const cleaned = stripJsonFences(raw);
      const parsed = JSON.parse(cleaned) as T;
      return {
        parsedJson: parsed,
        rawResponse: raw,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          total: response.usage.input_tokens + response.usage.output_tokens,
        },
        model,
        attempts: attempt,
      };
    } catch (err) {
      lastError = err;
      console.warn(
        `[callClaudeJSON] attempt ${attempt} failed to parse JSON (${(err as Error).message}). ` +
          (attempt === 1 ? 'Retrying with lower temperature.' : 'Giving up.'),
      );
    }
  }

  throw new InvalidJsonResponseError(
    `Claude n'a pas retourné de JSON valide après ${attempt - 1} tentatives: ${
      (lastError as Error)?.message ?? 'unknown'
    }`,
    lastRaw,
    attempt - 1,
  );
}
