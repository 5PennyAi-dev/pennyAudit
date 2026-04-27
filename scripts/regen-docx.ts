/**
 * Régénère le DOCX d'un audit existant à partir de son skill_5_output
 * persisté. N'invoque AUCUN appel IA — pure rendering.
 *
 * Usage :
 *   npx tsx scripts/regen-docx.ts <auditId>
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  buildAuditDocx,
  clientFileSlug,
  type AuditForDocx,
} from '../src/lib/report/docx-builder';
import {
  buildDocxStoragePath,
  getSignedUrl,
  uploadDocx,
} from '../api/_storageAuditReports';
import { loadDiagramAssetsForAudit } from '../api/_storageAuditDiagrams';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}
const auditId = process.argv[2];
if (!auditId) {
  console.error('❌ Usage : npx tsx scripts/regen-docx.ts <auditId>');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, KEY, { auth: { persistSession: false } });

async function main() {
  console.log(`🔄 Regen DOCX audit ${auditId}`);
  const { data: audit, error } = await supabase
    .from('audits')
    .select(
      'id, intake_data, skill_1_output, skill_2_output, skill_5_output, admin_notes_global, reviewed_at, delivered_at, created_at, diagrams_metadata',
    )
    .eq('id', auditId)
    .maybeSingle();
  if (error || !audit) {
    console.error('❌ Audit introuvable :', error?.message);
    process.exit(1);
  }
  if (!audit.skill_5_output) {
    console.error('❌ skill_5_output absent — pipeline incomplet.');
    process.exit(1);
  }

  const diagramAssets = await loadDiagramAssetsForAudit(
    audit.diagrams_metadata as Parameters<typeof loadDiagramAssetsForAudit>[0],
  );

  const buffer = await buildAuditDocx(audit as unknown as AuditForDocx, diagramAssets);
  const slug = clientFileSlug(audit as unknown as AuditForDocx);
  const storagePath = buildDocxStoragePath(auditId, slug);
  await uploadDocx(storagePath, buffer);

  const now = new Date().toISOString();
  await supabase
    .from('audits')
    .update({ docx_storage_path: storagePath, docx_generated_at: now })
    .eq('id', auditId);

  const url = await getSignedUrl(storagePath);
  console.log(`✓ DOCX généré (${buffer.length} bytes) — ${storagePath}`);
  console.log(`📥 URL signée (15 min) : ${url}`);
}

main().catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
