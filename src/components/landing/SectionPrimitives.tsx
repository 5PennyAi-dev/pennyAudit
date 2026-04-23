import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export function SectionLabel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5 rounded-full border border-orange-500/20 bg-orange-50 px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-500',
        className,
      )}
      {...props}
    >
      <span className="size-1.5 rounded-full bg-orange-500" />
      {children}
    </span>
  );
}

export function SectionTitle({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement> & { children: ReactNode }) {
  return (
    <h2
      className={cn(
        'max-w-[820px] text-[clamp(36px,4vw,52px)] font-bold leading-[1.1] tracking-[-0.025em] text-navy-600',
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  );
}
