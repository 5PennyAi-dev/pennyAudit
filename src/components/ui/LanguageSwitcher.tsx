import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../lib/i18n';

export type LanguageSwitcherVariant = 'dark' | 'light';

export interface LanguageSwitcherProps {
  variant?: LanguageSwitcherVariant;
  className?: string;
}

const wrapperStyles: Record<LanguageSwitcherVariant, string> = {
  dark: 'border-white/15 text-white/60',
  light: 'border-line text-muted',
};

const buttonBase =
  'rounded-[3px] px-2 py-0.5 font-mono text-xs font-medium uppercase tracking-[0.05em] transition-colors cursor-pointer';

const buttonInactive: Record<LanguageSwitcherVariant, string> = {
  dark: 'hover:text-white/90',
  light: 'hover:text-navy-600',
};

const buttonActive: Record<LanguageSwitcherVariant, string> = {
  dark: 'bg-white/10 text-white',
  light: 'bg-navy-600/5 text-navy-600',
};

export function LanguageSwitcher({
  variant = 'dark',
  className,
}: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? 'fr').slice(
    0,
    2,
  ) as SupportedLanguage;

  const handleChange = (lng: SupportedLanguage) => {
    if (lng === current) return;
    void i18n.changeLanguage(lng);
  };

  return (
    <div
      role="group"
      aria-label="Langue / Language"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border p-1',
        wrapperStyles[variant],
        className,
      )}
    >
      {SUPPORTED_LANGUAGES.map((lng) => {
        const active = current === lng;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => handleChange(lng)}
            aria-pressed={active}
            className={cn(
              buttonBase,
              active ? buttonActive[variant] : buttonInactive[variant],
            )}
          >
            {lng.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
