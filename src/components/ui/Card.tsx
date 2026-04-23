import { forwardRef } from 'react';
import type { HTMLAttributes, ElementType } from 'react';
import { cn } from '../../lib/utils';

export type CardVariant = 'default' | 'cream' | 'featured';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  as?: ElementType;
}

const base =
  'rounded-2xl p-9 transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-(--shadow-card-hover)';

const variants: Record<CardVariant, string> = {
  default: 'bg-white border border-line shadow-(--shadow-card) text-navy-600',
  cream: 'bg-cream border border-line shadow-(--shadow-card) text-navy-600',
  featured:
    'bg-navy-600 text-white border-2 border-orange-500 scale-[1.03] shadow-(--shadow-featured)',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', as, className, ...props }, ref) => {
    const Component = (as ?? 'div') as ElementType;
    return (
      <Component
        ref={ref}
        className={cn(base, variants[variant], className)}
        {...props}
      />
    );
  },
);

Card.displayName = 'Card';
