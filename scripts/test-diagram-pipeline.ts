// Script one-off : exécute le diagram-pipeline complet sur un audit
// donné (par défaut : le premier audit en pending_review). Utile pour
// valider Skill 6 + génération Gemini + upload Storage + persistence
// avant d'intégrer au pipeline d'audit (Étape 5).
//
// Usage :
//   npx tsx scripts/test-diagram-pipeline.ts                # pending_review le plus récent
//   npx tsx scripts/test-diagram-pipeline.ts <audit_id>     # cible précis
//
// Ce script utilise les helpers Storage de api/_storageAuditDiagrams.ts.
// Il attend que :
//   - GEMINI_API_KEY est défini dans .env
//   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY sont définis
//   - La migration sql/migrations/2026-04-26_diagrams_storage.sql est
//     appliquée (bucket + colonne diagrams_metadata)
//   - L'audit cible a skill_1/2/5_output non null

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  buildDiagramStoragePath,
  uploadDiagram,
} from '../api/_storageAuditDiagrams';
import { generateAuditDiagrams } from '../src/lib/diagrams/diagram-pipeline';

async function main() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis dans .env',
    );
  }
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY requis dans .env');
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let auditId = process.argv[2];

  if (!auditId) {
    const { data, error } = await supabase
      .from('audits')
      .select('id, status, intake_data, created_at')
      .in('status', ['pending_review', 'delivered'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('Aucun audit en pending_review ou delivered trouvé.');
    }
    auditId = data[0].id;
    const intake = data[0].intake_data as { contact?: { first_name?: string } } | null;
    const who = intake?.contact?.first_name ?? '(?)';
    console.log(`[test-diagram-pipeline] target: ${auditId} (${data[0].status}, ${who})`);
  } else {
    console.log(`[test-diagram-pipeline] target: ${auditId} (forced via CLI)`);
  }

  const started = Date.now();
  const result = await generateAuditDiagrams({
    auditId,
    supabase,
    storage: {
      buildStoragePath: buildDiagramStoragePath,
      upload: uploadDiagram,
    },
  });
  const totalMs = Date.now() - started;

  console.log('');
  console.log('===== résumé =====');
  console.log(`auditId       : ${auditId}`);
  console.log(`generated     : ${result.generated}`);
  console.log(`failed        : ${result.failed}`);
  console.log(`total duration: ${(totalMs / 1000).toFixed(1)}s`);
  console.log('details       :');
  for (const d of result.details) {
    if (d.status === 'ok') {
      console.log(`  ✓ ${d.solution_id} → ${d.storage_path}`);
    } else {
      console.log(`  ✗ ${d.solution_id} — ${d.error}`);
    }
  }

  if (result.failed > 0 && result.generated === 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[test-diagram-pipeline] uncaught:', err);
  process.exit(1);
});
