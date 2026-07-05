import { cn } from '@/lib/utils';

interface StockAlertPillProps {
  level: 'HEALTHY' | 'WARNING' | 'LOW';
  label: string;
  count?: number;
  onClick?: () => void;
  className?: string;
}

const levelStyles = {
  HEALTHY: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20',
  WARNING: 'text-amber-500 bg-amber-500/5 border-amber-500/20',
  LOW: 'text-red-500 bg-red-500/5 border-red-500/20',
};

export function StockAlertPill({ level, label, count, onClick, className }: StockAlertPillProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-[9px] font-bold font-mono uppercase tracking-tighter px-2 py-1 border transition-all',
        levelStyles[level],
        onClick && 'hover:brightness-110 cursor-pointer min-h-[44px] sm:min-h-0',
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
