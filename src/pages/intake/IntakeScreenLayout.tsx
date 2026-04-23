import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { ProgressBar } from '../../components/form/ProgressBar';
import { EstimatedTimeRemaining } from '../../components/form/EstimatedTimeRemaining';
import type { ScreenId } from '../../types/intake';
import { useIntakeFormStore } from '../../stores/intakeFormStore';

export interface IntakeScreenLayoutProps {
  screen: ScreenId;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  showProgress?: boolean;
  className?: string;
}

export function IntakeScreenLayout({
  screen,
  eyebrow,
  title,
  description,
  children,
  footer,
  showProgress = true,
  className,
}: IntakeScreenLayoutProps) {
  const isSaving = useIntakeFormStore((s) => s.isSaving);
  const lastSavedAt = useIntakeFormStore((s) => s.lastSavedAt);

  return (
    <div className="min-h-dvh bg-paper">
      <div className={cn('mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16', className)}>
        {showProgress && (
          <header className="mb-8">
            <ProgressBar current={screen} />
          </header>
        )}

        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            {eyebrow && (
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-orange-500">
                {eyebrow}
              </span>
            )}
            <h1 className="font-sans text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-navy-600 sm:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="text-base leading-relaxed text-muted">{description}</p>
            )}
          </div>

          <div className="flex flex-col gap-6">{children}</div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-4 text-xs text-muted">
              <EstimatedTimeRemaining current={screen} />
              <SaveIndicator isSaving={isSaving} lastSavedAt={lastSavedAt} />
            </div>
            {footer}
          </div>
        </section>
      </div>
    </div>
  );
}

function SaveIndicator({
  isSaving,
  lastSavedAt,
}: {
  isSaving: boolean;
  lastSavedAt: string | null;
}) {
  if (isSaving) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
        Sauvegarde…
      </span>
    );
  }
  if (lastSavedAt) {
    return (
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-success">
        ✓ Sauvegardé
      </span>
    );
  }
  return null;
}
