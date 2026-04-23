import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export interface FormNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  showBack?: boolean;
  nextLabel?: string;
  backLabel?: string;
  nextDisabled?: boolean;
  isSubmitting?: boolean;
  isFinalScreen?: boolean;
  className?: string;
}

export function FormNavigation({
  onBack,
  onNext,
  showBack = true,
  nextLabel,
  backLabel = 'Précédent',
  nextDisabled,
  isSubmitting,
  isFinalScreen,
  className,
}: FormNavigationProps) {
  const label = nextLabel ?? (isFinalScreen ? 'Lancer mon audit' : 'Suivant');

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 border-t border-line pt-6',
        className,
      )}
    >
      {showBack ? (
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="12 5 7 10 12 15" />
          </svg>
          {backLabel}
        </Button>
      ) : (
        <span />
      )}

      <Button
        type="submit"
        variant="primary"
        size={isFinalScreen ? 'lg' : 'md'}
        onClick={onNext}
        disabled={nextDisabled || isSubmitting}
      >
        {isSubmitting ? 'Un instant…' : label}
        {!isFinalScreen && (
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="8 5 13 10 8 15" />
          </svg>
        )}
      </Button>
    </div>
  );
}
