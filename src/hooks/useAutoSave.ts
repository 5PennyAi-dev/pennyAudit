import { useEffect, useRef, useState } from 'react';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface UseAutoSaveOptions {
  /** Délai avant déclenchement de la sauvegarde, en ms. Défaut 1500. */
  debounceMs?: number;
  /** Si fourni, ignore la première frappe identique à la valeur initiale. */
  initialValue?: string;
}

export interface UseAutoSaveResult {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  error: string | null;
}

/**
 * Auto-save d'une valeur texte avec debounce. Appelle `save(value)` après
 * `debounceMs` d'inactivité. Met à jour l'indicateur d'état pour l'UI.
 */
export function useAutoSave(
  value: string,
  save: (value: string) => Promise<void>,
  options: UseAutoSaveOptions = {},
): UseAutoSaveResult {
  const { debounceMs = 1500, initialValue } = options;

  const [status, setStatus] = useState<AutoSaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);
  const lastSavedValue = useRef<string>(initialValue ?? value);
  const inFlightController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (value === lastSavedValue.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      // Annule la précédente en vol si elle existe
      inFlightController.current?.abort();
      const controller = new AbortController();
      inFlightController.current = controller;

      setStatus('saving');
      setError(null);
      try {
        await save(value);
        if (controller.signal.aborted) return;
        lastSavedValue.current = value;
        setLastSavedAt(new Date());
        setStatus('saved');
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Erreur de sauvegarde');
        setStatus('error');
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return { status, lastSavedAt, error };
}
