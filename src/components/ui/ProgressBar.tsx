import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  animated?: boolean;
  showLabel?: boolean;
  label?: string;
}

function clamp(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      value = 0,
      animated = false,
      showLabel = false,
      label,
      className,
      ...props
    },
    ref,
  ) => {
    const pct = clamp(value);
    const displayLabel = label ?? `${Math.round(pct)}%`;

    return (
      <div
        ref={ref}
        className={cn('flex items-center gap-3', className)}
        {...props}
      >
        <div
          role="progressbar"
          aria-valuenow={animated ? undefined : Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={animated ? 'Traitement en cours' : undefined}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"
        >
          <div
            className={cn(
              'h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600',
              animated
                ? 'animate-(--animate-progress-indeterminate)'
                : 'transition-[width] duration-500 ease-out',
            )}
            style={animated ? undefined : { width: `${pct}%` }}
          />
        </div>
        {showLabel && (
          <span className="font-mono text-[11px] font-medium tracking-[0.04em] text-muted tabular-nums">
            {displayLabel}
          </span>
        )}
      </div>
    );
  },
);

ProgressBar.displayName = 'ProgressBar';
