import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

interface KpiTileProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function KpiTile({ label, value, hint, icon, href, onClick, className }: KpiTileProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon ? (
          <span className="material-symbols-outlined text-[18px] text-muted-foreground/70">{icon}</span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-serif tracking-tight text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </>
  );

  const classes = cn(
    'surface-card surface-card-hover p-6 block text-left transition-all duration-200',
    (href || onClick) && 'cursor-pointer hover:border-foreground/20',
    className,
  );

  if (href) {
    return (
      <Link to={href} className={classes}>
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, 'w-full')}>
        {inner}
      </button>
    );
  }

  return <div className={classes}>{inner}</div>;
}
