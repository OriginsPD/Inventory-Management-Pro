import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export function BentoGrid({ children, className, columns = 4 }: BentoGridProps) {
  const colClass =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4';

  return (
    <div className={cn('grid grid-cols-1 gap-4', colClass, className)}>
      {children}
    </div>
  );
}

interface BentoCellProps {
  children: ReactNode;
  className?: string;
  span?: 1 | 2;
}

export function BentoCell({ children, className, span = 1 }: BentoCellProps) {
  return (
    <div className={cn(span === 2 && 'sm:col-span-2', className)}>
      {children}
    </div>
  );
}
