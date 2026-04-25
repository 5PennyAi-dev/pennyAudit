import { cn } from '../../lib/utils';

export type AuditTabId =
  | 'intake'
  | 'context'
  | 'opportunities'
  | 'risks'
  | 'stack'
  | 'report'
  | 'notes';

export interface AuditTab {
  id: AuditTabId;
  label: string;
}

export const AUDIT_TABS: AuditTab[] = [
  { id: 'intake', label: 'Intake' },
  { id: 'context', label: 'Contexte' },
  { id: 'opportunities', label: 'Opportunités' },
  { id: 'risks', label: 'Risques' },
  { id: 'stack', label: 'Stack' },
  { id: 'report', label: 'Rapport final' },
  { id: 'notes', label: 'Notes & historique' },
];

interface AuditTabsProps {
  active: AuditTabId;
  onChange: (id: AuditTabId) => void;
}

export function AuditTabs({ active, onChange }: AuditTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Sections de l'audit"
      className="flex gap-1 overflow-x-auto rounded-2xl border border-line bg-paper p-1.5"
    >
      {AUDIT_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-orange-500/40',
              isActive
                ? 'bg-navy-600 text-white'
                : 'text-navy-600 hover:bg-cream',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default AuditTabs;
