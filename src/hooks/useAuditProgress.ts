// Hook React qui consomme le stream SSE de /api/audit/run.
//
// L'UI client aggrège en 5 étapes visuelles :
//   1. Analyse du contexte  (skill 1)
//   2. Identification des opportunités (matching + skill 2)
//   3. Évaluation risques et stack (skills 3 + 4 en parallèle)
//   4. Rédaction du rapport personnalisé (skill 5)
//   5. Génération des diagrammes d'architecture (skill 6 + Gemini)

import { useCallback, useState } from 'react';

export type UiStepId = 1 | 2 | 3 | 4 | 5;
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
  { id: 5, label: "Génération des diagrammes d'architecture", state: 'pending' },
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

// Verrou module-level : survit au remount StrictMode (dev) qui sinon
// déclenche deux fois POST /api/audit/run et double le coût en tokens.
const startedAudits = new Set<string>();

export function useAuditProgress(auditId: string | undefined): UseAuditProgressResult {
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [steps, setSteps] = useState<UiStep[]>(INITIAL_STEPS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      case 'diagrams_started':
        setSteps((s) => updateStep(s, 5, 'running'));
        break;
      case 'diagrams_completed':
        setSteps((s) => updateStep(s, 5, 'done'));
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
    if (!auditId || startedAudits.has(auditId)) return;
    startedAudits.add(auditId);
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
