/**
 * ═══════════════════════════════════════════════════════════════════════
 * SCRIPT CLI — Relancer le pipeline d'audit avec resume
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Reproduit la logique de /api/audit/run en local, sans serveur HTTP.
 * Utile quand `vercel dev` n'est pas configuré et qu'on veut éviter
 * de redéployer pour tester un rerun.
 *
 * Usage :
 *   npx tsx scripts/rerun-audit.ts <auditId> [resumeFromSkill]
 *
 * Exemples :
 *   npx tsx scripts/rerun-audit.ts abc-123-def      # pipeline complet
 *   npx tsx scripts/rerun-audit.ts abc-123-def 5    # depuis Skill 5
 *
 * Variables d'environnement requises :
 *   SUPABASE_URL (ou VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY,
 *   ANTHROPIC_API_KEY, VOYAGE_API_KEY
 *
 * Pas d'auth admin requise — c'est un script local.
 * ═══════════════════════════════════════════════════════════════════════
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { runSkill } from '../src/lib/ai/runSkill';
import {
  skill1InputSchema,
  skill1OutputSchema,
  skill2InputSchema,
  skill2OutputSchema,
  skill3InputSchema,
  skill3OutputSchema,
  skill4InputSchema,
  skill4OutputSchema,
  skill5InputSchema,
  skill5OutputSchema,
} from '../src/lib/ai/schemas';
import {
  buildMatchingQueryText,
  findTopKPatterns,
} from '../src/lib/ai/semantic-matching';
import { generateAuditDiagrams } from '../src/lib/diagrams/diagram-pipeline';
import {
  buildDiagramStoragePath,
  uploadDiagram,
} from '../api/_storageAuditDiagrams';
import type {
  PatternPrereqData,
  PatternRiskData,
} from '../src/types/skills';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis');
  process.exit(1);
}

const argv = process.argv.slice(2);
const auditId = argv[0];
const resumeFromSkill = (argv[1] ? Number(argv[1]) : 1) as 1 | 2 | 3 | 4 | 5 | 6;
if (!auditId) {
  console.error('❌ Usage : npx tsx scripts/rerun-audit.ts <auditId> [resumeFromSkill=1]');
  process.exit(1);
}
if (![1, 2, 3, 4, 5, 6].includes(resumeFromSkill)) {
  console.error('❌ resumeFromSkill doit être 1, 2, 3, 4, 5 ou 6');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

async function main() {
  log(`🚀 Rerun audit ${auditId} from skill ${resumeFromSkill}`);

  const { data: audit, error: fetchErr } = await supabase
    .from('audits')
    .select(
      'id, status, intake_data, pattern_ids, skill_1_output, skill_2_output, skill_3_output, skill_4_output, skill_5_output',
    )
    .eq('id', auditId)
    .single();
  if (fetchErr || !audit) {
    console.error('❌ Audit introuvable :', fetchErr?.message);
    process.exit(1);
  }
  log(`✓ Audit chargé. Statut actuel : ${audit.status}`);

  await supabase
    .from('audits')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      current_skill: resumeFromSkill,
      error_message: null,
    })
    .eq('id', auditId);

  const intakeData = (audit.intake_data ?? {}) as Record<string, unknown>;
  const cleanedIntake = { ...intakeData };
  delete cleanedIntake._currentScreen;

  // ─────── Skill 1 ───────
  let skill1Output: typeof skill1OutputSchema._output;
  if (resumeFromSkill <= 1) {
    log('▶ Skill 1 (analyse contexte)...');
    const r = await runSkill({
      skillId: 1,
      input: { intake_data: cleanedIntake },
      inputSchema: skill1InputSchema,
      outputSchema: skill1OutputSchema,
    });
    skill1Output = r.output;
    await supabase.from('audits').update({ skill_1_output: r.output, current_skill: 2 }).eq('id', auditId);
    log(`✓ Skill 1 OK (${r.tokensUsed.total} tokens, ${r.durationMs}ms)`);
  } else {
    if (!audit.skill_1_output) throw new Error('skill_1_output absent');
    skill1Output = audit.skill_1_output as typeof skill1OutputSchema._output;
    log('⏭  Skill 1 skip (resumed)');
  }

  // ─────── Matching + Skill 2 ───────
  let skill2Output: typeof skill2OutputSchema._output;
  let candidatePatterns: Array<{ pattern_id: string; content: unknown; similarity_score: number }>;
  if (resumeFromSkill <= 2) {
    log('▶ Matching sémantique...');
    const queryText = buildMatchingQueryText({
      industry: cleanedIntake.industry as string | undefined,
      industry_other: cleanedIntake.industry_other as string | undefined,
      time_consuming_tasks: cleanedIntake.time_consuming_tasks as string | undefined,
      automation_wish: cleanedIntake.automation_wish as string | undefined,
    });
    const top = await findTopKPatterns({ supabase, queryText, k: 12 });
    candidatePatterns = top.map((p) => ({
      pattern_id: p.patternId,
      content: p.content,
      similarity_score: p.similarityScore,
    }));
    log(`✓ ${top.length} patterns matched`);

    log('▶ Skill 2 (opportunités)...');
    const r = await runSkill({
      skillId: 2,
      input: { context: skill1Output, candidate_patterns: candidatePatterns },
      inputSchema: skill2InputSchema,
      outputSchema: skill2OutputSchema,
    });
    skill2Output = r.output;
    await supabase
      .from('audits')
      .update({
        skill_2_output: r.output,
        current_skill: 3,
        pattern_ids: r.output.selected_opportunities.map((o) => o.pattern_id),
      })
      .eq('id', auditId);
    log(`✓ Skill 2 OK (${r.tokensUsed.total} tokens)`);
  } else {
    if (!audit.skill_2_output) throw new Error('skill_2_output absent');
    if (!audit.pattern_ids?.length) throw new Error('pattern_ids absent');
    skill2Output = audit.skill_2_output as typeof skill2OutputSchema._output;
    const { data: rows, error: pErr } = await supabase
      .from('patterns')
      .select('id, content')
      .in('id', audit.pattern_ids as string[]);
    if (pErr || !rows) throw new Error(`refetch patterns : ${pErr?.message}`);
    candidatePatterns = rows.map((r) => ({
      pattern_id: r.id,
      content: r.content,
      similarity_score: 0,
    }));
    log(`⏭  Skill 2 skip (${candidatePatterns.length} patterns rechargés)`);
  }

  // ─────── Skills 3 & 4 ───────
  const selected = new Set(skill2Output.selected_opportunities.map((o) => o.pattern_id));
  const used = candidatePatterns.filter((p) => selected.has(p.pattern_id));
  const risksData: PatternRiskData[] = used.map((p) => ({
    pattern_id: p.pattern_id,
    risks: (p.content as Record<string, unknown>)?.risks ?? null,
  }));
  const prereqData: PatternPrereqData[] = used.map((p) => ({
    pattern_id: p.pattern_id,
    prerequisites: (p.content as Record<string, unknown>)?.prerequisites ?? null,
  }));

  let skill3Output: typeof skill3OutputSchema._output;
  let skill4Output: typeof skill4OutputSchema._output;

  const r3p = resumeFromSkill <= 3
    ? runSkill({
        skillId: 3,
        input: {
          context: skill1Output,
          selected_opportunities: skill2Output.selected_opportunities,
          patterns_risk_data: risksData,
        },
        inputSchema: skill3InputSchema,
        outputSchema: skill3OutputSchema,
      })
    : null;
  const r4p = resumeFromSkill <= 4
    ? runSkill({
        skillId: 4,
        input: {
          context: skill1Output,
          selected_opportunities: skill2Output.selected_opportunities,
          patterns_prereq_data: prereqData,
        },
        inputSchema: skill4InputSchema,
        outputSchema: skill4OutputSchema,
      })
    : null;
  if (r3p || r4p) log('▶ Skills 3 & 4 (parallèle)...');
  const [r3, r4] = await Promise.all([r3p, r4p]);

  if (r3) {
    skill3Output = r3.output;
    log(`✓ Skill 3 OK (${r3.tokensUsed.total} tokens)`);
  } else {
    if (!audit.skill_3_output) throw new Error('skill_3_output absent');
    skill3Output = audit.skill_3_output as typeof skill3OutputSchema._output;
    log('⏭  Skill 3 skip');
  }
  if (r4) {
    skill4Output = r4.output;
    log(`✓ Skill 4 OK (${r4.tokensUsed.total} tokens)`);
  } else {
    if (!audit.skill_4_output) throw new Error('skill_4_output absent');
    skill4Output = audit.skill_4_output as typeof skill4OutputSchema._output;
    log('⏭  Skill 4 skip');
  }
  if (r3 || r4) {
    const patch: Record<string, unknown> = { current_skill: 5 };
    if (r3) patch.skill_3_output = r3.output;
    if (r4) patch.skill_4_output = r4.output;
    await supabase.from('audits').update(patch).eq('id', auditId);
  }

  // ─────── Skill 5 ───────
  if (resumeFromSkill <= 5) {
    const patternsImplTemplates = used
      .map((p) => {
        const tmpls = (p.content as Record<string, unknown> | null)
          ?.implementation_templates;
        return Array.isArray(tmpls) && tmpls.length > 0
          ? { pattern_id: p.pattern_id, implementation_templates: tmpls }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    log(`  ↳ ${patternsImplTemplates.length} pattern(s) avec implementation_templates`);

    log('▶ Skill 5 (rapport final)...');
    const r = await runSkill({
      skillId: 5,
      input: {
        context: skill1Output,
        selected_opportunities: skill2Output.selected_opportunities,
        risks_analysis: skill3Output,
        stack_audit: skill4Output,
        patterns_implementation_templates: patternsImplTemplates,
      },
      inputSchema: skill5InputSchema,
      outputSchema: skill5OutputSchema,
    });
    await supabase
      .from('audits')
      .update({ skill_5_output: r.output, updated_at: new Date().toISOString() })
      .eq('id', auditId);
    log(`✓ Skill 5 OK (${r.tokensUsed.total} tokens)`);
    const archs = (r.output as { architectures_de_la_solution?: unknown[] }).architectures_de_la_solution;
    if (archs?.length) {
      log(`  ↳ architectures_de_la_solution: ${archs.length} entrée(s)`);
      for (const a of archs as Array<Record<string, unknown>>) {
        log(`     • ${a.opportunity_id} → ${a.sub_template_id} (score ${a.sub_template_match_score})`);
      }
    } else {
      log('  ⚠  Aucune architectures_de_la_solution dans l\'output Skill 5');
    }
  } else {
    if (!audit.skill_5_output) throw new Error('skill_5_output absent');
    log('⏭  Skill 5 skip');
  }

  // ─────── Diagrammes ───────
  log('▶ Génération diagrammes...');
  try {
    const d = await generateAuditDiagrams({
      auditId,
      supabase,
      storage: { buildStoragePath: buildDiagramStoragePath, upload: uploadDiagram },
    });
    log(`✓ Diagrammes : ${d.generated} générés, ${d.failed} échoués`);
  } catch (err) {
    log(`⚠  Diagrammes : ${(err as Error).message}`);
  }

  // ─────── Bascule pending_review ───────
  const now = new Date().toISOString();
  await supabase
    .from('audits')
    .update({ status: 'pending_review', pipeline_completed_at: now, updated_at: now })
    .eq('id', auditId);

  log('🎉 Rerun terminé. Statut : pending_review');
}

main().catch(async (err) => {
  console.error('💥 Rerun échoué :', err);
  await supabase
    .from('audits')
    .update({
      status: 'error',
      error_message: err instanceof Error ? err.message : String(err),
      updated_at: new Date().toISOString(),
    })
    .eq('id', auditId);
  process.exit(1);
});
