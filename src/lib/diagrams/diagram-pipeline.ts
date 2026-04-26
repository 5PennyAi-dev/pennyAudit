// Orchestre la génération de tous les diagrammes d'architecture d'un
// audit (un par opportunité phase 1 et phase 2 de la feuille de route).
//
// Flux :
//   1. Récupère l'audit complet via Service Role Key.
//   2. Vérifie que skill_5_output existe (sinon → erreur 409).
//   3. Appelle le Skill 6 (générateur de prompts) — input :
//      {context, selected_opportunities, synthesis}.
//   4. Émet l'event diagrams_generation_started.
//   5. Génère les images en parallèle par batches de 4 max
//      (Promise.allSettled), avec la planche style guide jointe à
//      chaque appel Gemini.
//   6. Pour chaque résultat : upload du PNG/JPEG dans le bucket
//      audit-diagrams, mise à jour de audits.diagrams_metadata
//      (entrée par solution_id), event diagram_generated ou
//      diagram_failed selon le cas.
//   7. Retourne le résumé { generated, failed, details }.
//
// Utilisation :
//   - Dans le pipeline d'audit (Étape 5) : appelé après le Skill 5 et
//     avant le passage en pending_review.
//   - Pour la régénération admin (Étape 7) : un endpoint dédié appelle
//     directement generateDiagram + upload + update sur une seule
//     entrée, sans repasser par le Skill 6 (sauf si le prompt n'a pas
//     été édité, auquel cas on réutilise prompt_used).
//
// La planche style guide est résolue depuis docs/references/ via un
// chemin relatif au fichier compilé (import.meta.url). @vercel/nft
// suit ce chemin statique et inclut l'asset dans le bundle serverless.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';

import { runSkill } from '../ai/runSkill';
import {
  skill6InputSchema,
  skill6OutputSchema,
} from '../ai/schemas';
import type { z } from 'zod';
import { generateDiagram } from './gemini-client';

// ─── Résolution du chemin de la planche style guide ───
//
// En dev (tsx) : import.meta.url pointe vers
//   file:///<repo>/src/lib/diagrams/diagram-pipeline.ts
// En prod (Vercel build) : pointe vers le fichier compilé. Dans les
// deux cas, remonter de 3 niveaux (diagrams → lib → src → racine repo)
// puis descendre vers docs/references/style-guide-v1.png reste valide
// car @vercel/nft inclut les assets référencés statiquement.
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const STYLE_GUIDE_PATH = path.resolve(
  HERE,
  '..',
  '..',
  '..',
  'docs',
  'references',
  'style-guide-v1.png',
);

// Limite de parallélisme pour ne pas saturer Gemini ni risquer du
// throttling. Les batches sont traités séquentiellement. Validé sur
// l'audit Marc Dubois (4 diagrammes) : à 4 appels concurrents on
// observait des timeouts répétés au 1er essai (Thinking + 2K sous
// concurrence). 3 reste rapide tout en réduisant la pression.
const PARALLELISM = 3;

// ─── Types publics ───

export type DiagramStatus = 'ok' | 'failed';

export interface DiagramMetadataEntry {
  title: string;
  storage_path?: string;
  prompt_used: string;
  generated_at: string;
  status: DiagramStatus;
  failure_reason?: string;
}

export type DiagramsMetadata = Record<string, DiagramMetadataEntry>;

export interface GenerateAuditDiagramsResult {
  generated: number;
  failed: number;
  details: Array<{
    solution_id: string;
    status: DiagramStatus;
    storage_path?: string;
    error?: string;
  }>;
}

// ─── Interfaces internes (Skill 6 output déstructuré) ───

type Skill6Output = z.infer<typeof skill6OutputSchema>;
type Skill6Diagram = Skill6Output['diagrams'][number];

// ─── Dépendances injectables (storage) ───
//
// On injecte les helpers Storage par paramètre pour découpler ce
// module du dossier api/ (qui contient des dépendances Vercel-only).
// L'orchestrateur d'audit et le test script passent les fonctions
// concrètes depuis api/_storageAuditDiagrams.ts.

export interface DiagramStorage {
  buildStoragePath(
    auditId: string,
    solutionId: string,
    mimeType: 'image/png' | 'image/jpeg',
  ): string;
  upload(
    storagePath: string,
    buffer: Buffer,
    mimeType: 'image/png' | 'image/jpeg',
  ): Promise<string>;
}

export interface GenerateAuditDiagramsParams {
  auditId: string;
  supabase: SupabaseClient;
  storage: DiagramStorage;
  /** Override du chemin de la planche pour tests. Défaut : STYLE_GUIDE_PATH. */
  styleGuidePath?: string;
  /** Override du parallélisme pour tests. Défaut : 4. */
  parallelism?: number;
}

// ─── Fonction principale ───

export async function generateAuditDiagrams(
  params: GenerateAuditDiagramsParams,
): Promise<GenerateAuditDiagramsResult> {
  const {
    auditId,
    supabase,
    storage,
    styleGuidePath = STYLE_GUIDE_PATH,
    parallelism = PARALLELISM,
  } = params;

  console.log(`[diagram-pipeline] start — auditId=${auditId}`);

  // 1. Charger l'audit
  const { data: audit, error: fetchErr } = await supabase
    .from('audits')
    .select(
      'id, intake_data, skill_1_output, skill_2_output, skill_5_output, diagrams_metadata',
    )
    .eq('id', auditId)
    .maybeSingle();

  if (fetchErr) throw new Error(`Audit fetch failed: ${fetchErr.message}`);
  if (!audit) throw new Error(`Audit ${auditId} introuvable.`);
  if (!audit.skill_1_output || !audit.skill_2_output || !audit.skill_5_output) {
    throw new Error(
      `Audit ${auditId} sans skill_1/2/5_output — pipeline incomplet.`,
    );
  }

  // 2. Skill 6 : génération des prompts
  console.log(`[diagram-pipeline] running Skill 6…`);
  const skill6 = await runSkill({
    skillId: 6,
    input: {
      context: audit.skill_1_output,
      selected_opportunities:
        audit.skill_2_output.selected_opportunities,
      synthesis: audit.skill_5_output,
    },
    inputSchema: skill6InputSchema,
    outputSchema: skill6OutputSchema,
  });

  const diagrams: Skill6Diagram[] = skill6.output.diagrams;
  console.log(
    `[diagram-pipeline] Skill 6 produced ${diagrams.length} diagram prompt(s) in ${skill6.durationMs}ms`,
  );

  if (diagrams.length === 0) {
    console.warn(
      `[diagram-pipeline] no diagrams to generate — phase_1/2 roadmap empty?`,
    );
    return { generated: 0, failed: 0, details: [] };
  }

  // 3. Event diagrams_generation_started
  await emitEvent(supabase, auditId, 'diagrams_generation_started', {
    count: diagrams.length,
    solution_ids: diagrams.map((d) => d.solution_id),
  });

  // 4. Génération en parallèle par batches
  const details: GenerateAuditDiagramsResult['details'] = [];
  const metadata: DiagramsMetadata = { ...(audit.diagrams_metadata ?? {}) };
  let generated = 0;
  let failed = 0;

  for (let i = 0; i < diagrams.length; i += parallelism) {
    const batch = diagrams.slice(i, i + parallelism);
    console.log(
      `[diagram-pipeline] batch ${Math.floor(i / parallelism) + 1} — ${batch.length} diagram(s)`,
    );
    const settled = await Promise.allSettled(
      batch.map((d) =>
        processOneDiagram({
          auditId,
          diagram: d,
          styleGuidePath,
          storage,
        }),
      ),
    );
    for (let j = 0; j < settled.length; j++) {
      const d = batch[j];
      const result = settled[j];
      if (result.status === 'fulfilled' && result.value.status === 'ok') {
        const entry: DiagramMetadataEntry = {
          title: d.title,
          storage_path: result.value.storage_path,
          prompt_used: d.prompt_full,
          generated_at: new Date().toISOString(),
          status: 'ok',
        };
        metadata[d.solution_id] = entry;
        details.push({
          solution_id: d.solution_id,
          status: 'ok',
          storage_path: result.value.storage_path,
        });
        generated++;
        await emitEvent(supabase, auditId, 'diagram_generated', {
          solution_id: d.solution_id,
          storage_path: result.value.storage_path,
          size_bytes: result.value.size_bytes,
        });
      } else {
        let errorMsg: string;
        if (result.status === 'rejected') {
          errorMsg = (result.reason as Error)?.message ?? 'unknown error';
        } else {
          // result.status === 'fulfilled' et value.status === 'failed'
          errorMsg = (result.value as ProcessOneFailed).error;
        }
        const entry: DiagramMetadataEntry = {
          title: d.title,
          prompt_used: d.prompt_full,
          generated_at: new Date().toISOString(),
          status: 'failed',
          failure_reason: errorMsg,
        };
        metadata[d.solution_id] = entry;
        details.push({
          solution_id: d.solution_id,
          status: 'failed',
          error: errorMsg,
        });
        failed++;
        await emitEvent(supabase, auditId, 'diagram_failed', {
          solution_id: d.solution_id,
          error: errorMsg,
        });
      }
    }

    // Persister la metadata après chaque batch — visibilité partielle
    // si le pipeline est interrompu.
    const { error: updErr } = await supabase
      .from('audits')
      .update({ diagrams_metadata: metadata })
      .eq('id', auditId);
    if (updErr) {
      console.error(
        `[diagram-pipeline] metadata update failed: ${updErr.message}`,
      );
    }
  }

  console.log(
    `[diagram-pipeline] done — generated=${generated} failed=${failed}`,
  );
  return { generated, failed, details };
}

// ─── Helpers internes ───

interface ProcessOneParams {
  auditId: string;
  diagram: Skill6Diagram;
  styleGuidePath: string;
  storage: DiagramStorage;
}

interface ProcessOneOk {
  status: 'ok';
  storage_path: string;
  size_bytes: number;
}
interface ProcessOneFailed {
  status: 'failed';
  error: string;
}

async function processOneDiagram(
  p: ProcessOneParams,
): Promise<ProcessOneOk | ProcessOneFailed> {
  const { auditId, diagram, styleGuidePath, storage } = p;
  console.log(
    `[diagram-pipeline] generating ${diagram.solution_id} (${diagram.phase})…`,
  );

  const result = await generateDiagram({
    prompt: diagram.prompt_full,
    referenceImagePath: styleGuidePath,
    aspectRatio: '16:9',
    resolution: '2K',
  });

  if (!result.success) {
    return { status: 'failed', error: result.error };
  }

  const storagePath = storage.buildStoragePath(
    auditId,
    diagram.solution_id,
    result.mimeType,
  );

  try {
    await storage.upload(storagePath, result.imageBuffer, result.mimeType);
  } catch (err) {
    return {
      status: 'failed',
      error: `Upload Storage : ${(err as Error).message}`,
    };
  }

  return {
    status: 'ok',
    storage_path: storagePath,
    size_bytes: result.imageBuffer.length,
  };
}

async function emitEvent(
  supabase: SupabaseClient,
  auditId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from('audit_review_events').insert({
    audit_id: auditId,
    event_type: eventType,
    payload,
  });
  if (error) {
    console.error(
      `[diagram-pipeline] event ${eventType} insert failed: ${error.message}`,
    );
  }
}
