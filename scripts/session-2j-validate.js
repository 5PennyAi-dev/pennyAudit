/**
 * Validation post-seed Session 2J : compare l'état DB du pattern 004
 * avec la baseline pré-refactoring.
 */
import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const baseline = JSON.parse(
  await fs.readFile('docs/notes/SESSION_2J_BASELINE.json', 'utf8'),
);

const { data: pattern, error } = await supabase
  .from('patterns')
  .select('id, content, embedding_source, updated_at')
  .eq('id', 'ai-marketing-content-creation')
  .single();

if (error) {
  console.error('Erreur fetch:', error);
  process.exit(1);
}

const templates = pattern.content?.implementation_templates || [];
const current = {
  id: pattern.id,
  source_chars: pattern.embedding_source.length,
  nb_templates: templates.length,
  template_ids: templates.map(t => t.id),
  updated_at: pattern.updated_at,
};

console.log('=== BASELINE (pré-refactoring) ===');
console.log(JSON.stringify(baseline, null, 2));
console.log('\n=== CURRENT (post-refactoring) ===');
console.log(JSON.stringify(current, null, 2));

console.log('\n=== COMPARAISON ===');
const checks = [
  ['source_chars', baseline.source_chars === current.source_chars],
  ['nb_templates', baseline.nb_templates === current.nb_templates],
  [
    'template_ids (set, ignoring order)',
    JSON.stringify([...baseline.template_ids].sort()) ===
      JSON.stringify([...current.template_ids].sort()),
  ],
  [
    'template_ids (exact order)',
    JSON.stringify(baseline.template_ids) === JSON.stringify(current.template_ids),
  ],
];

for (const [label, ok] of checks) {
  console.log(`  ${ok ? '✓' : '✗'} ${label}`);
}

const orderChanged =
  JSON.stringify(baseline.template_ids) !== JSON.stringify(current.template_ids);
if (orderChanged) {
  console.log('\n  ℹ️  Ordre des sous-templates changé (tri alphabétique du nouveau format) :');
  console.log(`     baseline : ${baseline.template_ids.join(' → ')}`);
  console.log(`     current  : ${current.template_ids.join(' → ')}`);
  console.log('     Aucun impact attendu sur le matching Skill 5 (basé triggers, pas ordre).');
}

// Vérification que les autres patterns ont aussi été re-seedés (sanity check)
const { data: allPatterns, error: e2 } = await supabase
  .from('patterns')
  .select('id, updated_at')
  .order('updated_at', { ascending: false });

if (!e2) {
  console.log(`\n=== Tous les patterns (${allPatterns.length}) ===`);
  for (const p of allPatterns) {
    console.log(`  ${p.id}  →  ${p.updated_at}`);
  }
}

const allOk = checks.slice(0, 3).every(([, ok]) => ok);
process.exit(allOk ? 0 : 1);
