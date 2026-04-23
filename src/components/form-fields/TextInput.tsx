import { forwardRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/utils';
import {
  FieldShell,
  baseInputClasses,
  describedBy,
  inputBorderClasses,
} from './FieldShell';

export interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  id: string;
  label: ReactNode;
  helperText?: ReactNode;
  error?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
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
      type = 'text',
      ...props
    },
    ref,
  ) => {
    const hasError = Boolean(error);

    return (
      <FieldShell
        id={id}
        label={label}
        helperText={helperText}
        error={error}
        required={required}
      >
        <input
          ref={ref}
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy(id, error, helperText)}
          className={cn(baseInputClasses, inputBorderClasses(hasError), className)}
          {...props}
        />
      </FieldShell>
    );
  },
);

TextInput.displayName = 'TextInput';
