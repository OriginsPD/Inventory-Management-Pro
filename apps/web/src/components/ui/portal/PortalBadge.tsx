import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PortalBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary';
  className?: string;
}

const variants = {
  default: 'bg-muted/60 text-muted-foreground border-border/60',
  success: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/25',
  danger: 'bg-red-500/10 text-red-500 border-red-500/25',
  primary: 'bg-primary/10 text-primary border-primary/25',
};

export function PortalBadge({ children, variant = 'default', className }: PortalBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
