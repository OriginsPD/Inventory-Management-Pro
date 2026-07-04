import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from "@/lib/hooks/useSearchParams";
import { apiClient } from '@/lib/api-client';
import { Skeleton } from '@ims_pro/ui/components/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims_pro/ui/components/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ims_pro/ui/components/dialog';
import { useDevices, useRelationships } from '@/lib/hooks/useDomain';
import { Device } from '@/lib/types/domain';
import { playSuccessBeep, playErrorBuzz } from '@/lib/audio';

interface StagedSwap {
  id: string;
  oldDeviceId: string;
  oldIdentifier: string;
  oldModelName: string;
  newDeviceId: string;
  newIdentifier: string;
  newModelName: string;
  inheritedCount: number;
  defectReason: string;
  notes?: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  error?: string;
}

interface SearchableSelectProps {
  options: { value: string; label: string; subLabel?: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  error?: boolean;
}

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  error
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase()) ||
    (o.subLabel && o.subLabel.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-9 w-full items-center justify-between rounded-lg border bg-primary/5 px-3 py-2 text-xs text-foreground shadow-sm transition-all focus:outline-hidden focus:ring-1 focus:ring-primary/20 focus:border-primary/40 disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${
          error ? 'border-red-500/50' : 'border-primary/10'
        }`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="material-symbols-outlined text-xs text-muted-foreground select-none">
          keyboard_arrow_down
        </span>
      </button>

      {isOpen && triggerRef.current?.parentElement && createPortal(
        <div
          ref={dropdownRef}
          className="pointer-events-auto absolute top-full left-0 w-full mt-1 z-50 glass-panel-elevated max-h-60 rounded-xl border border-primary/15 bg-card/95 shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100"
        >
          {/* Search bar inside dropdown */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-primary/10 bg-primary/5 shrink-0">
            <span className="material-symbols-outlined text-xs text-muted-foreground select-none">search</span>
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs border-0 p-0 h-6 focus:outline-hidden text-foreground placeholder:text-muted-foreground/30 font-sans"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-[10px] text-muted-foreground hover:text-foreground font-mono"
              >
                clear
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="overflow-y-auto scrollbar-custom p-1 flex-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors flex flex-col gap-0.5 ${
                    o.value === value
                      ? 'bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-primary/5 focus:bg-primary/5'
                  }`}
                >
                  <span className="truncate">{o.label}</span>
                  {o.subLabel && (
                    <span className={`text-[9px] truncate ${
                      o.value === value ? 'text-primary-foreground/75' : 'text-muted-foreground'
                    }`}>
                      {o.subLabel}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-muted-foreground italic select-none">
                No matching results
              </div>
            )}
          </div>
        </div>,
        triggerRef.current.parentElement
      )}
    </div>
  );
};

const DeviceAuditTimelineModal = ({
  deviceId,
  deviceIdentifier,
  isOpen,
  onClose
}: {
  deviceId: string;
  deviceIdentifier: string;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && deviceId) {
      setIsLoading(true);
      apiClient.get<any[]>(`/api/devices/${deviceId}/audit-logs`)
        .then(res => {
          setLogs(res || []);
        })
        .catch(err => {
          console.error("Failed to load audit logs", err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, deviceId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="glass-panel-elevated p-6 rounded-2xl max-w-xl w-full max-h-[80vh] flex flex-col border-0 animate-in fade-in zoom-in-95 duration-150 overflow-hidden" showCloseButton={true}>
        <DialogHeader className="text-left space-y-0.5 shrink-0">
          <DialogTitle className="text-sm font-extrabold tracking-tight text-foreground p-0 flex items-center gap-2 select-none">
            <span className="material-symbols-outlined text-primary text-base select-none">history</span>
            Audit Log Timeline: {deviceIdentifier}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-muted-foreground mt-0.5">
            Historical trace records captured in the device lifecycle audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-custom space-y-3 min-h-[200px]">
          {isLoading ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 bg-primary/5 rounded-lg" />
              <div className="h-10 bg-primary/5 rounded-lg" />
              <div className="h-10 bg-primary/5 rounded-lg" />
            </div>
          ) : logs.length > 0 ? (
            <div className="relative border-l border-primary/10 ml-2.5 pl-4 space-y-4 py-1">
              {logs.map((log) => (
                <div key={log.id} className="relative flex flex-col gap-1 text-xs">
                  <span className="absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border border-primary/20 bg-card flex items-center justify-center">
                    <span className="h-1 w-1 bg-primary rounded-full" />
                  </span>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-bold text-foreground inline-flex items-center gap-1">
                      <span className="px-1 py-0.5 rounded bg-primary/10 border border-primary/10 text-[9px] font-mono tracking-wider text-primary uppercase">{log.actionType}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(log.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">{log.details}</p>
                  {log.userId && (
                    <span className="text-[9px] text-muted-foreground/60 italic inline-flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[10px]">person</span>
                      Operator ID: {log.userId}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-xs text-muted-foreground italic select-none">
              No audit logs found for this device.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const HardwareSwaps = () => {
  
  const { data: devices = [], isLoading: isLoadingDevices, refetch: fetchDevices } = useDevices();
  const { data: relationships = [], isLoading: isLoadingRels } = useRelationships();
  
  const isLoading = isLoadingDevices || isLoadingRels;
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');

  useEffect(() => {
    const swapOldDeviceId = searchParams.get('swapOldDevice');
    if (swapOldDeviceId && devices.length > 0) {
      const dev = devices.find(d => d.id === swapOldDeviceId);
      if (dev) {
        setOldSelectVal(dev.id || '');
        setStagedSwaps([]);
        setIsStagingModalOpen(true);
        // Clear param
        searchParams.delete('swapOldDevice');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, devices]);
  
  // Staging Workbench state
  const [isStagingModalOpen, setIsStagingModalOpen] = useState(false);
  const [stagedSwaps, setStagedSwaps] = useState<StagedSwap[]>([]);
  const [oldSelectVal, setOldSelectVal] = useState('');
  const [newSelectVal, setNewSelectVal] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [barcodeScanInput, setBarcodeScanInput] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [defectReason, setDefectReason] = useState('Battery Defect');
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [selectedAuditDevice, setSelectedAuditDevice] = useState<{ id: string; identifier: string } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const executeBatchSwaps = async () => {
    const itemsToExecute = stagedSwaps.filter(item => item.status === 'PENDING' || item.status === 'FAILED');
    if (itemsToExecute.length === 0) return;

    setIsExecuting(true);
    
    for (const item of itemsToExecute) {
      setStagedSwaps(prev => prev.map(s => s.id === item.id ? { ...s, status: 'PROCESSING', error: undefined } : s));
      
      try {
        const responseData = await apiClient.post<any>('/api/devices/swap', {
          oldDeviceId: item.oldDeviceId,
          newDeviceId: item.newDeviceId,
          defectReason: item.defectReason,
          notes: item.notes
        });

        if (responseData && !responseData.error) {
          setStagedSwaps(prev => prev.map(s => s.id === item.id ? { ...s, status: 'SUCCESS' } : s));
        } else {
          setStagedSwaps(prev => prev.map(s => s.id === item.id ? { ...s, status: 'FAILED', error: responseData?.error || 'Swap failed' } : s));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Internal server error occurred';
        setStagedSwaps(prev => prev.map(s => s.id === item.id ? { ...s, status: 'FAILED', error: msg } : s));
      }
    }
    
    setIsExecuting(false);
    await fetchDevices();
  };

  // Lists
  const dispatchedUnits = devices.filter((d: Device) => 
    d.status === 'DISPATCHED' && 
    !stagedSwaps.some(s => s.oldDeviceId === d.id)
  );
  const stockedUnits = devices.filter((d: Device) => 
    d.status === 'IN_STOCK' && 
    !stagedSwaps.some(s => s.newDeviceId === d.id)
  );
  
  const damagedUnits = devices.filter((d: Device) => {
    const isDamaged = d.status === 'DAMAGED';
    const matchesSearch = d.identifier.toLowerCase().includes(search.toLowerCase()) ||
      d.modelName.toLowerCase().includes(search.toLowerCase());
    return isDamaged && matchesSearch;
  });

  // Reset pagination on search
  useEffect(() => {
    setCurrentPage(1);
  }, [search, devices.length]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDamaged = damagedUnits.slice(startIndex, endIndex);
  const totalPages = Math.ceil(damagedUnits.length / pageSize);

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">RMA Swaps & Replacements</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Swap out faulty field hardware tracking units with certified warehouse stock to maintain uptime.
          </p>
        </div>

        {/* KPI Summary Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel p-5 rounded-xl space-y-2">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Awaiting Swap</p>
            <p className="text-2xl font-black text-foreground">
              {devices.filter(d => d.status === 'DAMAGED' && !d.metadata?.replacedBy).length}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Active RMA Queue</p>
          </div>
          <div className="glass-panel p-5 rounded-xl space-y-2">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Swaps Processed</p>
            <p className="text-2xl font-black text-[#eb5a00]">
              {devices.filter(d => d.status === 'DAMAGED' && d.metadata?.replacedBy).length}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Completed Replacements</p>
          </div>
          <div className="glass-panel p-5 rounded-xl space-y-2">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Replacement Reserves</p>
            <p className="text-2xl font-black text-[#00508a] dark:text-[#38bdf8]">
              {devices.filter(d => d.status === 'IN_STOCK').length}
            </p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-mono">Warehouse stocked units</p>
          </div>
        </div>

        {/* Full-width Swap Workbench Banner / Trigger Card */}
        <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">sync</span>
              <h3 className="font-extrabold text-sm text-foreground">Hardware Swap Workbench</h3>
            </div>
            <p className="text-xs text-muted-foreground max-w-3xl">
              To swap faulty field devices with stocked replacements, open the staging workbench. You can stage multiple swap transactions and process them in a single batch.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStagedSwaps([]);
              setOldSelectVal('');
              setNewSelectVal('');
              setScanFeedback(null);
              setIsStagingModalOpen(true);
            }}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-5 gap-1.5 cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-sm">construction</span> Open Swap Workbench
          </button>
        </div>

        {/* Full-width Damaged Registry */}
        <div className="space-y-4 w-full">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-primary/10 p-2 rounded-xl bg-card/60">
            <div className="flex items-center gap-2 flex-1 px-2">
              <span className="material-symbols-outlined text-sm text-muted-foreground shrink-0">search</span>
              <input 
                placeholder="Filter damaged/RMA units registry..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex h-9 w-full bg-transparent px-2 py-1 text-sm focus-visible:outline-none placeholder:text-muted-foreground/30 text-foreground border-0"
              />
            </div>
          </div>

          <div className="glass-panel rounded-xl overflow-visible">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faulty Serial</TableHead>
                  <TableHead>Model Template</TableHead>
                  <TableHead>Former Customer</TableHead>
                  <TableHead>Defect / Notes</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Replacement Unit</TableHead>
                  <TableHead>Swap Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <TableRow key={index} className="animate-pulse">
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedDamaged.length > 0 ? (
                  paginatedDamaged.map((device: Device) => (
                    <TableRow key={device.id} className="group hover:bg-primary/5 transition-colors">
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold tracking-mono text-foreground font-mono text-xs">{device.identifier}</span>
                          <button
                            type="button"
                            onClick={() => setSelectedAuditDevice({ id: device.id || '', identifier: device.identifier })}
                            className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors h-6 w-6 rounded-md hover:bg-primary/5 cursor-pointer"
                            title="View device audit timeline"
                          >
                            <span className="material-symbols-outlined text-[14px]">history</span>
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{device.modelName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                          <span className="material-symbols-outlined text-xs text-muted-foreground">person</span>
                          <span>{device.metadata?.customerName || 'Internal Inventory'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5 max-w-xs">
                          {device.metadata?.defectReason ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-lg w-fit">
                              {device.metadata.defectReason}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">-</span>
                          )}
                          {device.metadata?.notes && (
                            <p className="text-[10px] text-muted-foreground leading-snug break-words mt-0.5 font-sans">
                              {device.metadata.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-foreground">
                        {device.metadata?.swappedBy ? (
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-muted-foreground">engineering</span>
                            <span>{device.metadata.swappedBy}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {device.metadata?.replacedBy ? (
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                            <span className="material-symbols-outlined text-xs mr-1 text-emerald-400">check_circle</span> {device.metadata.replacedBy}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                            <span className="material-symbols-outlined text-xs mr-1 text-amber-400">warning</span> Awaiting Swap
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {device.metadata?.swappedAt ? (
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-xs text-muted-foreground">calendar_today</span>
                            <span>
                              {new Date(device.metadata.swappedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="italic text-muted-foreground/60">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-auto p-0">
                      <EmptyState
                        icon="warning"
                        title="No Damaged or Swapped Units"
                        description="There are currently no active damaged units or completed RMA swaps registered in the log."
                        className="border-0 bg-transparent py-12"
                      />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {damagedUnits.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10 bg-transparent">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                <span className="font-semibold text-foreground">{Math.min(endIndex, damagedUnits.length)}</span> of{' '}
                <span className="font-semibold text-foreground">{damagedUnits.length}</span> units
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
                >
                  Previous
                </button>
                
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - currentPage) <= 1
                  ) {
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`inline-flex items-center justify-center rounded-lg text-xs font-bold h-8 w-8 transition-colors cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-primary text-primary-foreground'
                            : 'border border-primary/10 bg-primary/5 text-foreground hover:bg-primary/15'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="text-muted-foreground px-1 text-xs">...</span>;
                  }
                  return null;
                }).filter((el, idx, arr) => {
                  if (el?.type === 'span' && arr[idx - 1]?.type === 'span') return false;
                  return true;
                })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BATCH SWAP STAGING WORKBENCH DIALOG */}
        <Dialog open={isStagingModalOpen} onOpenChange={(open) => { if (!open && !isExecuting) setIsStagingModalOpen(false); }}>
          <DialogContent className="glass-panel-elevated p-6 rounded-2xl sm:max-w-6xl w-full h-[90vh] flex flex-col border-0 animate-in fade-in zoom-in-95 duration-150 overflow-hidden" showCloseButton={!isExecuting}>
            <DialogHeader className="text-left space-y-0.5 shrink-0">
              <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground p-0 flex items-center gap-2 select-none">
                <span className="material-symbols-outlined text-primary text-xl select-none">construction</span>
                Hardware Swap Staging Workbench
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Stage multiple faulty devices alongside compatible replacements, then execute the atomic replacements in one batch.
              </DialogDescription>
            </DialogHeader>

            {/* Quick Barcode Scan resolver panel inside modal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-primary/10 pb-4 mt-2 shrink-0">
              <div className="md:col-span-1 space-y-1.5">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Quick Barcode Scan (Faulty or Replacement)
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-2.5 text-muted-foreground/60 text-xs select-none">qr_code_scanner</span>
                  <input
                    type="text"
                    disabled={isExecuting}
                    value={barcodeScanInput}
                    onChange={(e) => setBarcodeScanInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = barcodeScanInput.trim();
                        if (!trimmed) return;
                        const matched = devices.find(d => d.identifier.toLowerCase() === trimmed.toLowerCase());
                        if (matched) {
                          if (stagedSwaps.some(s => s.oldDeviceId === matched.id || s.newDeviceId === matched.id)) {
                            setScanFeedback({ type: 'error', message: `Device '${matched.identifier}' is already staged in the workbench.` });
                            playErrorBuzz();
                            return;
                          }
                          if (matched.status === 'DISPATCHED') {
                            setOldSelectVal(matched.id || '');
                            setBarcodeScanInput('');
                            setScanFeedback({ type: 'success', message: `Faulty unit '${matched.identifier}' selected.` });
                            playSuccessBeep();
                          } else if (matched.status === 'IN_STOCK') {
                            setNewSelectVal(matched.id || '');
                            setBarcodeScanInput('');
                            setScanFeedback({ type: 'success', message: `Replacement unit '${matched.identifier}' selected.` });
                            playSuccessBeep();
                          } else {
                            setScanFeedback({ type: 'error', message: `Device '${matched.identifier}' status is '${matched.status}' (must be DISPATCHED/IN_STOCK).` });
                            playErrorBuzz();
                          }
                        } else {
                          setScanFeedback({ type: 'error', message: `Identifier '${trimmed}' not found.` });
                          playErrorBuzz();
                        }
                      }
                    }}
                    placeholder="Scan Serial/IMEI..."
                    className="w-full bg-background border border-primary/10 text-xs h-8 pl-8 pr-2 rounded-lg focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden text-foreground placeholder:text-muted-foreground/40 transition-colors font-mono"
                  />
                </div>
                {scanFeedback && (
                  <p className={`text-[9px] font-semibold flex items-center gap-1 ${
                    scanFeedback.type === 'success' ? 'text-emerald-500 font-sans' : 'text-red-400 font-sans'
                  }`}>
                    <span className="material-symbols-outlined text-[10px]">
                      {scanFeedback.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {scanFeedback.message}
                  </p>
                )}
              </div>

              {/* Searchable Select Inputs */}
              <div className="md:col-span-1 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Faulty Field Unit (Dispatched)
                </label>
                <SearchableSelect
                  disabled={isExecuting}
                  options={dispatchedUnits.map(d => ({
                    value: d.id || '',
                    label: d.identifier,
                    subLabel: `${d.modelName} (${d.metadata?.customerName || 'No Client'})`
                  }))}
                  value={oldSelectVal}
                  onChange={(val) => { setOldSelectVal(val); setScanFeedback(null); }}
                  placeholder="Select faulty device..."
                />
              </div>

              <div className="md:col-span-1 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Replacement Warehouse Unit (In Stock)
                </label>
                <SearchableSelect
                  disabled={isExecuting}
                  options={stockedUnits.map(d => ({
                    value: d.id || '',
                    label: d.identifier,
                    subLabel: d.modelName
                  }))}
                  value={newSelectVal}
                  onChange={(val) => { setNewSelectVal(val); setScanFeedback(null); }}
                  placeholder="Select replacement unit..."
                />
              </div>
            </div>

            {/* Defect failure reason & Notes input row inside modal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-primary/10 pb-4 mt-2 shrink-0">
              <div className="md:col-span-1 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Defect / RMA Failure Reason
                </label>
                <select
                  disabled={isExecuting}
                  value={defectReason}
                  onChange={(e) => setDefectReason(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 text-xs text-foreground shadow-sm transition-all focus:outline-hidden focus:ring-1 focus:ring-primary/20 focus:border-primary/40 disabled:opacity-50 cursor-pointer"
                >
                  <option value="Battery Defect">Battery Defect</option>
                  <option value="GPS Antenna Failure">GPS Antenna Failure</option>
                  <option value="Physical Damage">Physical Damage</option>
                  <option value="SIM Card Failure">SIM Card Failure</option>
                  <option value="QC Failure">QC Failure</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Technician Swap Notes (Optional)
                </label>
                <input
                  type="text"
                  disabled={isExecuting}
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="Enter failure diagnostics or swap details..."
                  className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 px-3 py-2 text-xs text-foreground shadow-sm transition-all focus:outline-hidden focus:ring-1 focus:ring-primary/20 focus:border-primary/40 disabled:opacity-50 placeholder:text-muted-foreground/30 text-foreground"
                />
              </div>
            </div>

            {/* Middle Section: Staging Preview Flow Card & Staging Action */}
            {oldSelectVal && newSelectVal && (
              <div className="py-3 px-4 mt-2 border border-primary/10 rounded-xl bg-primary/5 shrink-0 flex items-center justify-between gap-6 animate-in fade-in duration-150">
                <div className="flex items-center gap-6 flex-1 justify-around">
                  <div className="flex flex-col min-w-0 max-w-[40%] text-left">
                    <span className="text-[8px] font-mono text-red-400 uppercase tracking-widest font-black leading-none">Faulty Field Unit</span>
                    <span className="text-xs font-bold text-foreground font-mono truncate mt-0.5">
                      {devices.find(d => d.id === oldSelectVal)?.identifier}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate">
                      {devices.find(d => d.id === oldSelectVal)?.modelName}
                    </span>
                  </div>

                  <div className="flex items-center justify-center shrink-0 gap-1.5 text-muted-foreground">
                    <span className="w-8 h-px border-t border-dashed border-border/80" />
                    <span className="material-symbols-outlined text-primary text-sm animate-pulse">arrow_forward</span>
                    <span className="w-8 h-px border-t border-dashed border-border/80" />
                  </div>

                  <div className="flex flex-col min-w-0 max-w-[40%] text-right items-end">
                    <span className="text-[8px] font-mono text-emerald-500 uppercase tracking-widest font-black leading-none">Replacement</span>
                    <span className="text-xs font-bold text-foreground font-mono truncate mt-0.5">
                      {devices.find(d => d.id === newSelectVal)?.identifier}
                    </span>
                    <span className="text-[9px] text-muted-foreground truncate">
                      {devices.find(d => d.id === newSelectVal)?.modelName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 pl-4 border-l border-primary/10">
                  {/* Compatibility Check */}
                  {(() => {
                    const oDev = devices.find(d => d.id === oldSelectVal);
                    const nDev = devices.find(d => d.id === newSelectVal);
                    const isMatch = oDev?.modelName === nDev?.modelName;
                    return (
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isMatch ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-amber-500/10 border border-amber-500/20 text-amber-500'
                      }`}>
                        <span className="material-symbols-outlined text-[10px]">{isMatch ? 'check_circle' : 'warning'}</span>
                        {isMatch ? 'Match' : 'Diff Model'}
                      </span>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => {
                      const oDev = devices.find(d => d.id === oldSelectVal);
                      const nDev = devices.find(d => d.id === newSelectVal);
                      if (!oDev || !nDev) return;

                      // Prevent duplicate staging of same devices
                      if (stagedSwaps.some(s => s.oldDeviceId === oDev.id || s.newDeviceId === nDev.id)) {
                        setScanFeedback({ type: 'error', message: 'One of the devices is already staged in the queue.' });
                        playErrorBuzz();
                        return;
                      }

                      const count = relationships.filter(r => r.primaryDeviceId === oDev.id).length;

                      const newStaged: StagedSwap = {
                        id: crypto.randomUUID(),
                        oldDeviceId: oDev.id || '',
                        oldIdentifier: oDev.identifier,
                        oldModelName: oDev.modelName,
                        newDeviceId: nDev.id || '',
                        newIdentifier: nDev.identifier,
                        newModelName: nDev.modelName,
                        inheritedCount: count,
                        defectReason: defectReason,
                        notes: technicianNotes || undefined,
                        status: 'PENDING'
                      };

                      setStagedSwaps([...stagedSwaps, newStaged]);
                      setOldSelectVal('');
                      setNewSelectVal('');
                      setDefectReason('Battery Defect');
                      setTechnicianNotes('');
                      setScanFeedback(null);
                      playSuccessBeep();
                    }}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-8 px-3.5 cursor-pointer"
                  >
                    Stage Swap Pair
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Section: Staging Queue List (Scrollable) */}
            <div className="flex-1 overflow-y-auto mt-4 border border-primary/10 rounded-xl bg-card/40 min-h-[180px]">
              <Table>
                <TableHeader className="sticky top-0 bg-card/95 backdrop-blur-md z-10 border-b border-primary/10">
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold py-2">Staged Faulty Device</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold py-2">Replacement Device</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold py-2">Compatibility / Links</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold py-2">Execution Status</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold py-2 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stagedSwaps.length > 0 ? (
                    stagedSwaps.map((item) => (
                      <TableRow key={item.id} className="hover:bg-primary/5 transition-colors border-b border-primary/5 py-1">
                        <TableCell className="py-2.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-bold text-foreground text-xs">{item.oldIdentifier}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedAuditDevice({ id: item.oldDeviceId, identifier: item.oldIdentifier })}
                                className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors h-5 w-5 rounded hover:bg-primary/5 cursor-pointer"
                                title="View device audit timeline"
                              >
                                <span className="material-symbols-outlined text-[13px]">history</span>
                              </button>
                            </div>
                            <span className="text-[9px] text-muted-foreground font-sans">{item.oldModelName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="font-bold text-foreground text-xs">{item.newIdentifier}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedAuditDevice({ id: item.newDeviceId, identifier: item.newIdentifier })}
                                className="inline-flex items-center justify-center text-muted-foreground hover:text-primary transition-colors h-5 w-5 rounded hover:bg-primary/5 cursor-pointer"
                                title="View device audit timeline"
                              >
                                <span className="material-symbols-outlined text-[13px]">history</span>
                              </button>
                            </div>
                            <span className="text-[9px] text-muted-foreground font-sans">{item.newModelName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 select-none">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {item.oldModelName === item.newModelName ? (
                              <span className="inline-flex items-center text-[9px] font-bold text-emerald-500 bg-emerald-500/5 px-1.5 py-0.5 rounded border border-emerald-500/10">
                                Match
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[9px] font-bold text-amber-500 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10" title="Verify backend capability compatibility">
                                Diff Model
                              </span>
                            )}
                            {item.inheritedCount > 0 && (
                              <span className="inline-flex items-center text-[9px] font-bold text-[#00508a] bg-[#00508a]/5 px-1.5 py-0.5 rounded border border-[#00508a]/10 dark:text-[#38bdf8] dark:bg-[#38bdf8]/5 dark:border-[#38bdf8]/10 font-mono">
                                +{item.inheritedCount} links
                              </span>
                            )}
                          </div>
                          {/* Detailed inline Accessory components */}
                          {(() => {
                            const childRels = relationships.filter(r => r.primaryDeviceId === item.oldDeviceId);
                            if (childRels.length > 0) {
                              return (
                                <div className="mt-2 flex flex-col gap-1.5 max-w-xs">
                                  {childRels.map(rel => {
                                    const childDev = devices.find(d => d.id === rel.linkedDeviceId);
                                    if (!childDev) return null;
                                    let detailStr = '';
                                    if (childDev.type === 'SIM') {
                                      detailStr = `${childDev.metadata?.carrier || 'SIM'}${childDev.metadata?.phoneNumber ? ` (${childDev.metadata.phoneNumber})` : ''}`;
                                    } else if (childDev.type === 'SD_CARD') {
                                      detailStr = `SD: ${childDev.metadata?.capacity || 'SD Card'}`;
                                    } else {
                                      detailStr = `${childDev.type || 'Accessory'}`;
                                    }
                                    return (
                                      <div key={rel.id} className="text-[9px] font-medium text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg p-1.5 flex flex-col gap-0.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-mono text-foreground font-bold">{childDev.identifier}</span>
                                          <span className="text-[8px] font-semibold text-primary uppercase">{childDev.type}</span>
                                        </div>
                                        <div className="text-[8px] text-muted-foreground font-sans flex justify-between">
                                          <span>{childDev.modelName}</span>
                                          {detailStr && <span className="text-muted-foreground/80">{detailStr}</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                              {item.status === 'PENDING' && (
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">hourglass_empty</span>
                                  Pending
                                </span>
                              )}
                              {item.status === 'PROCESSING' && (
                                <span className="text-primary flex items-center gap-1 animate-pulse">
                                  <span className="material-symbols-outlined text-[13px] animate-spin">sync</span>
                                  Processing
                                </span>
                              )}
                              {item.status === 'SUCCESS' && (
                                <span className="text-emerald-500 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                  Completed
                                </span>
                              )}
                              {item.status === 'FAILED' && (
                                <span className="text-red-400 flex items-center gap-1 animate-in fade-in duration-100">
                                  <span className="material-symbols-outlined text-[13px]">cancel</span>
                                  Failed
                                </span>
                              )}
                            </div>
                            {item.error && (
                              <span className="text-[8px] font-mono text-red-400 max-w-[200px] break-words">
                                {item.error}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <button
                            type="button"
                            disabled={isExecuting || item.status === 'SUCCESS' || item.status === 'PROCESSING'}
                            onClick={() => {
                              setStagedSwaps(stagedSwaps.filter(s => s.id !== item.id));
                            }}
                            className="text-muted-foreground hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none p-1 hover:bg-red-500/5 rounded-lg transition-colors cursor-pointer"
                            title="Remove from staging queue"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-xs text-muted-foreground italic select-none">
                        No hardware swaps staged. Select faulty and replacement units above to begin.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer: Execution controls */}
            <div className="mt-4 pt-4 border-t border-primary/10 flex items-center justify-between shrink-0 select-none">
              <div className="text-xs text-muted-foreground">
                Total Staged: <span className="font-bold text-foreground">{stagedSwaps.length}</span>
                {stagedSwaps.some(s => s.status === 'SUCCESS') && (
                  <span className="ml-3 text-emerald-500 font-semibold">
                    ({stagedSwaps.filter(s => s.status === 'SUCCESS').length} Succeeded)
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isExecuting}
                  onClick={() => setIsStagingModalOpen(false)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-primary/5 h-9 px-4 cursor-pointer"
                >
                  {stagedSwaps.some(s => s.status === 'SUCCESS') ? 'Close Staging' : 'Cancel'}
                </button>
                {stagedSwaps.some(s => s.status === 'PENDING' || s.status === 'FAILED') && (
                  <button
                    type="button"
                    disabled={isExecuting}
                    onClick={executeBatchSwaps}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-5 gap-1.5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isExecuting ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                        Processing Swaps...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        Execute Staged Swaps
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {selectedAuditDevice && (
          <DeviceAuditTimelineModal
            deviceId={selectedAuditDevice.id}
            deviceIdentifier={selectedAuditDevice.identifier}
            isOpen={!!selectedAuditDevice}
            onClose={() => setSelectedAuditDevice(null)}
          />
        )}
    </div>
  );
};
