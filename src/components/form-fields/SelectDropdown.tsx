import { forwardRef } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import {
  FieldShell,
  describedBy,
  inputBorderClasses,
} from './FieldShell';

export interface SelectOption<V extends string = string> {
  value: V;
  label: ReactNode;
}

export interface SelectDropdownProps<V extends string = string>
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    'onChange' | 'value' | 'children'
  > {
  id: string;
  label: ReactNode;
  helperText?: ReactNode;
  error?: string;
  required?: boolean;
  value: V | undefined;
  onChange: (value: V) => void;
  options: ReadonlyArray<SelectOption<V>>;
  placeholder?: string;
}

function SelectDropdownInner<V extends string = string>(
  {
    id,
    label,
    helperText,
    error,
    required,
    value,
    onChange,
    options,
    placeholder = 'Sélectionnez…',
    disabled,
    className,
    ...props
  }: SelectDropdownProps<V>,
  ref: React.Ref<HTMLSelectElement>,
) {
  const hasError = Boolean(error);

  return (
    <FieldShell
      id={id}
      label={label}
      helperText={helperText}
      error={error}
      required={required}
    >
      <div className="relative">
        <select
          ref={ref}
          id={id}
          value={value ?? ''}
          onChange={(event) => onChange(event.target.value as V)}
          disabled={disabled}
          required={required}
          aria-required={required || undefined}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy(id, error, helperText)}
          className={cn(
            'h-11 w-full appearance-none rounded-lg border-[1.5px] bg-white px-4 pr-10 text-base font-sans text-navy-600 transition-colors',
            'focus:outline-none focus:ring-[3px]',
            inputBorderClasses(hasError),
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-cream',
            !value && 'text-muted',
            className,
          )}
          {...props}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="5 8 10 13 15 8" />
        </svg>
      </div>
    </FieldShell>
  );
}

export const SelectDropdown = forwardRef(SelectDropdownInner) as <
  V extends string = string,
>(
  props: SelectDropdownProps<V> & { ref?: React.Ref<HTMLSelectElement> },
) => ReturnType<typeof SelectDropdownInner>;
