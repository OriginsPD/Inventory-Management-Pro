import { ListSkeleton } from '@/components/ui/loading';
import { AuditTimeline, type AuditEntry } from '@/components/portal/AuditTimeline';

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
              className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all min-h-[44px] sm:min-h-0 ${
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
      ) : (
        <AuditTimeline entries={filteredLogs} />
      )}
    </div>
  );
}
