import { useEffect, useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';

import { PortalPageShell } from '@/components/layout/PortalPageShell';
import { AuditTimeline } from '@/components/portal';
import { DeviceIdentifierChip } from '@/components/portal';
import { DataPanel, PortalBadge, PortalButton } from '@/components/ui/portal';
import { apiClient } from '@/lib/api-client';
import { Device } from '@/lib/types/domain';
import { useCanWrite } from '@/lib/hooks/useCanWrite';

export function DeviceDetailScreen() {
  const { deviceId } = useParams({ from: '/_authenticated/devices/$deviceId' });
  const canWrite = useCanWrite();
  const [device, setDevice] = useState<Device | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dev, logs] = await Promise.all([
          apiClient.get<Device>(`/api/devices/${deviceId}`),
          apiClient.get<any[]>(`/api/devices/${deviceId}/audit-logs`),
        ]);
        if (!cancelled) {
          setDevice(dev);
          setAuditLogs(logs);
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Device not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deviceId]);

  if (loading) {
    return (
      <PortalPageShell eyebrow="Registry" title="Device" subtitle="Loading device record…">
        <p className="text-sm text-muted-foreground">Loading device record…</p>
      </PortalPageShell>
    );
  }

  if (error || !device) {
    return (
      <PortalPageShell eyebrow="Registry" title="Device" accentWord="Not Found" subtitle={error ?? 'Unknown device'}>
        <Link to="/inventory" className="text-sm font-medium text-foreground hover:underline">← Back to inventory</Link>
      </PortalPageShell>
    );
  }

  return (
    <PortalPageShell
      eyebrow="Registry"
      title="Device"
      accentWord="Detail"
      subtitle="Full lifecycle record and contextual actions"
      actions={
        <Link to="/inventory" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground min-h-[44px] inline-flex items-center">
          ← Inventory
        </Link>
      }
    >
      <div className="space-y-6">
        <DataPanel padding="md">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Identifier</p>
              <DeviceIdentifierChip identifier={device.identifier} deviceId={device.id} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Status</p>
              <PortalBadge variant={device.status === 'IN_STOCK' ? 'success' : 'primary'}>{device.status}</PortalBadge>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Model</p>
              <p className="text-xs font-semibold">{device.modelName}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Asset class</p>
              <p className="text-xs font-mono">{device.type}</p>
            </div>
          </div>

          {canWrite ? (
            <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-border">
              <Link to="/qc" search={{ qcDevice: device.id }}>
                <PortalButton variant="outline" size="sm">QC Bench</PortalButton>
              </Link>
              <Link to="/dispatch">
                <PortalButton variant="outline" size="sm">Dispatch</PortalButton>
              </Link>
              <Link to="/swaps" search={{ swapOldDevice: device.id }}>
                <PortalButton variant="outline" size="sm">RMA Swap</PortalButton>
              </Link>
            </div>
          ) : null}
        </DataPanel>

        <DataPanel padding="md">
          <h3 className="text-xs font-black uppercase tracking-wider mb-4">Audit timeline</h3>
          <AuditTimeline entries={auditLogs} />
        </DataPanel>
      </div>
    </PortalPageShell>
  );
}
