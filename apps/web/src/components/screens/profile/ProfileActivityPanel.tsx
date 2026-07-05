import { format } from 'date-fns';

import { ListSkeleton } from '@/components/ui/loading';

interface AuditEntry {
  id: string;
  actionType: string;
  details: string;
  createdAt: string;
  deviceIdentifier?: string;
}

interface ProfileActivityPanelProps {
  auditLogs: AuditEntry[];
  isLoadingLogs: boolean;
  filterText: string;
  filterType: 'ALL' | 'INGEST' | 'LINK' | 'DELETE';
  onFilterTextChange: (value: string) => void;
  onFilterTypeChange: (type: 'ALL' | 'INGEST' | 'LINK' | 'DELETE') => void;
}

export function ProfileActivityPanel({
  auditLogs,
  isLoadingLogs,
  filterText,
  filterType,
  onFilterTextChange,
  onFilterTypeChange,
}: ProfileActivityPanelProps) {
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = filterText === '' ||
      log.details.toLowerCase().includes(filterText.toLowerCase()) ||
      (log.deviceIdentifier && log.deviceIdentifier.toLowerCase().includes(filterText.toLowerCase()));
    const matchesType = filterType === 'ALL' || log.actionType === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search audit trail by serial, details..."
          value={filterText}
          onChange={(e) => onFilterTextChange(e.target.value)}
          className="flex h-10 flex-1 rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs font-mono placeholder:text-muted-foreground/35 focus:ring-1 focus:ring-primary focus:outline-none"
        />
        <div className="flex bg-muted/40 p-0.5 border border-border/80 rounded-lg">
          {(['ALL', 'INGEST', 'LINK', 'DELETE'] as const).map((type) => (
            <button
              key={type}
              onClick={() => onFilterTypeChange(type)}
              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${
                filterType === type
                  ? 'bg-card text-foreground border border-border/80 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {isLoadingLogs ? (
        <ListSkeleton rows={4} />
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-30">history</span>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em]">No operations logs fit current filter parameters</p>
        </div>
      ) : (
        <div className="relative pl-6 before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60 space-y-4">
          {filteredLogs.map((log) => {
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
            } else if (log.actionType === 'LINK') {
              badgeStyles = 'border-primary/25 bg-primary/5 text-primary';
              timelineNodeStyle = 'border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/10';
              icon = 'hub';
            }

            return (
              <div key={log.id} className="relative flex gap-4 group">
                <div className={`absolute -left-[27px] top-1.5 h-9 w-9 rounded-full border flex items-center justify-center relative z-10 shrink-0 transition-transform group-hover:scale-105 ${timelineNodeStyle}`}>
                  <span className="material-symbols-outlined text-[16px] font-black">{icon}</span>
                </div>

                <div className="flex-1 glass-panel hover:bg-card/80 p-4 rounded-xl transition-all flex flex-col sm:flex-row items-start justify-between gap-4 border border-border/80 hover:border-primary/20">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wider border ${badgeStyles}`}>
                        {log.actionType}
                      </span>
                      {log.deviceIdentifier && (
                        <span className="text-[10px] font-mono text-foreground font-black bg-muted/60 px-1.5 py-0.5 border border-border/60 rounded">
                          {log.deviceIdentifier}
                        </span>
                      )}
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
      )}
    </div>
  );
}
