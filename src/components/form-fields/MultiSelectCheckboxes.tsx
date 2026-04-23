import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { FieldShell } from './FieldShell';

export interface MultiSelectOption<V extends string = string> {
  value: V;
  label: ReactNode;
}

export interface MultiSelectCheckboxesProps<V extends string = string> {
  id: string;
  label: ReactNode;
  helperText?: ReactNode;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  value: V[] | undefined;
  onChange: (value: V[]) => void;
  options: ReadonlyArray<MultiSelectOption<V>>;
  columns?: 1 | 2;
}

export function MultiSelectCheckboxes<V extends string = string>({
  id,
  label,
  helperText,
  error,
  required,
  disabled,
  value,
  onChange,
  options,
  columns = 2,
}: MultiSelectCheckboxesProps<V>) {
  const selected = value ?? [];
  const hasError = Boolean(error);

  const toggle = (v: V) => {
    if (selected.includes(v)) {
      onChange(selected.filter((s) => s !== v));
    } else {
      onChange([...selected, v]);
    }
  };

  return (
    <FieldShell
      id={id}
      label={label}
      helperText={helperText}
      error={error}
      required={required}
    >
      <div
        role="group"
        aria-required={required || undefined}
        aria-invalid={hasError || undefined}
        className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}
      >
        {options.map((option) => {
          const optionId = `${id}-${option.value}`;
          const checked = selected.includes(option.value);
          return (
            <label
              key={option.value}
              htmlFor={optionId}
              className={cn(
                'group flex cursor-pointer items-start gap-3 rounded-lg border-[1.5px] bg-white px-4 py-3 text-sm transition-colors',
                'hover:border-orange-300',
                checked
                  ? 'border-orange-500 bg-orange-50/40'
                  : hasError
                    ? 'border-danger/60'
                    : 'border-line',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="checkbox"
                id={optionId}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors',
                  checked
                    ? 'border-orange-500 bg-orange-500 text-white'
                    : 'border-line bg-white group-hover:border-orange-400',
                )}
              >
                {checked && (
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
              <span className="font-medium text-navy-600">{option.label}</span>
            </label>
          );
        })}
      </div>
    </FieldShell>
  );
}
