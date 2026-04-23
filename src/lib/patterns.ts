import { supabase } from './supabase';

export interface MatchedPattern {
  id: string;
  title_fr: string;
  category: string | null;
  content: Record<string, unknown>;
  similarity: number;
}

export interface SearchPatternsOptions {
  industry?: string;
  size?: string;
  limit?: number;
  threshold?: number;
}

/**
 * Appelle /api/embed pour obtenir un embedding de query, puis exécute
 * la fonction Postgres match_patterns pour retourner les patterns les
 * plus proches par similarité cosinus.
 */
export async function searchPatterns(
  query: string,
  options: SearchPatternsOptions = {},
): Promise<MatchedPattern[]> {
  const { industry, size, limit = 10, threshold = 0.3 } = options;

  // 1. Embedding de la query via /api/embed (serverless Vercel en prod,
  //    middleware Vite en dev)
  const embedRes = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  if (!embedRes.ok) {
    const body = await embedRes.text();
    throw new Error(
      `Embedding failed (${embedRes.status}): ${body.slice(0, 200)}`,
    );
  }

  const { embedding } = (await embedRes.json()) as { embedding: number[] };

  // 2. Recherche vectorielle via RPC Supabase
  const { data, error } = await supabase.rpc('match_patterns', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
    filter_industry: industry ?? null,
    filter_size: size ?? null,
  });

  if (error) {
    throw new Error(`match_patterns RPC failed: ${error.message}`);
  }

  return (data ?? []) as MatchedPattern[];
}
