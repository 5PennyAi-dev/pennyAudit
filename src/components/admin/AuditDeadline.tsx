import { cn } from '../../lib/utils';

interface AuditDeadlineProps {
  /** Secondes restantes avant la deadline (positif = en retard, négatif = encore à temps). */
  overdueSeconds: number;
  /** Si true, le SLA n'a plus de sens (audit déjà livré/approuvé). Affiche un tiret. */
  inactive?: boolean;
}

function formatDuration(absSeconds: number): string {
  const days = Math.floor(absSeconds / 86400);
  const hours = Math.floor((absSeconds % 86400) / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  if (days >= 1) return `${days}j ${hours}h`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function AuditDeadline({ overdueSeconds, inactive }: AuditDeadlineProps) {
  if (inactive) {
    return <span className="text-muted">—</span>;
  }
  const isOverdue = overdueSeconds > 0;
  const abs = Math.abs(overdueSeconds);
  const label = isOverdue ? `Dépassé de ${formatDuration(abs)}` : `Reste ${formatDuration(abs)}`;
  return (
    <span
      className={cn(
        'font-mono text-xs',
        isOverdue ? 'text-danger font-semibold' : 'text-navy-600',
      )}
      title={`SLA 48h depuis la création de l'audit`}
    >
      {label}
    </span>
  );
}

export default AuditDeadline;
