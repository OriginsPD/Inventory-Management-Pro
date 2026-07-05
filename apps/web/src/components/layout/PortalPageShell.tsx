import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { PortalTab } from './PortalSectionShell';

export type PortalShellVariant = 'ops' | 'console';

interface PortalPageShellProps {
  eyebrow?: string;
  title: string;
  accentWord?: string;
  subtitle?: string;
  tabs?: PortalTab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  actions?: ReactNode;
  contextPanel?: ReactNode;
  variant?: PortalShellVariant;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PortalPageShell({
  eyebrow = 'Operations',
  title,
  accentWord,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  actions,
  contextPanel,
  variant = 'ops',
  children,
  className,
  contentClassName,
}: PortalPageShellProps) {
  const isConsole = variant === 'console';
  const hasTabs = tabs && tabs.length > 0 && activeTab && onTabChange;

  const header = (
    <div className={cn('border-b border-primary/10', isConsole ? 'px-6 pt-6 pb-4' : 'pb-4 mb-6')}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 mb-3">
            {eyebrow}
          </span>
          <h1
            className={cn(
              'font-black tracking-tight text-foreground uppercase',
              isConsole ? 'text-2xl sm:text-3xl italic' : 'text-2xl sm:text-3xl',
            )}
          >
            {title}
            {accentWord ? (
              <>
                {' '}
                <span className="text-primary">{accentWord}</span>
              </>
            ) : null}
          </h1>
          {subtitle ? (
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1.5 max-w-2xl">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2 shrink-0 flex-wrap">{actions}</div> : null}
      </div>
    </div>
  );

  const tabNav = hasTabs ? (
    <nav
      aria-label="Section tabs"
      className={cn(
        'flex gap-1.5 shrink-0',
        isConsole
          ? 'lg:flex-col p-4 lg:p-5 lg:border-r border-primary/10 overflow-x-auto lg:overflow-x-visible'
          : 'border-b border-primary/10 pb-4 mb-6 overflow-x-auto',
      )}
    >
      {tabs!.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange!(tab.id)}
            className={cn(
              'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 min-h-[44px] lg:min-h-0',
              isActive
                ? 'bg-primary/10 text-primary border border-primary/25 shadow-sm shadow-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent',
            )}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  ) : null;

  if (isConsole) {
    return (
      <div className={cn('max-w-5xl mx-auto w-full', className)}>
        <div className="rounded-[2rem] p-1.5 ring-1 ring-primary/10">
          <div className="glass-panel rounded-[calc(2rem-0.375rem)] overflow-hidden">
            {header}
            <div className="lg:grid lg:grid-cols-[220px_1fr] lg:min-h-[480px]">
              {tabNav}
              <div className={cn('p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-[480px]', contentClassName)}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-full mx-auto', className)}>
      {header}
      {tabNav}
      <div
        className={cn(
          contextPanel ? 'grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-6' : '',
        )}
      >
        <div className={cn('min-w-0', contentClassName)}>{children}</div>
        {contextPanel ? (
          <aside className="hidden xl:block shrink-0 space-y-4">{contextPanel}</aside>
        ) : null}
      </div>
    </div>
  );
}
