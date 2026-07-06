import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';

import { PortalPageShell } from '@/components/layout/PortalPageShell';
import { StockAlertPill } from '@/components/portal';
import { DataPanel } from '@/components/ui/portal';
import { apiClient } from '@/lib/api-client';

interface StockAlertRow {
  modelId: string;
  name: string;
  brand: string;
  assetType: string;
  maxStock: number;
  inStock: number;
  total: number;
  level: 'HEALTHY' | 'WARNING' | 'LOW';
}

export function AlertsScreen() {
  const [alerts, setAlerts] = useState<StockAlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<StockAlertRow[]>('/api/stock-alerts')
      .then(setAlerts)
      .finally(() => setLoading(false));
  }, []);

  const actionable = alerts.filter((a) => (a.maxStock ?? 0) > 0 && a.level !== 'HEALTHY');

  return (
    <PortalPageShell
      eyebrow="Intelligence"
      title="Stock"
      accentWord="Alerts"
      subtitle="Actionable inventory thresholds by model template"
      actions={
        <Link
          to="/reports"
          search={{ tab: 'stock' }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline min-h-[44px]"
        >
          Export report
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        </Link>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading alerts…</p>
      ) : actionable.length === 0 ? (
        <DataPanel>
          <div className="flex flex-col items-center py-12 text-center">
            <span className="material-symbols-outlined text-4xl text-[var(--status-success-fg)] mb-2">check_circle</span>
            <p className="text-sm font-medium">All stock levels nominal</p>
          </div>
        </DataPanel>
      ) : (
        <div className="space-y-3">
          {actionable.map((alert) => (
            <DataPanel key={alert.modelId} padding="sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-tight text-foreground">{alert.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mt-0.5">
                    {alert.inStock} / {alert.maxStock} in stock · {alert.brand}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <StockAlertPill
                    level={alert.level}
                    label={alert.level === 'LOW' ? 'Critical' : 'Warning'}
                  />
                  <Link
                    to="/inventory"
                    className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline min-h-[44px] inline-flex items-center"
                  >
                    View inventory
                  </Link>
                </div>
              </div>
            </DataPanel>
          ))}
        </div>
      )}
    </PortalPageShell>
  );
}
