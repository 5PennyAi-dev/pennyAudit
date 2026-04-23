import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  helperText?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      className,
      type = 'text',
      label,
      error,
      helperText,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const reactId = useId();
    const inputId = id ?? `input-${reactId}`;
    const descriptionId = `${inputId}-description`;
    const hasError = Boolean(error);
    const hintText = error ?? helperText;
    const describedBy = [
      hintText ? descriptionId : undefined,
      ariaDescribedBy,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label
            htmlFor={inputId}
            className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted"
          >
            {label}
          </label>
        )}

        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          className={cn(
            'h-11 w-full rounded-lg border-[1.5px] bg-white px-4 text-base font-sans text-navy-600 placeholder:text-muted transition-colors',
            'focus:outline-none focus:ring-[3px]',
            hasError
              ? 'border-danger focus:border-danger focus:ring-danger/20'
              : 'border-line focus:border-orange-500 focus:ring-orange-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-cream',
            className,
          )}
          {...props}
        />

        {hintText && (
          <p
            id={descriptionId}
            className={cn(
              'text-xs leading-relaxed',
              hasError ? 'text-danger' : 'text-muted',
            )}
          >
            {hintText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
