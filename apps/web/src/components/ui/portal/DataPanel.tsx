import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DataPanelProps {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function DataPanel({ children, className, innerClassName, padding = 'md' }: DataPanelProps) {
  return (
    <div className={cn('rounded-[1.25rem] p-1 ring-1 ring-primary/10', className)}>
      <div className={cn('glass-panel rounded-[calc(1.25rem-0.25rem)]', paddingMap[padding], innerClassName)}>
        {children}
      </div>
    </div>
  );
}
