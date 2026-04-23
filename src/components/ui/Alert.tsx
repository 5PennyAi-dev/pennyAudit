import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type AlertVariant = 'error' | 'info' | 'success';

export interface AlertProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant;
  heading?: ReactNode;
}

const variants: Record<AlertVariant, string> = {
  error: 'border-danger/30 bg-danger/5 text-danger',
  info: 'border-navy-600/20 bg-navy-50 text-navy-600',
  success: 'border-success/30 bg-success/10 text-success',
};

const icons: Record<AlertVariant, ReactNode> = {
  error: (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="8.5" />
      <line x1="10" y1="6" x2="10" y2="11" />
      <circle cx="10" cy="14" r="0.5" fill="currentColor" />
    </svg>
  ),
  info: (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="8.5" />
      <line x1="10" y1="14" x2="10" y2="9" />
      <circle cx="10" cy="6" r="0.5" fill="currentColor" />
    </svg>
  ),
  success: (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="5 10.5 9 14 15 7" />
    </svg>
  ),
};

export function Alert({
  variant = 'info',
  heading,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
        variants[variant],
        className,
      )}
      {...props}
    >
      <span className="mt-0.5">{icons[variant]}</span>
      <div className="flex-1 leading-relaxed">
        {heading && <div className="font-semibold">{heading}</div>}
        {children && <div className={cn(heading && 'mt-0.5')}>{children}</div>}
      </div>
    </div>
  );
}
