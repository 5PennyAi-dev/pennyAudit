// Hook React qui consomme le stream SSE de /api/audit/run.
//
// Les événements du backend portent sur 5 skills + matching (6 events).
// L'UI client aggrège en 4 étapes visuelles :
//   1. Analyse du contexte  (skill 1)
//   2. Identification des opportunités (matching + skill 2)
//   3. Évaluation risques et stack (skills 3 + 4 en parallèle)
//   4. Rédaction du rapport personnalisé (skill 5)

import { useCallback, useEffect, useRef, useState } from 'react';

export type UiStepId = 1 | 2 | 3 | 4;
export type UiStepState = 'pending' | 'running' | 'done';

export interface UiStep {
  id: UiStepId;
  label: string;
  state: UiStepState;
}

export type PipelineStatus =
  | 'idle'
  | 'starting'
  | 'running'
  | 'completed'
  | 'error';

export interface UseAuditProgressResult {
  status: PipelineStatus;
  steps: UiStep[];
  errorMessage: string | null;
  start: () => void;
}

const INITIAL_STEPS: UiStep[] = [
  { id: 1, label: 'Analyse de votre contexte', state: 'pending' },
  { id: 2, label: 'Identification des opportunités', state: 'pending' },
  { id: 3, label: 'Évaluation des risques et de votre stack', state: 'pending' },
  { id: 4, label: 'Rédaction de votre rapport personnalisé', state: 'pending' },
];

interface SSEMessage {
  event: string;
  data: unknown;
}

function updateStep(
  steps: UiStep[],
  id: UiStepId,
  state: UiStepState,
): UiStep[] {
  return steps.map((s) => (s.id === id ? { ...s, state } : s));
}

// Parse un buffer SSE brut et extrait les messages complets.
function consumeBuffer(buffer: string): {
  messages: SSEMessage[];
  rest: string;
} {
  const messages: SSEMessage[] = [];
  const blocks = buffer.split('\n\n');
  const rest = blocks.pop() ?? '';
  for (const block of blocks) {
    if (!block.trim() || block.startsWith(':')) continue; // heartbeat
    const lines = block.split('\n');
    let event = 'message';
    let data = '';
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    let parsed: unknown = null;
    try {
      parsed = data ? JSON.parse(data) : null;
    } catch {
      parsed = data;
    }
    messages.push({ event, data: parsed });
  }
  return { messages, rest };
}

export function useAuditProgress(auditId: string | undefined): UseAuditProgressResult {
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [steps, setSteps] = useState<UiStep[]>(INITIAL_STEPS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Évite de lancer deux fois le pipeline sur un re-render. Réinitialisé
  // quand auditId change (cas d'un nouveau audit dans la même session).
  // PAS d'AbortController : la promesse côté serveur que « fermer l'onglet
  // ne perd pas la progression » suppose que le pipeline tourne jusqu'au
  // bout côté backend, indépendamment du client. Abort côté client casserait
  // ça en dev (StrictMode mount/unmount/remount) sans bénéfice en prod.
  const startedRef = useRef(false);

  // Reset du verrou si auditId change : permet de relancer pour un nouvel audit.
  useEffect(() => {
    startedRef.current = false;
  }, [auditId]);

  const applyEvent = useCallback((event: string) => {
    switch (event) {
      case 'pipeline_started':
        setStatus('running');
        setSteps((s) => updateStep(s, 1, 'running'));
        break;
      case 'skill_1_completed':
        setSteps((s) => updateStep(updateStep(s, 1, 'done'), 2, 'running'));
        break;
      case 'skill_2_completed':
        setSteps((s) => updateStep(updateStep(s, 2, 'done'), 3, 'running'));
        break;
      case 'skills_3_4_completed':
        setSteps((s) => updateStep(updateStep(s, 3, 'done'), 4, 'running'));
        break;
      case 'skill_5_completed':
        setSteps((s) => updateStep(s, 4, 'done'));
        break;
      case 'pipeline_completed':
        setSteps((s) => s.map((x) => ({ ...x, state: 'done' as UiStepState })));
        setStatus('completed');
        break;
      case 'pipeline_error':
        setStatus('error');
        break;
      default:
        break;
    }
  }, []);

  const start = useCallback(() => {
    if (!auditId || startedRef.current) return;
    startedRef.current = true;
    setStatus('starting');
    setErrorMessage(null);

    (async () => {
      try {
        const res = await fetch('/api/audit/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ auditId }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { messages, rest } = consumeBuffer(buffer);
          buffer = rest;
          for (const msg of messages) {
            applyEvent(msg.event);
            if (msg.event === 'pipeline_error') {
              const data = msg.data as { message?: string } | null;
              setErrorMessage(data?.message ?? 'Erreur technique.');
            }
          }
        }
      } catch (err) {
        console.error('[useAuditProgress] stream error:', err);
        setStatus('error');
        setErrorMessage(
          err instanceof Error ? err.message : 'Erreur de communication.',
        );
      }
    })();
  }, [auditId, applyEvent]);

  return { status, steps, errorMessage, start };
}
