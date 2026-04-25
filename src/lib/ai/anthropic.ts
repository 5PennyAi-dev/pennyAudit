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
  // Concatène tous les text blocks. Avec un tool serveur (ex. web_search),
  // Claude entrelace text blocks de raisonnement et server_tool_use. Le
  // JSON final peut être splitté sur plusieurs text blocks (notamment si
  // Claude reprend la rédaction après une recherche). On filtre les blocs
  // server_tool_use / web_search_tool_result et on garde tout le texte.
  return content
    .filter(
      (block): block is Anthropic.Messages.TextBlock => block.type === 'text',
    )
    .map((block) => block.text)
    .join('\n');
}

// Extrait l'objet JSON top-level depuis le texte brut produit par Claude.
// Avec web_search activé, le texte contient du raisonnement intercalé
// (introductions, énumérations de sources). On parcourt en gérant les
// strings (et leurs échappements) pour identifier les frontières d'un
// objet `{...}` de niveau racine. On retourne le DERNIER objet trouvé,
// qui est typiquement le JSON final demandé.
function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const text = fenceMatch ? fenceMatch[1].trim() : trimmed;

  let inString = false;
  let escape = false;
  let depth = 0;
  let start = -1;
  let lastStart = -1;
  let lastEnd = -1;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        lastStart = start;
        lastEnd = i;
        start = -1;
      }
    }
  }

  if (lastStart !== -1 && lastEnd !== -1) {
    return text.slice(lastStart, lastEnd + 1);
  }
  return text;
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
      const cleaned = extractJsonObject(raw);
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
