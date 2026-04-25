// Wrapper autour de l'API Anthropic pour les appels JSON strict des skills.
// Côté serveur uniquement (lit ANTHROPIC_API_KEY depuis process.env).

import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_MODEL_DEFAULT, type SkillTool } from './config';

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
  // Outils server-side Anthropic (ex. web_search_20250305 pour Skill 1).
  // Quand fournis, les content blocks de type non-text (server_tool_use,
  // web_search_tool_result) sont filtrés à l'extraction du JSON final.
  tools?: SkillTool[];
  // Note : Claude Opus 4.7+ n'accepte plus temperature/top_p/top_k.
  // Toute valeur non-défaut renvoie 400. On ne les passe donc plus du tout.
  // Voir : https://platform.claude.com/docs/en/about-claude/models/whats-new-claude-4-7
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
  // Quand un tool serveur (ex. web_search) est utilisé, la réponse contient
  // plusieurs text blocks entrelacés avec les server_tool_use et
  // web_search_tool_result : un texte de raisonnement avant chaque recherche,
  // puis le text block final qui porte le JSON. On prend uniquement le
  // dernier text block. Sans tool, il n'y en a qu'un de toute façon.
  const textBlocks = content.filter(
    (block): block is Anthropic.Messages.TextBlock => block.type === 'text',
  );
  if (textBlocks.length === 0) return '';
  return textBlocks[textBlocks.length - 1].text;
}

// Les skills sont instruits de ne pas utiliser de fences ni de prose
// autour du JSON, mais avec web_search activé Claude introduit parfois
// son JSON par une phrase ("Voici le JSON final :"). On tolère :
// - les fences ```json ... ```
// - du texte avant/après le JSON, en extrayant le premier `{` jusqu'au
//   dernier `}` correspondant.
function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
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
    // Pas de paramètre temperature : Opus 4.7 le refuse (400). On se contente
    // de retenter une fois avec exactement les mêmes paramètres.
    const response = await client.messages.create({
      model,
      max_tokens: params.maxTokens,
      system: params.systemPrompt,
      messages: [{ role: 'user', content: params.userInput }],
      ...(params.tools && params.tools.length > 0
        ? { tools: params.tools as unknown as Anthropic.Messages.ToolUnion[] }
        : {}),
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
          (attempt === 1 ? 'Retrying once.' : 'Giving up.'),
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
