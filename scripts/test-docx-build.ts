// Script one-off : génère un DOCX local pour chaque audit en `pending_review`
// ou `delivered` et l'écrit dans /tmp pour vérification visuelle dans Word
// ou LibreOffice. Permet de valider le builder sans déployer.
//
// Usage :
//   npx tsx scripts/test-docx-build.ts
//   npx tsx scripts/test-docx-build.ts <audit_id>     # cible un audit précis
//
// Sortie :
//   ./tmp/audit-<slug>-<id>.docx

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { buildAuditDocx, clientFileSlug, type AuditForDocx } from '../src/lib/report/docx-builder';

async function main() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis dans .env');
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const targetId = process.argv[2];
  let query = supabase
    .from('audits')
    .select('id, intake_data, skill_1_output, skill_2_output, skill_5_output, admin_notes_global, reviewed_at, delivered_at, created_at, status')
    .not('skill_5_output', 'is', null);

  if (targetId) {
    query = query.eq('id', targetId);
  } else {
    query = query.in('status', ['pending_review', 'delivered']);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) {
    console.log('Aucun audit candidat trouvé.');
    return;
  }

  await mkdir('tmp', { recursive: true });

  for (const row of data) {
    const audit = row as unknown as AuditForDocx & { status: string };
    const slug = clientFileSlug(audit);
    try {
      const buffer = await buildAuditDocx(audit);
      const path = join('tmp', `audit-${slug}-${audit.id.slice(0, 8)}.docx`);
      await writeFile(path, buffer);
      console.log(
        `✅ ${audit.id} (${slug}, ${(audit as { status: string }).status}) → ${path} · ${(buffer.length / 1024).toFixed(1)} Ko`,
      );
    } catch (err) {
      console.error(`❌ ${audit.id} (${slug}) :`, err instanceof Error ? err.message : err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
