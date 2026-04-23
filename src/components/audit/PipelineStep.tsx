import { cn } from '../../lib/utils';
import type { UiStep } from '../../hooks/useAuditProgress';

export interface PipelineStepProps {
  step: UiStep;
  index: number;
  total: number;
}

export function PipelineStep({ step, index, total }: PipelineStepProps) {
  const isLast = index === total - 1;

  return (
    <li className="relative flex items-start gap-4">
      {!isLast && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-[13px] top-[30px] h-[calc(100%-8px)] w-0.5',
            step.state === 'done' ? 'bg-navy-600' : 'bg-line',
          )}
        />
      )}

      <span
        aria-hidden="true"
        className={cn(
          'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
          step.state === 'pending' && 'border-line bg-cream',
          step.state === 'running' &&
            'border-orange-500 bg-orange-500 text-white ring-4 ring-orange-500/20',
          step.state === 'done' && 'border-navy-600 bg-navy-600 text-white',
        )}
      >
        {step.state === 'done' ? (
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <polyline points="5 10.5 9 14 15 7" />
          </svg>
        ) : step.state === 'running' ? (
          <span className="size-2.5 rounded-full bg-white/90 animate-pulse" />
        ) : (
          <span className="font-mono text-xs font-semibold text-muted">
            {index + 1}
          </span>
        )}
      </span>

      <div className="flex flex-1 flex-col gap-1 pb-7 pt-0.5">
        <p
          className={cn(
            'font-sans text-base font-semibold',
            step.state === 'pending' ? 'text-muted' : 'text-navy-600',
          )}
        >
          {step.label}
        </p>
        {step.state === 'running' && (
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-orange-500">
            En cours…
          </p>
        )}
      </div>
    </li>
  );
}
