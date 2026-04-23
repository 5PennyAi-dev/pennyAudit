import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type StepState = 'pending' | 'active' | 'done';

export interface StepIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  state: StepState;
  number: number;
}

const base =
  'inline-flex size-[26px] shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold leading-none transition-all duration-200';

const states: Record<StepState, string> = {
  pending: 'bg-cream border-[1.5px] border-line text-muted',
  active:
    'bg-orange-500 text-white ring-4 ring-orange-500/20 shadow-(--shadow-orange-glow)',
  done: 'bg-navy-600 text-white border-[1.5px] border-navy-600',
};

export const StepIndicator = forwardRef<HTMLSpanElement, StepIndicatorProps>(
  ({ state, number, className, ...props }, ref) => {
    const label =
      state === 'done'
        ? `Étape ${number} terminée`
        : state === 'active'
          ? `Étape ${number} en cours`
          : `Étape ${number} à venir`;

    return (
      <span
        ref={ref}
        role="status"
        aria-label={label}
        className={cn(base, states[state], className)}
        {...props}
      >
        {state === 'done' ? (
          <svg
            viewBox="0 0 14 14"
            aria-hidden="true"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 7.5 6 10.5 11 4" />
          </svg>
        ) : (
          number
        )}
      </span>
    );
  },
);

StepIndicator.displayName = 'StepIndicator';
