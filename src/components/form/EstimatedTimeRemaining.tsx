import { cn } from '../../lib/utils';
import type { ScreenId } from '../../types/intake';
import { TOTAL_SCREENS } from '../../types/intake';

const SECONDS_PER_SCREEN = 45;

export interface EstimatedTimeRemainingProps {
  current: ScreenId;
  total?: number;
  secondsPerScreen?: number;
  className?: string;
}

export function EstimatedTimeRemaining({
  current,
  total = TOTAL_SCREENS,
  secondsPerScreen = SECONDS_PER_SCREEN,
  className,
}: EstimatedTimeRemainingProps) {
  const remainingScreens = Math.max(0, total - current);
  const seconds = remainingScreens * secondsPerScreen;
  const minutes = Math.max(1, Math.round(seconds / 60));

  if (remainingScreens === 0) return null;

  return (
    <p
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-muted',
        className,
      )}
    >
      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="size-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="10" cy="10" r="8" />
        <polyline points="10 5 10 10 13 12" />
      </svg>
      Environ {minutes} min restantes
    </p>
  );
}
