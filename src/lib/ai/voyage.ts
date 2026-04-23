// Wrapper Voyage AI pour générer des embeddings (côté serveur).
// Modèle : voyage-3, dimensions 1024 (aligné sur la colonne patterns.embedding).

import { VOYAGE_DIMS, VOYAGE_MODEL } from './config';

const VOYAGE_ENDPOINT = 'https://api.voyageai.com/v1/embeddings';

export class VoyageError extends Error {
  readonly status?: number;
  readonly body?: string;
  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = 'VoyageError';
    this.status = status;
    this.body = body;
  }
}

type InputType = 'query' | 'document';

async function callVoyage(
  text: string,
  inputType: InputType,
  apiKey: string,
): Promise<number[]> {
  const res = await fetch(VOYAGE_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [text],
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new VoyageError(`Voyage API ${res.status}`, res.status, body);
  }

  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const embedding = json.data[0]?.embedding;
  if (!embedding) throw new VoyageError('Voyage: embedding manquant dans la réponse.');
  if (embedding.length !== VOYAGE_DIMS) {
    throw new VoyageError(
      `Voyage: dimension inattendue ${embedding.length} (attendu ${VOYAGE_DIMS}).`,
    );
  }
  return embedding;
}

export interface GenerateEmbeddingOptions {
  inputType?: InputType;
}

// Génère un embedding avec 1 retry en cas d'erreur réseau/5xx.
export async function generateEmbedding(
  text: string,
  options: GenerateEmbeddingOptions = {},
): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new VoyageError('VOYAGE_API_KEY manquant côté serveur.');

  const inputType = options.inputType ?? 'query';
  const trimmed = text.trim();
  if (!trimmed) throw new VoyageError('Texte vide — impossible de générer un embedding.');

  try {
    return await callVoyage(trimmed, inputType, apiKey);
  } catch (err) {
    const isRetriable =
      err instanceof VoyageError &&
      (err.status === undefined || err.status >= 500 || err.status === 429);
    if (!isRetriable) throw err;
    console.warn('[generateEmbedding] retry après erreur:', (err as Error).message);
    return callVoyage(trimmed, inputType, apiKey);
  }
}
