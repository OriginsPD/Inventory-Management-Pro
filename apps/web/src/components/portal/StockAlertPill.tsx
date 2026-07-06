import { cn } from '@/lib/utils';

interface StockAlertPillProps {
  level: 'HEALTHY' | 'WARNING' | 'LOW';
  label: string;
  count?: number;
  onClick?: () => void;
  className?: string;
}

const levelStyles = {
  HEALTHY: 'bg-[var(--status-success-bg)] text-[var(--status-success-fg)] border-transparent',
  WARNING: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)] border-transparent',
  LOW: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)] border-transparent',
};

export function StockAlertPill({ level, label, count, onClick, className }: StockAlertPillProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors',
        levelStyles[level],
        onClick && 'hover:opacity-90 cursor-pointer min-h-[44px] sm:min-h-0',
        className,
      )}
    >
      <span className="material-symbols-outlined text-[14px]">
        {level === 'HEALTHY' ? 'check_circle' : 'warning'}
      </span>
      <span>{count != null ? `${count} ` : ''}{label}</span>
    </Tag>
  );
}
