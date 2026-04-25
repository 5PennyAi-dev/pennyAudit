import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

// ─────────────────────────────────────────────────────────────
// Section shell
// ─────────────────────────────────────────────────────────────

export function SectionShell({
  title,
  subtitle,
  children,
  meta,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 sm:p-6 flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-navy-600">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
        {meta && <div className="shrink-0">{meta}</div>}
      </header>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

export function Subsection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <h4 className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
        {title}
      </h4>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Confidence badge
// ─────────────────────────────────────────────────────────────

export function ConfidenceBadge({ level }: { level?: string | null }) {
  if (!level) return null;
  const normalized = String(level).toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    high: { label: 'Confiance élevée', cls: 'bg-success-bg text-success border-success/40' },
    medium: { label: 'Confiance moyenne', cls: 'bg-navy-50 text-navy-600 border-navy-100' },
    low: { label: 'Confiance faible', cls: 'bg-warning-bg text-warning border-warning/40' },
  };
  const entry = map[normalized] ?? {
    label: `Confiance : ${normalized}`,
    cls: 'bg-cream text-muted border-line',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
        entry.cls,
      )}
      title={`confidence_level = ${level}`}
    >
      {entry.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Score bubble (impact / effort 1-10)
// ─────────────────────────────────────────────────────────────

export function ScoreBubble({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'navy' | 'orange';
}) {
  const cls =
    tone === 'orange'
      ? 'bg-orange-50 text-orange-700 border-orange-200'
      : 'bg-navy-50 text-navy-600 border-navy-100';
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1',
        cls,
      )}
    >
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em]">
        {label}
      </span>
      <span className="font-mono text-sm font-bold">{value}/10</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pattern source link (vers Github du repo patterns)
// ─────────────────────────────────────────────────────────────

const PATTERNS_REPO_BASE =
  'https://github.com/5PennyAi/pennyAudit-patterns/tree/main';

export function PatternSourceLink({ patternId }: { patternId: string }) {
  return (
    <a
      href={`${PATTERNS_REPO_BASE}#${patternId}`}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex items-center gap-1 rounded-full border border-line bg-cream px-2 py-0.5 font-mono text-[10px] font-medium text-navy-600 hover:bg-white hover:border-orange-500 transition-colors"
      title={`Pattern source — ${patternId}`}
    >
      ↗ {patternId}
    </a>
  );
}

export function PatternSourceList({ ids }: { ids?: string[] | null }) {
  if (!ids || ids.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id) => (
        <PatternSourceLink key={id} patternId={id} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Severity / priority pills
// ─────────────────────────────────────────────────────────────

export function SeverityPill({ severity }: { severity?: string | null }) {
  if (!severity) return null;
  const v = String(severity).toLowerCase();
  const map: Record<string, string> = {
    faible: 'bg-success-bg text-success border-success/40',
    moyenne: 'bg-navy-50 text-navy-600 border-navy-100',
    elevee: 'bg-warning-bg text-warning border-warning/40',
    critique: 'bg-danger-bg text-danger border-danger/40',
  };
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
        map[v] ?? 'bg-cream text-muted border-line',
      )}
    >
      {v}
    </span>
  );
}

export function PriorityPill({ priority }: { priority?: string | null }) {
  if (!priority) return null;
  const v = String(priority).toLowerCase();
  const labels: Record<string, string> = {
    prerequis: 'Prérequis',
    fortement_recommande: 'Fortement recommandé',
    optionnel: 'Optionnel',
  };
  const map: Record<string, string> = {
    prerequis: 'bg-danger-bg text-danger border-danger/40',
    fortement_recommande: 'bg-warning-bg text-warning border-warning/40',
    optionnel: 'bg-cream text-muted border-line',
  };
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
        map[v] ?? 'bg-cream text-muted border-line',
      )}
    >
      {labels[v] ?? v}
    </span>
  );
}

export function DifficultyPill({ value }: { value?: string | null }) {
  if (!value) return null;
  const v = String(value).toLowerCase();
  const labels: Record<string, string> = {
    facile: 'Facile',
    moderee: 'Modérée',
    complexe: 'Complexe',
    non_realisable_sans_prerequis: 'Prérequis manquants',
  };
  const map: Record<string, string> = {
    facile: 'bg-success-bg text-success border-success/40',
    moderee: 'bg-navy-50 text-navy-600 border-navy-100',
    complexe: 'bg-warning-bg text-warning border-warning/40',
    non_realisable_sans_prerequis: 'bg-danger-bg text-danger border-danger/40',
  };
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
        map[v] ?? 'bg-cream text-muted border-line',
      )}
    >
      {labels[v] ?? v}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Path label
// ─────────────────────────────────────────────────────────────

export function pathLabel(path?: string | null): string {
  if (!path) return '—';
  switch (path) {
    case 'voie_a_self_serve':
      return 'Voie A — self-serve';
    case 'voie_b_accompagne':
      return 'Voie B — accompagné';
    case 'voie_c_custom':
      return 'Voie C — custom';
    case 'mixte':
      return 'Mixte';
    default:
      return path;
  }
}

// ─────────────────────────────────────────────────────────────
// Empty / fallback
// ─────────────────────────────────────────────────────────────

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted italic">{children}</p>;
}

// Helper d'accès défensif pour rendu human (les outputs peuvent dévier)
export function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

export function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function asObject(v: unknown): Record<string, unknown> | null {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return null;
}

// Highlight callout (cream + bordure orange) pour sections sensibles
export function HighlightCallout({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border-l-4 border-orange-500 border border-line bg-cream p-4">
      {title && (
        <h5 className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-orange-700 mb-2">
          {title}
        </h5>
      )}
      <div className="text-sm text-navy-600 leading-relaxed">{children}</div>
    </div>
  );
}
