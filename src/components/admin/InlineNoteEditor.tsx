import { useEffect, useRef, useState } from 'react';
import { useAutoSave } from '../../hooks/useAutoSave';
import { cn } from '../../lib/utils';

export type NoteSection =
  | 'context'
  | 'opportunities'
  | 'risks'
  | 'stack'
  | 'report'
  | 'global';

interface InlineNoteEditorProps {
  auditId: string;
  section: NoteSection;
  initialValue: string;
  /** Notifié à chaque save réussi avec la valeur enregistrée. */
  onSaved?: (value: string) => void;
  /** Texte du label affiché au-dessus du textarea. */
  label?: string;
  /** Hauteur min/max en lignes (rows). Défaut 3 / 12. */
  minRows?: number;
  maxRows?: number;
}

function formatRelativeSeconds(secondsAgo: number): string {
  if (secondsAgo < 5) return 'à l\'instant';
  if (secondsAgo < 60) return `il y a ${secondsAgo}s`;
  const minutes = Math.floor(secondsAgo / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `il y a ${hours} h`;
}

export function InlineNoteEditor({
  auditId,
  section,
  initialValue,
  onSaved,
  label = 'Notes de révision',
  minRows = 3,
  maxRows = 12,
}: InlineNoteEditorProps) {
  const [value, setValue] = useState(initialValue ?? '');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [tick, setTick] = useState(0);

  // Auto-resize
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const lineHeight = 22; // approx px
    const min = lineHeight * minRows;
    const max = lineHeight * maxRows;
    const next = Math.max(min, Math.min(max, ta.scrollHeight));
    ta.style.height = `${next}px`;
  }, [value, minRows, maxRows]);

  const { status, lastSavedAt, error } = useAutoSave(
    value,
    async (next) => {
      const res = await fetch(`/api/admin/audits/${auditId}/notes/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ section, content: next }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status} ${body}`);
      }
      onSaved?.(next);
    },
    { initialValue: initialValue ?? '' },
  );

  // Re-render toutes les 30s pour rafraîchir le « il y a Xs »
  useEffect(() => {
    if (!lastSavedAt) return;
    const interval = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => window.clearInterval(interval);
  }, [lastSavedAt]);

  void tick; // anti-warning

  let indicator: string;
  let indicatorCls: string;
  if (status === 'saving') {
    indicator = '· Sauvegarde…';
    indicatorCls = 'text-muted';
  } else if (status === 'error') {
    indicator = `· Erreur : ${error ?? 'sauvegarde échouée'}`;
    indicatorCls = 'text-danger';
  } else if (lastSavedAt) {
    const seconds = Math.floor((Date.now() - lastSavedAt.getTime()) / 1000);
    indicator = `· Sauvegardé ${formatRelativeSeconds(seconds)}`;
    indicatorCls = 'text-success';
  } else {
    indicator = '';
    indicatorCls = 'text-muted';
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-cream/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <label
          htmlFor={`note-${auditId}-${section}`}
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted"
        >
          {label}
        </label>
        <span className={cn('font-mono text-[10px]', indicatorCls)}>{indicator}</span>
      </div>
      <textarea
        ref={textareaRef}
        id={`note-${auditId}-${section}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={minRows}
        className={cn(
          'w-full resize-none rounded-lg border-[1.5px] border-line bg-white px-3 py-2',
          'text-sm font-sans text-navy-600 placeholder:text-muted leading-relaxed',
          'focus:outline-none focus:border-orange-500 focus:ring-[3px] focus:ring-orange-500/20',
        )}
        placeholder="Annoter cette section pendant la révision…"
      />
    </div>
  );
}

export default InlineNoteEditor;
