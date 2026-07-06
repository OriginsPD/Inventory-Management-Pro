import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface AuditEntry {
  id: string;
  actionType: string;
  details: string;
  createdAt: string;
  deviceIdentifier?: string;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
  className?: string;
  emptyMessage?: string;
}

export function AuditTimeline({
  entries,
  className,
  emptyMessage = 'No audit entries match current filters',
}: AuditTimelineProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <span className="material-symbols-outlined text-4xl mb-2 opacity-30">history</span>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em]">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn('relative pl-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60 space-y-4', className)}>
      {entries.map((log) => {
        let badgeStyles = 'border-muted text-muted bg-muted/50';
        let timelineNodeStyle = 'border-border/80 bg-background text-muted-foreground';
        let icon = 'info';

        if (log.actionType === 'INGEST') {
          badgeStyles = 'border-emerald-500/25 bg-emerald-500/5 text-emerald-500';
          timelineNodeStyle = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-sm shadow-emerald-500/10';
          icon = 'download';
        } else if (log.actionType === 'DELETE') {
          badgeStyles = 'border-red-500/25 bg-red-500/5 text-red-500';
          timelineNodeStyle = 'border-red-500/50 bg-red-500/10 text-red-500 shadow-sm shadow-red-500/10';
          icon = 'delete';
        } else if (log.actionType === 'LINK' || log.actionType === 'DISPATCH') {
          badgeStyles = 'border-primary/25 bg-primary/5 text-primary';
          timelineNodeStyle = 'border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/10';
          icon = log.actionType === 'DISPATCH' ? 'local_shipping' : 'hub';
        }

        return (
          <div key={log.id} className="relative flex gap-4 group">
            <div className={cn('absolute -left-[27px] top-1.5 h-9 w-9 rounded-full border flex items-center justify-center relative z-10 shrink-0 transition-transform group-hover:scale-105', timelineNodeStyle)}>
              <span className="material-symbols-outlined text-[16px] font-black">{icon}</span>
            </div>
            <div className="flex-1 surface-card hover:bg-card/80 p-4 rounded-xl transition-all flex flex-col sm:flex-row items-start justify-between gap-4 border border-border/80 hover:border-primary/20">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={cn('text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider border', badgeStyles)}>
                    {log.actionType}
                  </span>
                  {log.deviceIdentifier ? (
                    <span className="text-[10px] font-mono text-foreground font-black bg-muted/60 px-1.5 py-0.5 border border-border/60 rounded">
                      {log.deviceIdentifier}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{log.details}</p>
              </div>
              <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 border-border/30 pt-2 sm:pt-0 w-full sm:w-auto font-mono text-[9px] text-muted-foreground uppercase">
                <p className="font-bold text-foreground">{format(new Date(log.createdAt), 'yyyy-MM-dd')}</p>
                <p className="text-[8px] mt-0.5">{format(new Date(log.createdAt), 'HH:mm:ss')}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
