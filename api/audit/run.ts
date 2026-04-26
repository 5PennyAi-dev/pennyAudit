// Orchestrateur du pipeline d'audit — SSE sur Node serverless.
//
// Pourquoi pas Edge Function (comme suggéré par la spec 2B) ?
//   - runSkill charge les prompts via fs.readFileSync (src/prompts/*.md)
//   - @anthropic-ai/sdk cible principalement Node
//   - @supabase/supabase-js + RPC pgvector : plus simple côté Node
//
// Conséquence : il faut Vercel Pro (maxDuration 300s) car le pipeline
// complet tourne 3-8 minutes. `maxDuration` ci-dessous pousse la limite à 300s.
// Un tick SSE régulier garde la connexion client vivante.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, parseJsonBody } from '../_supabaseAdmin';
import { runSkill } from '../../src/lib/ai/runSkill';
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
} from '../../src/lib/ai/schemas';
import {
  buildMatchingQueryText,
  findTopKPatterns,
} from '../../src/lib/ai/semantic-matching';
import { generateAuditDiagrams } from '../../src/lib/diagrams/diagram-pipeline';
import {
  buildDiagramStoragePath,
  uploadDiagram,
} from '../_storageAuditDiagrams';
import type {
  PatternPrereqData,
  PatternRiskData,
  SSEEventName,
} from '../../src/types/skills';
import { computeCostUsd } from '../../src/lib/ai/pricing';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { RunSkillResult } from '../../src/lib/ai/runSkill';

async function logSkillRun(
  supabase: SupabaseClient,
  auditId: string,
  skillNumber: number,
  result: RunSkillResult<unknown>,
): Promise<void> {
  const cost = computeCostUsd(
    result.model,
    result.tokensUsed.input,
    result.tokensUsed.output,
  );
  const { error } = await supabase.from('audit_logs').insert({
    audit_id: auditId,
    event_type: 'skill_completed',
    skill_number: skillNumber,
    model_used: result.model,
    input_tokens: result.tokensUsed.input,
    output_tokens: result.tokensUsed.output,
    tokens_used: result.tokensUsed.total,
    duration_ms: result.durationMs,
    cost_usd: cost,
    metadata: { attempts: result.attempts },
  });
  if (error) {
    // Ne pas faire échouer le pipeline pour un log raté — juste warn.
    console.warn(`[run] audit_logs insert skill ${skillNumber} failed:`, error.message);
  }
}

export const config = {
  maxDuration: 300, // secondes — Vercel Pro requis
};

interface RunPayload {
  auditId?: string;
}

function openSseStream(res: VercelResponse): void {
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // désactive le buffering Nginx
  res.flushHeaders?.();
}

function sendEvent(
  res: VercelResponse,
  event: SSEEventName,
  data: Record<string, unknown>,
): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function sendHeartbeat(res: VercelResponse): void {
  res.write(`: ping ${Date.now()}\n\n`);
}

function fireAndForgetEmails(auditId: string): void {
  const base =
    process.env.PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!base) {
    console.warn('[run] PUBLIC_BASE_URL absent — skip emails.');
    return;
  }
  const cronSecret = process.env.INTERNAL_HOOK_SECRET ?? process.env.CRON_SECRET;
  const url = `${base}/api/audit/send-completion-emails`;
  void fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
    },
    body: JSON.stringify({ auditId }),
  }).catch((err) => {
    console.error('[run] completion-emails fetch failed:', err);
  });
}

function fireAndForgetAdminErrorEmail(
  auditId: string,
  errorMessage: string,
): void {
  const base =
    process.env.PUBLIC_BASE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  if (!base) return;
  const cronSecret = process.env.INTERNAL_HOOK_SECRET ?? process.env.CRON_SECRET;
  void fetch(`${base}/api/audit/send-completion-emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {}),
    },
    body: JSON.stringify({ auditId, errorMode: true, errorMessage }),
  }).catch((err) => console.error('[run] admin-error email fetch failed:', err));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = parseJsonBody<RunPayload>(req.body);
  if (!body?.auditId) {
    return res.status(400).json({ error: 'auditId requis.' });
  }
  const auditId = body.auditId;

  const supabase = getSupabaseAdmin();

  // Charger l'audit.
  const { data: audit, error: fetchError } = await supabase
    .from('audits')
    .select('id, status, intake_data')
    .eq('id', auditId)
    .single();

  if (fetchError || !audit) {
    return res.status(404).json({ error: 'Audit introuvable.' });
  }

  // Idempotence naïve : si déjà en cours ou complété, on refuse.
  // 'changes_requested' = relance depuis l'admin (Session 2C) — accepté.
  if (
    audit.status !== 'draft' &&
    audit.status !== 'error' &&
    audit.status !== 'changes_requested'
  ) {
    return res.status(409).json({
      error: `Audit dans un état non relançable : ${audit.status}`,
    });
  }

  // Ouvrir le stream SSE.
  openSseStream(res);

  const heartbeat = setInterval(() => sendHeartbeat(res), 15_000);
  const onClose = () => clearInterval(heartbeat);
  req.on('close', onClose);

  const tokensTotals = {
    total_input: 0,
    total_output: 0,
    by_skill: {} as Record<string, number>,
  };

  async function markError(message: string, failedAt: string) {
    await supabase
      .from('audits')
      .update({
        status: 'error',
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq('id', auditId);
    sendEvent(res, 'pipeline_error', { message, failedAt });
    fireAndForgetAdminErrorEmail(auditId, message);
  }

  try {
    // Transition draft → running.
    const { error: updRunning } = await supabase
      .from('audits')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        current_skill: 1,
        error_message: null,
      })
      .eq('id', auditId);
    if (updRunning) throw new Error(`transition running: ${updRunning.message}`);

    sendEvent(res, 'pipeline_started', { auditId });

    const intakeData = (audit.intake_data ?? {}) as Record<string, unknown>;
    // Le champ interne _currentScreen (Session 2A) n'intéresse pas les skills.
    const cleanedIntake = { ...intakeData };
    delete cleanedIntake._currentScreen;

    // ─────────── Skill 1 ───────────
    sendEvent(res, 'skill_1_started', { skillName: 'Analyse du contexte' });
    const skill1 = await runSkill({
      skillId: 1,
      input: { intake_data: cleanedIntake },
      inputSchema: skill1InputSchema,
      outputSchema: skill1OutputSchema,
    });
    tokensTotals.total_input += skill1.tokensUsed.input;
    tokensTotals.total_output += skill1.tokensUsed.output;
    tokensTotals.by_skill.skill_1 = skill1.tokensUsed.total;
    await supabase
      .from('audits')
      .update({ skill_1_output: skill1.output, current_skill: 2 })
      .eq('id', auditId);
    await logSkillRun(supabase, auditId, 1, skill1);
    sendEvent(res, 'skill_1_completed', {
      skillId: 1,
      tokensUsed: skill1.tokensUsed.total,
      durationMs: skill1.durationMs,
    });

    // ─────────── Matching sémantique ───────────
    sendEvent(res, 'matching_started', { message: "Recherche d'opportunités" });
    const queryText = buildMatchingQueryText({
      industry: cleanedIntake.industry as string | undefined,
      industry_other: cleanedIntake.industry_other as string | undefined,
      time_consuming_tasks: cleanedIntake.time_consuming_tasks as
        | string
        | undefined,
      automation_wish: cleanedIntake.automation_wish as string | undefined,
    });
    const topPatterns = await findTopKPatterns({
      supabase,
      queryText,
      k: 12,
    });
    sendEvent(res, 'matching_completed', { patternsFound: topPatterns.length });

    const candidatePatterns = topPatterns.map((p) => ({
      pattern_id: p.patternId,
      content: p.content,
      similarity_score: p.similarityScore,
    }));

    // ─────────── Skill 2 ───────────
    sendEvent(res, 'skill_2_started', {
      skillName: 'Identification des opportunités',
    });
    const skill2 = await runSkill({
      skillId: 2,
      input: {
        context: skill1.output,
        candidate_patterns: candidatePatterns,
      },
      inputSchema: skill2InputSchema,
      outputSchema: skill2OutputSchema,
    });
    tokensTotals.total_input += skill2.tokensUsed.input;
    tokensTotals.total_output += skill2.tokensUsed.output;
    tokensTotals.by_skill.skill_2 = skill2.tokensUsed.total;
    await supabase
      .from('audits')
      .update({
        skill_2_output: skill2.output,
        current_skill: 3,
        pattern_ids: skill2.output.selected_opportunities.map(
          (o) => o.pattern_id,
        ),
      })
      .eq('id', auditId);
    await logSkillRun(supabase, auditId, 2, skill2);
    sendEvent(res, 'skill_2_completed', {
      skillId: 2,
      tokensUsed: skill2.tokensUsed.total,
      durationMs: skill2.durationMs,
    });

    // ─────────── Skills 3 & 4 en parallèle ───────────
    sendEvent(res, 'skills_3_4_started', {
      skillName: 'Évaluation risques et stack',
    });

    const selectedPatternIds = new Set(
      skill2.output.selected_opportunities.map((o) => o.pattern_id),
    );
    const usedPatterns = candidatePatterns.filter((p) =>
      selectedPatternIds.has(p.pattern_id),
    );

    const patternsRiskData: PatternRiskData[] = usedPatterns.map((p) => ({
      pattern_id: p.pattern_id,
      risks: (p.content as Record<string, unknown>)?.risks ?? null,
    }));
    const patternsPrereqData: PatternPrereqData[] = usedPatterns.map((p) => ({
      pattern_id: p.pattern_id,
      prerequisites:
        (p.content as Record<string, unknown>)?.prerequisites ?? null,
    }));

    const [skill3, skill4] = await Promise.all([
      runSkill({
        skillId: 3,
        input: {
          context: skill1.output,
          selected_opportunities: skill2.output.selected_opportunities,
          patterns_risk_data: patternsRiskData,
        },
        inputSchema: skill3InputSchema,
        outputSchema: skill3OutputSchema,
      }),
      runSkill({
        skillId: 4,
        input: {
          context: skill1.output,
          selected_opportunities: skill2.output.selected_opportunities,
          patterns_prereq_data: patternsPrereqData,
        },
        inputSchema: skill4InputSchema,
        outputSchema: skill4OutputSchema,
      }),
    ]);

    tokensTotals.total_input += skill3.tokensUsed.input + skill4.tokensUsed.input;
    tokensTotals.total_output +=
      skill3.tokensUsed.output + skill4.tokensUsed.output;
    tokensTotals.by_skill.skill_3 = skill3.tokensUsed.total;
    tokensTotals.by_skill.skill_4 = skill4.tokensUsed.total;

    await supabase
      .from('audits')
      .update({
        skill_3_output: skill3.output,
        skill_4_output: skill4.output,
        current_skill: 5,
      })
      .eq('id', auditId);
    await logSkillRun(supabase, auditId, 3, skill3);
    await logSkillRun(supabase, auditId, 4, skill4);
    sendEvent(res, 'skill_3_completed', {
      skillId: 3,
      tokensUsed: skill3.tokensUsed.total,
      durationMs: skill3.durationMs,
    });
    sendEvent(res, 'skill_4_completed', {
      skillId: 4,
      tokensUsed: skill4.tokensUsed.total,
      durationMs: skill4.durationMs,
    });
    sendEvent(res, 'skills_3_4_completed', {});

    // ─────────── Skill 5 ───────────
    sendEvent(res, 'skill_5_started', {
      skillName: 'Rédaction du rapport final',
    });

    // [DEBUG] traces autour du skill 5 — voir commit "trace skill 5".
    console.log('[run] skill 5 about to start, context skills present:', {
      s1: !!skill1,
      s2: !!skill2,
      s3: !!skill3,
      s4: !!skill4,
    });

    const skill5 = await runSkill({
      skillId: 5,
      input: {
        context: skill1.output,
        selected_opportunities: skill2.output.selected_opportunities,
        risks_analysis: skill3.output,
        stack_audit: skill4.output,
      },
      inputSchema: skill5InputSchema,
      outputSchema: skill5OutputSchema,
    });

    console.log('[run] skill 5 completed, output type:', typeof skill5.output);
    console.log(
      '[run] skill 5 output preview:',
      JSON.stringify(skill5.output).slice(0, 300),
    );

    tokensTotals.total_input += skill5.tokensUsed.input;
    tokensTotals.total_output += skill5.tokensUsed.output;
    tokensTotals.by_skill.skill_5 = skill5.tokensUsed.total;

    // Persiste skill_5_output sans encore basculer pending_review : la
    // génération des diagrammes (Session 2E) doit s'exécuter avant.
    try {
      const skill5SavedAt = new Date().toISOString();
      const { error: updateError } = await supabase
        .from('audits')
        .update({
          skill_5_output: skill5.output,
          updated_at: skill5SavedAt,
        })
        .eq('id', auditId);
      if (updateError) {
        console.error('[run] failed to persist skill 5:', updateError);
        throw updateError;
      }
      console.log('[run] skill 5 persisted successfully');
    } catch (err) {
      console.error('[run] skill 5 persistence exception:', err);
      throw err;
    }
    await logSkillRun(supabase, auditId, 5, skill5);
    sendEvent(res, 'skill_5_completed', {
      skillId: 5,
      tokensUsed: skill5.tokensUsed.total,
      durationMs: skill5.durationMs,
    });

    // ─────────── Génération des diagrammes (Session 2E) ───────────
    // Best-effort : un échec total ne bloque pas le passage en
    // pending_review (l'audit reste livrable sans visuels, signalé
    // dans l'admin).
    sendEvent(res, 'diagrams_started', {
      skillName: "Génération des diagrammes d'architecture",
    });
    let diagramsGenerated = 0;
    let diagramsFailed = 0;
    try {
      const diagramsResult = await generateAuditDiagrams({
        auditId,
        supabase,
        storage: {
          buildStoragePath: buildDiagramStoragePath,
          upload: uploadDiagram,
        },
      });
      diagramsGenerated = diagramsResult.generated;
      diagramsFailed = diagramsResult.failed;
      if (diagramsResult.failed > 0 && diagramsResult.generated === 0) {
        console.warn(
          '[run] all diagrams failed — audit will deliver without visuals',
        );
      }
    } catch (err) {
      console.error('[run] diagrams pipeline exception:', err);
      // On laisse passer : pas de blocage, l'admin verra l'absence et
      // pourra relancer la génération manuellement à l'Étape 7.
    }
    sendEvent(res, 'diagrams_completed', {
      generated: diagramsGenerated,
      failed: diagramsFailed,
    });

    // ─────────── Bascule finale en pending_review ───────────
    const now = new Date().toISOString();
    try {
      const { error: finalErr } = await supabase
        .from('audits')
        .update({
          status: 'pending_review',
          pipeline_completed_at: now,
          updated_at: now,
        })
        .eq('id', auditId);
      if (finalErr) {
        console.error('[run] failed to mark pending_review:', finalErr);
        throw finalErr;
      }
    } catch (err) {
      console.error('[run] pending_review transition exception:', err);
      throw err;
    }

    sendEvent(res, 'pipeline_completed', {
      auditId,
      message: 'Audit terminé, en attente de révision',
      tokensTotal: tokensTotals.total_input + tokensTotals.total_output,
    });

    // Déclencher les 2 courriels en fire-and-forget (client + Christian).
    fireAndForgetEmails(auditId);

    clearInterval(heartbeat);
    res.end();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    console.error('[run] pipeline error:', err);
    await markError(message, 'pipeline').catch((e) =>
      console.error('[run] markError failed:', e),
    );
    clearInterval(heartbeat);
    res.end();
  }
}
