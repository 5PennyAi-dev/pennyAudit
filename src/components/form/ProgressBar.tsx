import { cn } from '../../lib/utils';
import type { ScreenId } from '../../types/intake';
import { TOTAL_SCREENS } from '../../types/intake';

export interface ProgressBarProps {
  current: ScreenId;
  total?: number;
  className?: string;
}

export function ProgressBar({
  current,
  total = TOTAL_SCREENS,
  className,
}: ProgressBarProps) {
  const pct = Math.round((current / total) * 100);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Étape {current} sur {total}
        </span>
        <span className="font-mono text-[11px] tracking-[0.04em] text-muted">
          {pct}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-label={`Étape ${current} sur ${total}`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
