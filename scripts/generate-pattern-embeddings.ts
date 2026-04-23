// Script one-off : (re)génère les embeddings Voyage-3 des patterns
// existants en DB. À lancer une fois après ajout/édition de patterns.
//
// Usage : npm run embeddings:generate
//
// Le texte embedder est construit à partir de :
//   summary_long_fr + pain_point_fr + target_industries + tags
// pour matcher ce que le client écrit dans time_consuming_tasks.

import fs from 'node:fs/promises';
import path from 'node:path';
import 'dotenv/config';
import yaml from 'js-yaml';
import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from '../src/lib/ai/voyage';

const PATTERNS_DIR = path.resolve('patterns');

interface PatternYaml {
  id: string;
  title_fr?: string;
  summary_long_fr?: string;
  summary_short_fr?: string;
  pain_point_fr?: string;
  target_industries?: string[];
  target_business_sizes?: string[];
  tags?: string[];
  category?: string;
  version?: string | number;
}

function buildEmbeddingText(p: PatternYaml): string {
  const parts: string[] = [];
  if (p.title_fr) parts.push(p.title_fr);
  if (p.summary_long_fr) parts.push(p.summary_long_fr);
  else if (p.summary_short_fr) parts.push(p.summary_short_fr);
  if (p.pain_point_fr) parts.push(p.pain_point_fr);
  if (p.target_industries?.length) {
    parts.push(`Secteurs ciblés : ${p.target_industries.join(', ')}.`);
  }
  if (p.tags?.length) {
    parts.push(`Mots-clés : ${p.tags.join(', ')}.`);
  }
  return parts.join('\n\n');
}

async function loadPatternsFromDisk(): Promise<PatternYaml[]> {
  const files = await fs.readdir(PATTERNS_DIR);
  const yamls = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  const patterns: PatternYaml[] = [];
  for (const file of yamls) {
    const content = await fs.readFile(path.join(PATTERNS_DIR, file), 'utf-8');
    const parsed = yaml.load(content) as PatternYaml;
    if (!parsed?.id) {
      console.warn(`[embeddings] ${file} ignoré (pas de id).`);
      continue;
    }
    patterns.push(parsed);
  }
  return patterns;
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.',
    );
  }
  if (!process.env.VOYAGE_API_KEY) {
    throw new Error('VOYAGE_API_KEY requis dans .env.');
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const patterns = await loadPatternsFromDisk();
  console.log(`[embeddings] ${patterns.length} patterns trouvés.`);

  for (const pattern of patterns) {
    const text = buildEmbeddingText(pattern);
    if (!text) {
      console.warn(`[embeddings] ${pattern.id} : texte vide, skip.`);
      continue;
    }

    const started = Date.now();
    const embedding = await generateEmbedding(text, { inputType: 'document' });
    const ms = Date.now() - started;

    const { error } = await supabase
      .from('patterns')
      .update({
        embedding,
        embedding_source: text,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pattern.id);

    if (error) {
      console.error(`[embeddings] ${pattern.id} — UPDATE failed:`, error.message);
    } else {
      console.log(
        `[embeddings] ${pattern.id} OK (${embedding.length} dims, ${ms}ms)`,
      );
    }
  }

  console.log('[embeddings] Terminé.');
}

main().catch((err) => {
  console.error('[embeddings] ERREUR FATALE:', err);
  process.exit(1);
});
