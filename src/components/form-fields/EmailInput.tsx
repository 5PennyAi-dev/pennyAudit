import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { TextInput } from './TextInput';
import type { TextInputProps } from './TextInput';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export interface EmailInputProps
  extends Omit<TextInputProps, 'type' | 'label'> {
  label?: ReactNode;
}

export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  ({ label = 'Courriel', autoComplete = 'email', inputMode = 'email', ...props }, ref) => (
    <TextInput
      ref={ref}
      type="email"
      label={label}
      autoComplete={autoComplete}
      inputMode={inputMode}
      {...props}
    />
  ),
);

EmailInput.displayName = 'EmailInput';
