import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface FieldShellProps {
  id: string;
  label: ReactNode;
  helperText?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  rightAdornment?: ReactNode;
}

export function FieldShell({
  id,
  label,
  helperText,
  error,
  required,
  children,
  className,
  rightAdornment,
}: FieldShellProps) {
  const descriptionId = `${id}-description`;
  const errorId = `${id}-error`;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="font-sans text-sm font-semibold text-navy-600"
        >
          {label}
          {required && (
            <span className="ml-1 text-orange-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {rightAdornment}
      </div>

      {children}

      {helperText && !error && (
        <p id={descriptionId} className="text-xs leading-relaxed text-muted">
          {helperText}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-start gap-1.5 text-xs leading-relaxed text-danger"
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="mt-0.5 size-3.5 shrink-0"
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
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export function describedBy(id: string, error?: string, helperText?: unknown) {
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  if (error) return errorId;
  if (helperText) return descriptionId;
  return undefined;
}

export const baseInputClasses =
  'h-11 w-full rounded-lg border-[1.5px] bg-white px-4 text-base font-sans text-navy-600 placeholder:text-muted transition-colors focus:outline-none focus:ring-[3px] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-cream';

export function inputBorderClasses(hasError: boolean) {
  return hasError
    ? 'border-danger focus:border-danger focus:ring-danger/20'
    : 'border-line focus:border-orange-500 focus:ring-orange-500/20';
}
