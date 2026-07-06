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
    <div className={cn('surface-card', paddingMap[padding], className, innerClassName)}>
      {children}
    </div>
  );
}
