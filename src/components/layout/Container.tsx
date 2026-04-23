import { forwardRef } from 'react';
import type { HTMLAttributes, ElementType } from 'react';
import { cn } from '../../lib/utils';

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

export const Container = forwardRef<HTMLElement, ContainerProps>(
  ({ as, className, ...props }, ref) => {
    const Component = (as ?? 'div') as ElementType;
    return (
      <Component
        ref={ref}
        className={cn('mx-auto w-full max-w-[1280px] px-6 md:px-8', className)}
        {...props}
      />
    );
  },
);

Container.displayName = 'Container';
