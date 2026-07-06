import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PortalBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'info';
  className?: string;
}

const variants = {
  default: 'bg-muted text-muted-foreground border-border',
  success: 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] border-transparent',
  warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)] border-transparent',
  danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)] border-transparent',
  info: 'bg-[var(--status-info-bg)] text-[var(--status-info-fg)] border-transparent',
  primary: 'bg-foreground text-background border-transparent',
};

export function PortalBadge({ children, variant = 'default', className }: PortalBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border',
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
