import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface CheckboxSingleProps {
  id: string;
  label: ReactNode;
  helperText?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: boolean;
  onChange: (value: boolean) => void;
  className?: string;
}

export function CheckboxSingle({
  id,
  label,
  helperText,
  error,
  required,
  disabled,
  value,
  onChange,
  className,
}: CheckboxSingleProps) {
  const hasError = Boolean(error);
  const describedById = error ? `${id}-error` : helperText ? `${id}-description` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-lg border-[1.5px] bg-white px-4 py-3 text-sm transition-colors',
          'hover:border-orange-300',
          value
            ? 'border-orange-500 bg-orange-50/40'
            : hasError
              ? 'border-danger/60'
              : 'border-line',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <input
          type="checkbox"
          id={id}
          checked={value}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedById}
          onChange={(event) => onChange(event.target.checked)}
          className="sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors',
            value
              ? 'border-orange-500 bg-orange-500 text-white'
              : 'border-line bg-white',
          )}
        >
          {value && (
            <svg
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3"
            >
              <polyline points="5 10.5 9 14 15 7" />
            </svg>
          )}
        </span>
        <span className="flex-1 font-medium text-navy-600">
          {label}
          {required && (
            <span className="ml-1 text-orange-500" aria-hidden="true">
              *
            </span>
          )}
        </span>
      </label>

      {helperText && !error && (
        <p id={`${id}-description`} className="pl-4 text-xs leading-relaxed text-muted">
          {helperText}
        </p>
      )}

      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="pl-4 text-xs leading-relaxed text-danger"
        >
          {error}
        </p>
      )}
    </div>
  );
}
