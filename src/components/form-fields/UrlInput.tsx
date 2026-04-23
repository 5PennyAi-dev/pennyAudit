import { forwardRef } from 'react';
import type { ReactNode } from 'react';
import { TextInput } from './TextInput';
import type { TextInputProps } from './TextInput';

export function isValidUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

export interface UrlInputProps extends Omit<TextInputProps, 'type' | 'label'> {
  label?: ReactNode;
}

export const UrlInput = forwardRef<HTMLInputElement, UrlInputProps>(
  (
    {
      label = 'Site web',
      autoComplete = 'url',
      inputMode = 'url',
      placeholder = 'https://votreentreprise.com',
      ...props
    },
    ref,
  ) => (
    <TextInput
      ref={ref}
      type="url"
      label={label}
      autoComplete={autoComplete}
      inputMode={inputMode}
      placeholder={placeholder}
      {...props}
    />
  ),
);

UrlInput.displayName = 'UrlInput';
