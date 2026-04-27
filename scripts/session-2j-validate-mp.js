import fs from 'fs/promises';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const auditId = '5737176f-3048-47ee-bfda-a7b607485b34';

const { data: audit, error } = await supabase
  .from('audits')
  .select('id, status, updated_at, skill_5_output')
  .eq('id', auditId)
  .single();

if (error) {
  console.error(error);
  process.exit(1);
}

const archs = audit.skill_5_output?.architectures_de_la_solution || [];
console.log(`Audit ${auditId}`);
console.log(`Status: ${audit.status}`);
console.log(`Updated: ${audit.updated_at}`);
console.log(`Architectures count: ${archs.length}`);
console.log('');

for (const a of archs) {
  console.log(`- pattern_id: ${a.pattern_id || a.solution_id || '(?)'}`);
  console.log(`  sub_template_id: ${a.sub_template_id || '(none)'}`);
  console.log(`  title: ${a.title || a.opportunity_title || '(?)'}`);
  console.log('');
}

// Save current state
const baseline = JSON.parse(
  await fs.readFile('docs/notes/SESSION_2J_BASELINE_MARIE_PIER.json', 'utf8'),
);
const baselineArchs = baseline.most_recent_architectures || [];
console.log('=== BASELINE architectures ===');
for (const a of baselineArchs) {
  console.log(`- pattern: ${a.pattern_id || a.solution_id} | sub: ${a.sub_template_id || '(none)'} | title: ${a.title || a.opportunity_title || '(?)'}`);
}

await fs.writeFile(
  'docs/notes/SESSION_2J_POSTREFACTO_MARIE_PIER.json',
  JSON.stringify({
    auditId, status: audit.status, updated_at: audit.updated_at,
    architectures: archs,
  }, null, 2),
);
console.log('\nSaved → docs/notes/SESSION_2J_POSTREFACTO_MARIE_PIER.json');
