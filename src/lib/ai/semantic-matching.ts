// Matching sémantique client ↔ patterns via Voyage-3 + pgvector.
// Côté serveur uniquement (utilise la service role Supabase + VOYAGE_API_KEY).

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding } from './voyage';

export interface TopKPattern {
  patternId: string;
  content: unknown;
  titleFr: string | null;
  category: string | null;
  similarityScore: number;
}

export interface FindTopKPatternsOptions {
  supabase: SupabaseClient;
  queryText: string;
  k?: number;
  matchThreshold?: number;
}

// K dynamique : ne jamais demander plus de patterns qu'il n'en existe
// (évite les trous dans le résultat si la librairie est petite).
async function getPatternsCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('patterns')
    .select('id', { count: 'exact', head: true })
    .not('embedding', 'is', null);
  if (error) throw new Error(`patterns count failed: ${error.message}`);
  return count ?? 0;
}

export async function findTopKPatterns(
  options: FindTopKPatternsOptions,
): Promise<TopKPattern[]> {
  const { supabase, queryText } = options;
  const k = options.k ?? 12;
  const matchThreshold = options.matchThreshold ?? 0.0;

  const trimmed = queryText.trim();
  if (!trimmed) throw new Error('queryText vide.');

  const availablePatterns = await getPatternsCount(supabase);
  if (availablePatterns === 0) return [];

  const actualK = Math.min(k, availablePatterns);

  const embedding = await generateEmbedding(trimmed, { inputType: 'query' });

  const { data, error } = await supabase.rpc('match_patterns_voyage3', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: actualK,
  });

  if (error) throw new Error(`match_patterns_voyage3 failed: ${error.message}`);

  return ((data ?? []) as Array<{
    id: string;
    content: unknown;
    title_fr: string | null;
    category: string | null;
    similarity: number;
  }>).map((row) => ({
    patternId: row.id,
    content: row.content,
    titleFr: row.title_fr,
    category: row.category,
    similarityScore: row.similarity,
  }));
}

// Construit le texte de query à partir de intake_data + output Skill 1.
// Choix de champs : industry + time_consuming_tasks + automation_wish
// représentent le mieux « ce que le client veut résoudre ».
export function buildMatchingQueryText(intake: {
  industry?: string;
  industry_other?: string;
  time_consuming_tasks?: string;
  automation_wish?: string;
}): string {
  const parts: string[] = [];
  const industry =
    intake.industry === 'autre' ? intake.industry_other : intake.industry;
  if (industry) parts.push(`Secteur : ${industry}.`);
  if (intake.time_consuming_tasks) parts.push(intake.time_consuming_tasks);
  if (intake.automation_wish)
    parts.push(`À automatiser en priorité : ${intake.automation_wish}`);
  return parts.join('\n\n');
}
