import { useState, useEffect, useMemo, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { Device, DeviceModel } from '@/lib/types/domain';

import { ScrollArea } from '@ims_pro/ui/components/scroll-area';
import { InlineErrorState } from '@/components/ui/inline-error-state';
import { ScreenLayout, ScreenHeader, Stagger, StaggerItem } from '@/components/ui/motion';

interface DashboardStats {
  totalDevices: number;
  activeDispatched: number;
  inStock: number;
  inTesting: number;
  lowStockAlerts: number;
}

interface AuditLog {
  id: string;
  actionType: string;
  details: string;
  createdAt: string;
}

interface DispatchTrend {
  day: string;
  dispatches: number;
}

interface AssetBreakdown {
  type: string;
  count: number;
}

interface StockAlert {
  modelName: string;
  level: string;
}

export const DashboardScreen = () => {
  type TrendPeriod = '1d' | '3m' | '1y';

  const [stats, setStats] = useState<DashboardStats>({
    totalDevices: 0,
    activeDispatched: 0,
    inStock: 0,
    inTesting: 0,
    lowStockAlerts: 3,
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [trendData, setTrendData] = useState<DispatchTrend[]>([]);
  const [breakdown, setBreakdown] = useState<AssetBreakdown[]>([]);
  const [activeTab, setActiveTab] = useState<'dispatches' | 'ingestions'>('dispatches');
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('1d');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const fetchStats = async () => {
    try {
      const data = await apiClient.get<Device[]>('/api/devices');
      setDevices(data);
      
      const statsObj = {
        totalDevices: data.length,
        activeDispatched: data.filter((d: Device) => d.status === 'DISPATCHED').length,
        inStock: data.filter((d: Device) => d.status === 'IN_STOCK').length,
        inTesting: data.filter((d: Device) => d.status === 'TESTING').length,
        lowStockAlerts: 3,
      };
      setStats(statsObj);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const fetchModels = async () => {
    try {
      const data = await apiClient.get<DeviceModel[]>('/api/device-models');
      setModels(data);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const fetchStockAlerts = async () => {
    try {
      const data = await apiClient.get<StockAlert[]>('/api/stock-alerts');
      setStockAlerts(data);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const logs = await apiClient.get<AuditLog[]>('/api/audit-logs');
      setRecentLogs(logs);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const fetchTrendData = async () => {
    try {
      const trend = await apiClient.get<DispatchTrend[]>(`/api/analytics/dispatches?period=${trendPeriod}`);
      setTrendData(trend);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const fetchBreakdownData = async () => {
    try {
      const data = await apiClient.get<AssetBreakdown[]>('/api/analytics/breakdown');
      setBreakdown(data);
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    const results = await Promise.allSettled([
      fetchStats(),
      fetchAuditLogs(),
      fetchTrendData(),
      fetchBreakdownData(),
      fetchModels(),
      fetchStockAlerts(),
    ]);

    const failedRequest = results.find(result => result.status === 'rejected');
    if (failedRequest?.status === 'rejected') {
      setLoadError(failedRequest.reason);
    }

    setIsLoading(false);
  }, [trendPeriod]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (stockAlerts.length > 0) {
      const activeLevels = stockAlerts.map(a => `${a.modelName}: ${a.level}`);
      console.debug('IMS Telemetry Stock Alerts status:', activeLevels);
    }
  }, [stockAlerts]);

  const formatTime = (isoString: string, currentTime: number) => {
    try {
      const diffMs = currentTime - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(isoString).toLocaleDateString();
    } catch {
      return 'some time ago';
    }
  };

  // SVG Chart Calculation parameters
  const chartHeight = 160;
  const chartWidth = 520;
  const paddingX = 35;
  const paddingY = 20;

  const getModelProfiles = () => {
    if (models.length === 0) return [];
    return models.map(m => {
      const relatedDevices = devices.filter(d => d.modelId === m.id);
      const inStock = relatedDevices.filter(d => d.status === 'IN_STOCK').length;
      const inTesting = relatedDevices.filter(d => d.status === 'TESTING').length;
      const dispatched = relatedDevices.filter(d => d.status === 'DISPATCHED').length;
      const total = relatedDevices.length;
      const maxStock = m.maxStock || 0;

      let stockLevel: 'HEALTHY' | 'WARNING' | 'LOW' = 'HEALTHY';
      if (maxStock > 0) {
        const ratio = inStock / maxStock;
        if (ratio < 0.3) stockLevel = 'LOW';
        else if (ratio < 0.6) stockLevel = 'WARNING';
      }
      
      return {
        id: m.id,
        name: m.name,
        brand: m.brand,
        assetType: m.assetType,
        maxStock,
        inStock,
        inTesting,
        dispatched,
        total,
        stockLevel,
      };
    });
  };

  const getIngestTrendData = () => {
    const result: { day: string, count: number }[] = [];
    const periodCfg: Record<TrendPeriod, { days: number; bucket: 'hour' | 'day' | 'week' }> = {
      '1d': { days: 1, bucket: 'hour' },
      '3m': { days: 90, bucket: 'week' },
      '1y': { days: 365, bucket: 'week' },
    };
    const selected = periodCfg[trendPeriod];

    const getWeekKey = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      d.setDate(diff);
      d.setHours(0, 0, 0, 0);
      return d.toISOString().split('T')[0] || '';
    };

    const getHourKey = (date: Date) => {
      const d = new Date(date);
      d.setMinutes(0, 0, 0);
      return d.toISOString();
    };

    const ingestCounts = new Map<string, number>();
    for (const log of recentLogs) {
      if (log.actionType !== 'INGEST') continue;
      const created = new Date(log.createdAt);
      const key = selected.bucket === 'hour'
        ? getHourKey(created)
        : selected.bucket === 'day'
          ? (created.toISOString().split('T')[0] || '')
          : getWeekKey(created);
      if (!key) continue;
      ingestCounts.set(key, (ingestCounts.get(key) || 0) + 1);
    }

    const steps =
      selected.bucket === 'hour'
        ? 24
        : selected.bucket === 'day'
          ? selected.days
          : Math.ceil(selected.days / 7);
    for (let i = steps - 1; i >= 0; i--) {
      const date = new Date();
      if (selected.bucket === 'hour') {
        date.setHours(date.getHours() - i);
      } else if (selected.bucket === 'day') {
        date.setDate(date.getDate() - i);
      } else {
        date.setDate(date.getDate() - i * 7);
      }

      const dateKey = selected.bucket === 'hour'
        ? getHourKey(date)
        : selected.bucket === 'day'
          ? (date.toISOString().split('T')[0] || '')
          : getWeekKey(date);
      const count = dateKey ? (ingestCounts.get(dateKey) || 0) : 0;

      result.push({
        day: selected.bucket === 'hour'
          ? date.toLocaleTimeString('en-US', { hour: 'numeric' })
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count
      });
    }
    return result;
  };

  const activeTrendData = activeTab === 'dispatches' ? trendData : getIngestTrendData();

  const maxVal = useMemo(() => {
    if (activeTrendData.length === 0) return 10;
    return Math.max(...activeTrendData.map(d => 'dispatches' in d ? (d as DispatchTrend).dispatches : (d as { count: number }).count), 10) * 1.15;
  }, [activeTrendData]);

  const getChartPoints = () => {
    if (activeTrendData.length === 0) return [];
    const divisor = Math.max(activeTrendData.length - 1, 1);
    return activeTrendData.map((d, index) => {
      const val = 'dispatches' in d ? (d as DispatchTrend).dispatches : (d as { count: number }).count;
      const x = paddingX + (index * (chartWidth - paddingX * 2) / divisor);
      const y = chartHeight - paddingY - (val * (chartHeight - paddingY * 2) / maxVal);
      return { x, y, day: d.day, value: val };
    });
  };

  const points = getChartPoints();
  const xAxisLabelStep = useMemo(() => {
    if (points.length <= 16) return 1;
    return Math.ceil(points.length / 10);
  }, [points.length]);
  const linePath = points.reduce((path, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
  }, '');
  
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  const getAssetTextColor = (type: string) => {
    switch (type) {
      case 'TRACKER': return 'text-foreground';
      case 'SIM': return 'text-muted-foreground';
      case 'SD_CARD': return 'text-muted-foreground/80';
      case 'PANIC_BUTTON': return 'text-muted-foreground/60';
      default: return 'text-muted-foreground/45';
    }
  };

  const normalizedBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of breakdown) {
      const key = String(item.type || '').toUpperCase();
      const value = Number(item.count) || 0;
      counts.set(key, (counts.get(key) || 0) + value);
    }

    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => a.type.localeCompare(b.type));
  }, [breakdown]);

  const totalBreakdownCount = normalizedBreakdown.reduce((sum, item) => sum + item.count, 0);
  const donutRadius = 54;
  const donutStroke = 14;
  const donutCircumference = 2 * Math.PI * donutRadius;
  const donutPalette = [
    'var(--primary)',      // Active Orange
    '#6366f1',             // Indigo
    '#0d9488',             // Teal
    '#ec4899',             // Pink
    '#f59e0b',             // Amber
    '#8b5cf6',             // Purple
    '#10b981',             // Emerald
    '#3b82f6',             // Blue
    '#84cc16',             // Lime
    '#a1a1aa',             // Zinc / Slate Gray
  ];

  const [now] = useState(() => Date.now());

  return (
    <ScreenLayout gap="gap-8">
        <ScreenHeader
          title="Warehouse Operations"
          description="Real-time logistics and inventory health telemetry."
        />

        {loadError !== null && !isLoading && (
          <div className="glass-panel rounded-xl overflow-hidden">
            <InlineErrorState
              title="Dashboard data failed to load"
              description="One or more dashboard data sources failed. Retry to refresh the operations snapshot."
              error={loadError}
              onRetry={loadAllData}
            />
          </div>
        )}

        {/* KPI Metrics Bento Grid */}
        <Stagger className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="glass-panel p-5 rounded-xl animate-pulse space-y-3">
                <div className="h-3 bg-primary/20 rounded w-2/3" />
                <div className="h-6 bg-primary/20 rounded w-1/2" />
              </div>
            ))
          ) : (
            <>
                <StaggerItem className="glass-panel p-5 rounded-xl flex flex-col justify-between hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.08)] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Total Hardware</span>
                  <span className="material-symbols-outlined text-primary text-xl">inventory</span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold">{stats.totalDevices}</div>
                  <div className="text-[10px] text-primary mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">trending_up</span> +2.4% vs prev week
                  </div>
                </div>
              </StaggerItem>

                <StaggerItem className="glass-panel p-5 rounded-xl flex flex-col justify-between hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.08)] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Active Dispatched</span>
                  <span className="material-symbols-outlined text-secondary-foreground text-xl">local_shipping</span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-emerald-400">{stats.activeDispatched}</div>
                  <div className="text-[10px] text-secondary-foreground mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">sync</span> In Transit
                  </div>
                </div>
              </StaggerItem>

                <StaggerItem className="glass-panel p-5 rounded-xl flex flex-col justify-between hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.08)] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Testing Bench</span>
                  <span className="material-symbols-outlined text-purple-300 text-xl">biotech</span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-purple-300">{stats.inTesting}</div>
                  <div className="text-[10px] text-purple-300 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">schedule</span> Avg. 4h cycle
                  </div>
                </div>
              </StaggerItem>

                <StaggerItem className="glass-panel p-5 rounded-xl flex flex-col justify-between hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.08)] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Ready Stock</span>
                  <span className="material-symbols-outlined text-primary text-xl">package_2</span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold">{stats.inStock}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span> 92% SLA target
                  </div>
                </div>
              </StaggerItem>

                <StaggerItem className="glass-panel p-5 rounded-xl flex flex-col justify-between hover:shadow-[0_0_30px_rgba(var(--color-primary-rgb),0.08)] transition-all">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">QC Pass Rate</span>
                  <span className="material-symbols-outlined text-primary text-xl">task_alt</span>
                </div>
                <div className="mt-4">
                  <div className="text-2xl font-bold text-emerald-400">97.4%</div>
                  <div className="text-[10px] text-primary mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">verified</span> Near Peak efficiency
                  </div>
                </div>
              </StaggerItem>
            </>
          )}
        </Stagger>

        {/* Analytics & Graphs row */}
        <Stagger className="grid gap-6 md:grid-cols-3">
          {/* Dispatch Trend SVG Chart */}
          <StaggerItem className="glass-panel p-6 rounded-2xl flex flex-col justify-between md:col-span-2">
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">Activity Velocity</h3>
                  <div className="flex bg-primary/5 p-1 rounded-lg border border-primary/10">
                    <button
                      onClick={() => setActiveTab('dispatches')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        activeTab === 'dispatches'
                          ? 'bg-primary/20 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Dispatches
                    </button>
                    <button
                      onClick={() => setActiveTab('ingestions')}
                      className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                        activeTab === 'ingestions'
                          ? 'bg-primary/20 text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Ingestions
                    </button>
                  </div>
                  <div className="flex bg-primary/5 p-1 rounded-lg border border-primary/10">
                    {(['1d', '3m', '1y'] as TrendPeriod[]).map((period) => (
                      <button
                        key={period}
                        onClick={() => setTrendPeriod(period)}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                          trendPeriod === period
                            ? 'bg-primary/20 text-primary shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {period === '1d' ? '1 Day' : period === '3m' ? '3 Months' : '1 Year'}
                      </button>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                  {trendPeriod === '1d' ? 'Past 1 Day' : trendPeriod === '3m' ? 'Past 3 Months' : 'Past Year'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                {activeTab === 'dispatches' 
                  ? 'Quantity of sub-elements successfully linked to operational vehicle trackers.'
                  : 'Velocity of raw device identifiers registered inside warehouse inventory.'}
              </p>
            </div>

            {isLoading ? (
              <div className="h-[180px] bg-primary/5 animate-pulse rounded-lg border border-dashed border-primary/20" />
            ) : activeTrendData.length > 0 ? (
              <div className="relative pt-2">
                {/* SVG Graphics container */}
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible select-none">
                  <defs>
                    <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
                    </linearGradient>
                  </defs>

                   {/* Horizontal grid lines with Y axis labels */}
                   {Array(4).fill(0).map((_, i) => {
                     const stepY = paddingY + i * (chartHeight - paddingY * 2) / 3;
                     const gridValue = Math.round(maxVal - i * maxVal / 3);
                     return (
                       <g key={i}>
                         <line 
                           x1={paddingX} 
                           y1={stepY} 
                           x2={chartWidth - paddingX} 
                           y2={stepY} 
                           className="stroke-primary/10" 
                           strokeWidth="1" 
                           strokeDasharray="4 4"
                         />
                         <text
                           x={paddingX - 6}
                           y={stepY + 3}
                           textAnchor="end"
                           className="text-[9px] fill-muted-foreground/60 font-semibold font-mono select-none"
                         >
                           {gridValue}
                         </text>
                       </g>
                     );
                   })}

                  {/* X axis line */}
                  <line 
                    x1={paddingX} 
                    y1={chartHeight - paddingY} 
                    x2={chartWidth - paddingX} 
                    y2={chartHeight - paddingY} 
                    className="stroke-primary/20" 
                    strokeWidth="1" 
                  />

                  {/* Gradient Area Fill */}
                  <path d={areaPath} fill="url(#gradientArea)" />

                  {/* Trend Line Path */}
                  <path d={linePath} fill="none" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />

                  {/* Nodes & interactive elements */}
                  {points.map((p, idx) => (
                    <g key={idx}>
                      <circle 
                        cx={p.x} 
                        cy={p.y} 
                        r={hoveredPoint === idx ? "5" : "3"} 
                        className={`fill-[var(--background)] stroke-primary transition-all duration-100 ${hoveredPoint === idx ? 'stroke-2' : ''}`} 
                      />
                      {(idx % xAxisLabelStep === 0 || idx === points.length - 1) && (
                        <text 
                          x={p.x} 
                          y={chartHeight - 4} 
                          textAnchor="middle" 
                          className="text-[9px] fill-muted-foreground font-semibold font-sans"
                        >
                          {p.day}
                        </text>
                      )}
                    </g>
                  ))}

                  {/* Vertical Hover Guidelines */}
                  {hoveredPoint !== null && (
                    <line 
                      x1={points[hoveredPoint].x} 
                      y1={paddingY} 
                      x2={points[hoveredPoint].x} 
                      y2={chartHeight - paddingY} 
                      className="stroke-primary/30" 
                      strokeWidth="1.5" 
                      strokeDasharray="2 2"
                    />
                  )}

                  {/* Invisible wide vertical rectangles for clean hover triggers */}
                  {points.map((p, idx) => {
                    const widthCol = (chartWidth - paddingX * 2) / (points.length - 1);
                    return (
                      <rect 
                        key={idx}
                        x={p.x - widthCol / 2}
                        y={0}
                        width={widthCol}
                        height={chartHeight}
                        fill="transparent"
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredPoint(idx)}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}
                </svg>

                {/* Float interactive tooltip */}
                {hoveredPoint !== null && points[hoveredPoint] && (
                  <div 
                    className="absolute z-20 bg-popover text-popover-foreground border border-primary/20 rounded shadow-md px-2.5 py-1 text-[10px] pointer-events-none transition-all duration-75"
                    style={{
                      left: `${(points[hoveredPoint].x / chartWidth) * 100}%`,
                      top: `${(points[hoveredPoint].y / chartHeight) * 100 - 25}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    <div className="font-semibold text-center leading-none">
                      {points[hoveredPoint].value} {activeTab === 'dispatches' ? 'linked' : 'ingested'}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-muted-foreground italic">
                No telemetry trends logged.
              </div>
            )}
          </StaggerItem>

          {/* Hardware Breakdown Donut equivalent */}
          <StaggerItem className="glass-panel p-6 rounded-2xl flex flex-col">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-lg">Asset Class Breakdown</h3>
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Live Ratio</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Proportionate composition of tracking devices, SIM configurations, and hardware adapters.</p>
            </div>

            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-3 bg-primary/20 rounded w-full" />
                <div className="h-20 bg-primary/20 rounded w-full" />
              </div>
            ) : normalizedBreakdown.length > 0 ? (
              <div className="space-y-4">
                {/* Donut chart */}
                <div className="flex items-center justify-center">
                  <div className="relative h-36 w-36">
                    <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
                      <circle
                        cx="70"
                        cy="70"
                        r={donutRadius}
                        fill="none"
                        stroke="var(--border)"
                        strokeWidth={donutStroke}
                      />
                      {totalBreakdownCount > 0 && (() => {
                        let runningOffset = 0;
                        return normalizedBreakdown.map((item, idx) => {
                          if (item.count <= 0) return null;
                          const segmentLength = (item.count / totalBreakdownCount) * donutCircumference;
                          const node = (
                            <circle
                              key={`${item.type}-${idx}`}
                              cx="70"
                              cy="70"
                              r={donutRadius}
                              fill="none"
                              stroke={donutPalette[idx % donutPalette.length]}
                              strokeWidth={donutStroke}
                              strokeLinecap="butt"
                              strokeDasharray={`${segmentLength} ${donutCircumference - segmentLength}`}
                              strokeDashoffset={-runningOffset}
                            />
                          );
                          runningOffset += segmentLength;
                          return node;
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold leading-none">{totalBreakdownCount}</span>
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Assets</span>
                    </div>
                  </div>
                </div>

                {/* Detailed legends panel */}
                <div className="max-h-44 overflow-y-auto pr-1 space-y-2 scrollbar-custom">
                  {normalizedBreakdown.map((item, idx) => {
                    const pct = totalBreakdownCount > 0 ? Math.round((item.count / totalBreakdownCount) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg border border-primary/5 bg-primary/5">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: donutPalette[idx % donutPalette.length] }}
                          />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{item.type.replace(/_/g, ' ')}</span>
                        </div>
                        <span className="text-xs font-bold text-foreground">
                          {item.count} units <span className={`text-[10px] font-normal ${getAssetTextColor(item.type)}`}>({pct}%)</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-muted-foreground italic">
                No inventory breakdown logged.
              </div>
            )}
          </StaggerItem>
        </Stagger>

        {/* Lower Layout Sections */}
        <Stagger className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Stock Health Table */}
          <StaggerItem className="lg:col-span-3 glass-panel rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-primary/10 flex justify-between items-center bg-primary/5">
              <h3 className="font-bold text-lg">Model Stock Health Register</h3>
              <a href="/models" className="text-xs text-primary hover:underline">View All Models</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-card/40 text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold border-b border-primary/10">
                  <tr>
                    <th className="px-6 py-4 font-bold">SKU / Model</th>
                    <th className="px-6 py-4 font-bold">Current Level</th>
                    <th className="px-6 py-4 font-bold">Progress Target</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/5">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <tr key={idx} className="animate-pulse">
                        <td className="px-6 py-4"><div className="h-4 bg-primary/10 rounded w-32" /></td>
                        <td className="px-6 py-4"><div className="h-4 bg-primary/10 rounded w-16" /></td>
                        <td className="px-6 py-4"><div className="h-3 bg-primary/10 rounded w-full" /></td>
                        <td className="px-6 py-4"><div className="h-5 bg-primary/10 rounded w-12" /></td>
                      </tr>
                    ))
                  ) : getModelProfiles().length > 0 ? (
                    getModelProfiles().map((profile) => {
                      const hasTarget = profile.maxStock > 0;
                      const pct = hasTarget ? Math.min((profile.inStock / profile.maxStock) * 100, 100) : 0;
                      
                      const barColor = profile.stockLevel === 'LOW'
                        ? 'bg-red-400'
                        : profile.stockLevel === 'WARNING'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400';
                        
                      const statusBadgeCls = profile.stockLevel === 'LOW'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : profile.stockLevel === 'WARNING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

                      return (
                        <tr key={profile.id} className="hover:bg-primary/5 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground">{profile.name}</span>
                              <span className="text-[10px] text-muted-foreground uppercase mt-0.5 tracking-wider">{profile.brand} / {profile.assetType}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">{profile.inStock} Units</span>
                              <span className="text-[9px] text-muted-foreground">Target: {profile.maxStock || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-full max-w-[200px] space-y-1">
                              {hasTarget ? (
                                <>
                                  <div className="w-full h-1.5 rounded-full bg-primary/10 overflow-hidden border border-primary/5">
                                    <div
                                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <span className="text-[9px] text-muted-foreground font-mono">{Math.round(pct)}% of target</span>
                                </>
                              ) : (
                                <span className="text-[9px] text-muted-foreground italic">No maximum limit set</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded border text-[9px] font-bold uppercase tracking-wider ${statusBadgeCls}`}>
                              {profile.stockLevel}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-xs text-muted-foreground italic">
                        No models configured in registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </StaggerItem>

          {/* Right layout Column */}
          <StaggerItem className="lg:col-span-1 flex flex-col gap-6">
            {/* Recent Operations Log */}
            <div className="glass-panel p-6 rounded-2xl flex-1 flex flex-col">
              <h3 className="font-bold text-lg mb-4">Recent Operations</h3>
              <ScrollArea className="h-[280px] pr-2">
                {recentLogs.length > 0 ? (
                  <div className="relative border-l border-primary/10 ml-2 pl-4 space-y-5 py-2">
                    {recentLogs.map((log) => {
                      const dotColor = log.actionType === 'INGEST' ? 'bg-emerald-400 border-emerald-500/20' :
                                       log.actionType === 'DELETE' ? 'bg-red-400 border-red-500/20' :
                                       log.actionType === 'LINK' ? 'bg-blue-400 border-blue-500/20' :
                                       'bg-primary border-primary/20';
                      return (
                        <div key={log.id} className="relative group">
                          {/* Timeline dot */}
                          <span className={`absolute -left-[20px] top-1.5 h-2 w-2 rounded-full border-2 border-[var(--background)] ${dotColor} ring-4 ring-background/40`} />
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold text-primary font-mono">{log.actionType}</span>
                              <span className="text-[9px] text-muted-foreground">{formatTime(log.createdAt, now)}</span>
                            </div>
                            <p className="text-xs font-semibold text-foreground leading-tight">{log.details}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-xs text-muted-foreground italic">
                    No recent operations.
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Recommendations Insight card */}
            <div className="glass-panel border-primary/20 bg-primary/5 rounded-2xl p-5 shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.05)] transition-all">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="material-symbols-outlined text-primary text-xl">lightbulb</span>
                <h4 className="font-bold text-sm text-primary uppercase tracking-wider text-[11px]">Warehouse Insight</h4>
              </div>
              <p className="text-xs text-foreground leading-relaxed">
                SIM card stock is low. Current remaining inventory is 200 units (minimum limit 500). Recommend scan-in box arrival.
              </p>
              <a href="/inventory" className="mt-4 w-full block text-center py-2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest rounded-lg hover:brightness-110 active:scale-95 transition-all">
                Ingest Inventory
              </a>
            </div>
          </StaggerItem>
        </Stagger>
      </ScreenLayout>
  );
};


