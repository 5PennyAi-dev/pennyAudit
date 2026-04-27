/**
 * Capture des baselines DB pour Session 2J (one-shot, à supprimer après).
 */
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Variables Supabase manquantes');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 1. Pattern 004 baseline
const { data: pattern, error: pErr } = await supabase
  .from('patterns')
  .select('id, content, embedding_source, updated_at')
  .eq('id', 'ai-marketing-content-creation')
  .single();

if (pErr) {
  console.error('Erreur fetch pattern:', pErr);
  process.exit(1);
}

const templates = pattern.content?.implementation_templates || [];
const patternBaseline = {
  id: pattern.id,
  source_chars: pattern.embedding_source ? pattern.embedding_source.length : null,
  nb_templates: templates.length,
  template_ids: templates.map(t => t.id),
  updated_at: pattern.updated_at,
};

await fs.writeFile(
  'docs/notes/SESSION_2J_BASELINE.json',
  JSON.stringify(patternBaseline, null, 2),
  'utf-8'
);
console.log('OK: docs/notes/SESSION_2J_BASELINE.json');
console.log(JSON.stringify(patternBaseline, null, 2));

// 2. Marie-Pier baseline
const { data: audits, error: aErr } = await supabase
  .from('audits')
  .select('id, status, created_at, updated_at, intake_data, skill_5_output')
  .ilike('intake_data->>business_name', '%Marie-Pier%')
  .order('created_at', { ascending: false })
  .limit(3);

if (aErr) {
  console.error('Erreur fetch audits:', aErr);
  process.exit(1);
}

const mpBaseline = {
  candidates: audits.map(a => ({
    id: a.id,
    status: a.status,
    business_name: a.intake_data?.business_name,
    created_at: a.created_at,
    updated_at: a.updated_at,
  })),
  most_recent_id: audits[0]?.id || null,
  most_recent_skill_5_output: audits[0]?.skill_5_output || null,
  most_recent_architectures: audits[0]?.skill_5_output?.architectures_de_la_solution || null,
};

await fs.writeFile(
  'docs/notes/SESSION_2J_BASELINE_MARIE_PIER.json',
  JSON.stringify(mpBaseline, null, 2),
  'utf-8'
);
console.log('OK: docs/notes/SESSION_2J_BASELINE_MARIE_PIER.json');
console.log('Marie-Pier candidates:', mpBaseline.candidates);
console.log('Architectures count:', mpBaseline.most_recent_architectures?.length ?? 'null');
