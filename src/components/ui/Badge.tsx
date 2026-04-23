import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type BadgeVariant =
  | 'eyebrow'
  | 'tag-primary'
  | 'tag-secondary'
  | 'status';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  withDot?: boolean;
}

const base =
  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold leading-none whitespace-nowrap';

const variants: Record<BadgeVariant, string> = {
  eyebrow:
    'font-mono uppercase tracking-[0.1em] text-orange-500 bg-orange-50 border border-orange-500/20',
  'tag-primary': 'font-sans text-white bg-orange-500',
  'tag-secondary': 'font-sans text-white bg-navy-600',
  status: 'font-mono text-success bg-success/10',
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant = 'tag-primary', withDot = false, className, children, ...props },
    ref,
  ) => (
    <span
      ref={ref}
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {withDot && (
        <span
          aria-hidden="true"
          className="size-1.5 rounded-full bg-current animate-(--animate-pulse-dot)"
        />
      )}
      {children}
    </span>
  ),
);

Badge.displayName = 'Badge';
