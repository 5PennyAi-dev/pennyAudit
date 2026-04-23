import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { FieldShell } from './FieldShell';

export interface RadioOption<V extends string = string> {
  value: V;
  label: ReactNode;
  description?: ReactNode;
}

export interface RadioGroupProps<V extends string = string> {
  id: string;
  label: ReactNode;
  helperText?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: V | undefined;
  onChange: (value: V) => void;
  options: ReadonlyArray<RadioOption<V>>;
  name?: string;
  columns?: 1 | 2;
}

export function RadioGroup<V extends string = string>({
  id,
  label,
  helperText,
  error,
  required,
  disabled,
  value,
  onChange,
  options,
  name,
  columns = 1,
}: RadioGroupProps<V>) {
  const groupName = name ?? id;
  const hasError = Boolean(error);

  return (
    <FieldShell
      id={id}
      label={label}
      helperText={helperText}
      error={error}
      required={required}
    >
      <div
        role="radiogroup"
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        className={cn(
          'grid gap-2',
          columns === 2 && 'sm:grid-cols-2',
        )}
      >
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'group flex cursor-pointer items-start gap-3 rounded-lg border-[1.5px] bg-white px-4 py-3 text-sm transition-colors',
                'hover:border-orange-300',
                checked
                  ? 'border-orange-500 bg-orange-50/40 ring-[3px] ring-orange-500/20'
                  : hasError
                    ? 'border-danger/60'
                    : 'border-line',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                id={optionId}
                name={groupName}
                value={option.value}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
                  checked
                    ? 'border-orange-500 bg-white'
                    : 'border-line bg-white group-hover:border-orange-400',
                )}
              >
                {checked && (
                  <span className="size-2.5 rounded-full bg-orange-500" />
                )}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-medium text-navy-600">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-muted">{option.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}
