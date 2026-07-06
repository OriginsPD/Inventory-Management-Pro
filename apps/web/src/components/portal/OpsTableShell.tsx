import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { DataPanel } from '@/components/ui/portal';
import { TableSkeleton } from '@/components/ui/loading';

interface OpsTableShellProps {
  search?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  skeletonRows?: number;
  className?: string;
}

export function OpsTableShell({
  search,
  filters,
  actions,
  children,
  footer,
  isLoading,
  skeletonRows = 6,
  className,
}: OpsTableShellProps) {
  return (
    <DataPanel padding="none" className={className}>
      <div className="p-4 sm:p-5 border-b border-border space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {search ? <div className="flex-1 min-w-0">{search}</div> : null}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {filters}
            {actions}
          </div>
        </div>
      </div>
      <div className="p-0 overflow-x-auto">
        {isLoading ? <TableSkeleton rows={skeletonRows} className="p-4" /> : children}
      </div>
      {footer ? (
        <div className="p-4 border-t border-border flex items-center justify-between gap-3 flex-wrap">
          {footer}
        </div>
      ) : null}
    </DataPanel>
  );
}
