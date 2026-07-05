import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface PortalTab {
  id: string;
  label: string;
  icon: string;
}

interface PortalSectionShellProps {
  title: string;
  accentWord: string;
  subtitle: string;
  tabs: PortalTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  className?: string;
}

export function PortalSectionShell({
  title,
  accentWord,
  subtitle,
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: PortalSectionShellProps) {
  return (
    <div className={cn('max-w-5xl mx-auto w-full', className)}>
      <div className="rounded-[2rem] p-1.5 ring-1 ring-primary/10">
        <div className="glass-panel rounded-[calc(2rem-0.375rem)] overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-primary/10">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 mb-3">
              Console
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground uppercase italic">
              {title}{' '}
              <span className="text-primary">{accentWord}</span>
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1.5 max-w-xl">
              {subtitle}
            </p>
          </div>

          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:min-h-[480px]">
            <nav
              aria-label="Section tabs"
              className="flex lg:flex-col gap-1.5 p-4 lg:p-5 lg:border-r border-primary/10 overflow-x-auto lg:overflow-x-visible shrink-0"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                      'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap shrink-0',
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

            <div className="p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-[480px]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
