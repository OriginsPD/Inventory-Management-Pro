import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ims_pro/ui/components/dialog';
import { ScrollArea } from '@ims_pro/ui/components/scroll-area';
import { Skeleton } from '@ims_pro/ui/components/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Device } from '../../../lib/types/domain';
import { useDeviceAuditLogs } from './useInventory';

interface DeviceDetailModalProps {
  device: Device | null;
  onClose: () => void;
}

export const DeviceDetailModal: React.FC<DeviceDetailModalProps> = ({
  device,
  onClose,
}) => {
  const [deviceDetailTab, setDeviceDetailTab] = useState<'info' | 'activity'>('info');
  const { data: auditLogs = [], isLoading: isAuditLogsLoading } = useDeviceAuditLogs(device?.id);

  if (!device) return null;

  return (
    <Dialog open={!!device} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="glass-panel-elevated p-6 rounded-2xl max-w-lg w-full space-y-4 border-0 animate-in fade-in zoom-in-95 duration-150" showCloseButton={true}>
        <DialogHeader className="text-left space-y-0.5">
          <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground p-0">Device Inventory Profile</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-0.5">Comprehensive view of inventory entry details.</DialogDescription>
        </DialogHeader>

        <div className="flex border-b border-primary/10 pb-2 gap-4">
          <button
            type="button"
            onClick={() => setDeviceDetailTab('info')}
            className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors cursor-pointer ${deviceDetailTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Information
          </button>
          <button
            type="button"
            onClick={() => setDeviceDetailTab('activity')}
            className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors cursor-pointer ${deviceDetailTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            Activity History
          </button>
        </div>

        {deviceDetailTab === 'info' ? (
          <div className="space-y-4 text-xs text-left">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 border border-primary/10 rounded-xl bg-primary/5 p-3">
              <div className="flex flex-col justify-center py-1 border-b border-primary/10">
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5">Identifier</span>
                <span className="font-mono font-bold text-foreground tracking-mono text-xs truncate">{device.identifier}</span>
              </div>
              <div className="flex flex-col justify-center py-1 border-b border-primary/10">
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5">Asset Class</span>
                <span>
                  <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-1.5 py-0.25 text-[10px] font-bold text-primary font-mono tracking-wider">
                    {device.type}
                  </span>
                </span>
              </div>
              <div className="flex flex-col justify-center py-1 border-b border-primary/10">
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5">Template Model</span>
                <span className="font-semibold text-foreground text-xs truncate">{device.modelName}</span>
              </div>
              <div className="flex flex-col justify-center py-1 border-b border-primary/10">
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5">Current Status</span>
                <span className="inline-flex items-center gap-1.5">
                  {device.status === 'IN_STOCK' && (
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> In Stock
                    </span>
                  )}
                  {device.status === 'DISPATCHED' && (
                    <span className="inline-flex items-center gap-1 text-blue-400 font-semibold text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> Dispatched
                    </span>
                  )}
                  {device.status === 'TESTING' && (
                    <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Testing
                    </span>
                  )}
                  {device.status === 'DAMAGED' && (
                    <span className="inline-flex items-center gap-1 text-red-400 font-semibold text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Damaged
                    </span>
                  )}
                  {device.status === 'RMA' && (
                    <span className="inline-flex items-center gap-1 text-amber-500 font-semibold text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> RMA Swap
                    </span>
                  )}
                  {!['IN_STOCK', 'DISPATCHED', 'TESTING', 'DAMAGED', 'RMA'].includes(device.status) && (
                    <span className="text-muted-foreground font-semibold text-xs">{device.status.replace('_', ' ')}</span>
                  )}
                </span>
              </div>
              <div className="flex flex-col justify-center py-1 border-b border-primary/10 col-span-2 last:border-0 font-sans">
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider mb-0.5">Paired Linkages</span>
                <span className="font-semibold text-foreground text-xs">
                  {device.linked > 0 ? `${device.linked} active links` : 'Stand-alone'}
                </span>
              </div>
            </div>

            <div className="space-y-1 font-sans">
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider block mb-1">Device Attributes</span>
              {device.metadata && Object.keys(device.metadata).length > 0 ? (
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 text-xs grid grid-cols-2 gap-x-6 gap-y-2">
                  {Object.entries(device.metadata).map(([k, v]) => (
                    <div key={k} className="flex flex-col justify-center py-1 border-b border-primary/10 last:border-0">
                      <span className="text-[9px] font-bold text-primary uppercase tracking-wider mb-0.5">{k.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="font-mono text-foreground font-bold text-xs truncate">{String(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No custom attributes populated.</p>
              )}
            </div>
          </div>
        ) : (
          <ScrollArea className="max-h-[350px] pr-2 py-2">
            {isAuditLogsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-4">
                <EmptyState
                  icon={() => <span className="material-symbols-outlined text-3xl opacity-20">history</span>}
                  title="No activity history"
                  description="No activity logs found for this device."
                />
              </div>
            ) : (
              <div className="relative border-l border-primary/10 pl-6 ml-3 space-y-6 text-left">
                {auditLogs.map((log) => {
    let dotColor = 'bg-muted border-border';
                  if (log.actionType === 'INGEST') dotColor = 'bg-emerald-400 border-emerald-500';
                  else if (log.actionType === 'STATUS_CHANGE') dotColor = 'bg-blue-400 border-blue-500';
                  else if (log.actionType === 'TELEMETRY_CHECK') dotColor = 'bg-emerald-400 border-emerald-500';
                  else if (log.actionType === 'DELETE') dotColor = 'bg-red-400 border-red-500';
                  else if (log.actionType === 'SWAP') dotColor = 'bg-amber-400 border-amber-500';
                  else if (log.actionType === 'LINK') dotColor = 'bg-blue-400 border-blue-500';
    else if (log.actionType === 'UNLINK') dotColor = 'bg-muted border-border';

                  return (
                    <div key={log.id} className="relative">
                      <span className={`absolute -left-[30px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--background)] ${dotColor} shadow`} />
                      <div className="flex flex-col gap-1 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold uppercase bg-primary/10 px-1.5 py-0.5 rounded text-primary border border-primary/20">
                            {log.actionType}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/90 font-sans">{log.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        )}

        <div className="flex justify-end pt-2 border-t border-primary/10">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-primary/5 h-9 px-4 cursor-pointer"
          >
            Close Profile
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

