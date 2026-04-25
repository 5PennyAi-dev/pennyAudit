import { cn } from '../../lib/utils';

export type AuditStatus =
  | 'draft'
  | 'running'
  | 'pending_review'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'delivered'
  | 'error';

const labels: Record<AuditStatus, string> = {
  draft: 'Brouillon',
  running: 'En cours',
  pending_review: 'À réviser',
  changes_requested: 'Modifs demandées',
  approved: 'Approuvé',
  rejected: 'Rejeté',
  delivered: 'Livré',
  error: 'Erreur',
};

// Tous les styles passent par les tokens du design system. Aucune couleur hardcodée.
const styles: Record<AuditStatus, string> = {
  draft: 'bg-cream text-muted border-line',
  running: 'bg-navy-50 text-navy-600 border-navy-100',
  pending_review: 'bg-orange-50 text-orange-700 border-orange-200',
  changes_requested: 'bg-warning-bg text-warning border-warning/40',
  approved: 'bg-success-bg text-success border-success/40',
  rejected: 'bg-danger-bg text-danger border-danger/40',
  delivered: 'bg-cream text-navy-600 border-navy-100',
  error: 'bg-danger-bg text-danger border-danger/40',
};

interface AuditStatusBadgeProps {
  status: AuditStatus | string;
  pulse?: boolean;
}

export function AuditStatusBadge({ status, pulse }: AuditStatusBadgeProps) {
  const known = (Object.keys(labels) as AuditStatus[]).includes(status as AuditStatus);
  const s = (known ? status : 'draft') as AuditStatus;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'font-mono text-[10px] font-semibold uppercase tracking-[0.08em]',
        styles[s],
      )}
    >
      {pulse && s === 'running' && (
        <span className="h-1.5 w-1.5 rounded-full bg-navy-600 animate-pulse" />
      )}
      {labels[s]}
    </span>
  );
}

export default AuditStatusBadge;
