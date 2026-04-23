import { Badge, ProgressBar, StepIndicator } from '../ui';
import type { StepState } from '../ui';
import { cn } from '../../lib/utils';

export interface AuditCardStep {
  label: string;
  time: string;
  state: StepState;
}

export interface AuditCardProps {
  label: string;
  clientName: string;
  statusLabel: string;
  steps: AuditCardStep[];
  progressValue: number;
  progressLabel?: string;
  etaLabel?: string;
  className?: string;
}

export function AuditCard({
  label,
  clientName,
  statusLabel,
  steps,
  progressValue,
  progressLabel,
  etaLabel,
  className,
}: AuditCardProps) {
  return (
    <div
      className={cn(
        'relative -rotate-1 rounded-2xl bg-white p-7 text-navy-600 shadow-[0_30px_80px_-20px_rgb(0_0_0_/_0.4),_0_8px_24px_-8px_rgb(245_125_32_/_0.15)] transition-transform duration-300 ease-out hover:rotate-0 hover:-translate-y-1',
        className,
      )}
    >
      {/* Halo orange flouté derrière la carte */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-3 -right-3 -z-10 size-16 rounded-full bg-orange-500/90 blur-3xl"
      />

      {/* Header */}
      <header className="flex items-start justify-between gap-4 border-b border-line pb-5">
        <div className="min-w-0">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            {label}
          </div>
          <div className="mt-1 truncate text-lg font-bold tracking-[-0.01em] text-navy-600">
            {clientName}
          </div>
        </div>
        <Badge variant="status" withDot>
          {statusLabel}
        </Badge>
      </header>

      {/* Steps */}
      <ol className="mt-6 flex flex-col gap-3.5">
        {steps.map((step, idx) => (
          <li key={idx} className="flex items-center gap-3.5">
            <StepIndicator state={step.state} number={idx + 1} />
            <span
              className={cn(
                'flex-1 text-sm',
                step.state === 'pending'
                  ? 'text-muted'
                  : 'font-medium text-navy-600',
              )}
            >
              {step.label}
            </span>
            <span className="font-mono text-[11px] text-muted">
              {step.time}
            </span>
          </li>
        ))}
      </ol>

      {/* Progress */}
      <div className="mt-6 flex items-center gap-4 border-t border-line pt-5">
        {progressLabel && (
          <span className="font-mono text-[11px] font-medium text-muted">
            {progressLabel}
          </span>
        )}
        <ProgressBar
          value={progressValue}
          className="flex-1"
          animated={steps.some((s) => s.state === 'active')}
        />
        {etaLabel && (
          <span className="font-mono text-[11px] font-medium text-muted">
            {etaLabel}
          </span>
        )}
      </div>
    </div>
  );
}
