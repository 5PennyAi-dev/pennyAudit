import { forwardRef } from 'react';
import type { TextareaHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import {
  FieldShell,
  describedBy,
  inputBorderClasses,
} from './FieldShell';

export interface TextAreaInputProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    'onChange' | 'value'
  > {
  id: string;
  label: ReactNode;
  helperText?: ReactNode;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  minLength?: number;
  maxLength?: number;
  rows?: number;
  showCounter?: boolean;
}

export const TextAreaInput = forwardRef<HTMLTextAreaElement, TextAreaInputProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      required,
      value,
      onChange,
      disabled,
      className,
      minLength,
      maxLength,
      rows = 5,
      showCounter = true,
      ...props
    },
    ref,
  ) => {
    const hasError = Boolean(error);
    const count = value?.length ?? 0;
    const tooShort = minLength !== undefined && count > 0 && count < minLength;

    const counterText =
      maxLength !== undefined
        ? `${count} / ${maxLength}`
        : minLength !== undefined
          ? `${count} / ${minLength} min`
          : `${count}`;

    const counter = showCounter && (minLength || maxLength) ? (
      <span
        className={cn(
          'font-mono text-[11px] tracking-[0.04em]',
          tooShort ? 'text-orange-600' : 'text-muted',
        )}
      >
        {counterText}
      </span>
    ) : undefined;

    return (
      <FieldShell
        id={id}
        label={label}
        helperText={helperText}
        error={error}
        required={required}
        rightAdornment={counter}
      >
        <textarea
          ref={ref}
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          rows={rows}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy(id, error, helperText)}
          className={cn(
            'w-full resize-y rounded-lg border-[1.5px] bg-white px-4 py-3 text-base font-sans text-navy-600 placeholder:text-muted transition-colors',
            'focus:outline-none focus:ring-[3px]',
            inputBorderClasses(hasError),
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-cream',
            className,
          )}
          {...props}
        />
      </FieldShell>
    );
  },
);

TextAreaInput.displayName = 'TextAreaInput';
