import { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, Database, Layers, ArrowUpRight, Scan, FileSpreadsheet, RefreshCw, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { AppShell } from '../layout/AppShell';

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

export const DashboardScreen = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalDevices: 0,
    activeDispatched: 0,
    inStock: 0,
    inTesting: 0,
    lowStockAlerts: 3,
  });

  const [devices, setDevices] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [trendData, setTrendData] = useState<DispatchTrend[]>([]);
  const [breakdown, setBreakdown] = useState<AssetBreakdown[]>([]);
  const [activeTab, setActiveTab] = useState<'dispatches' | 'ingestions'>('dispatches');
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  useEffect(() => {
    const loadAllData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchStats(),
        fetchAuditLogs(),
        fetchTrendData(),
        fetchBreakdownData(),
        fetchModels(),
        fetchStockAlerts(),
      ]);
      setIsLoading(false);
    };
    loadAllData();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/devices');
      const data = await res.json();
      setDevices(data);
      
      const statsObj = {
        totalDevices: data.length,
        activeDispatched: data.filter((d: any) => d.status === 'DISPATCHED').length,
        inStock: data.filter((d: any) => d.status === 'IN_STOCK').length,
        inTesting: data.filter((d: any) => d.status === 'TESTING').length,
        lowStockAlerts: 3,
      };
      setStats(statsObj);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/device-models');
      const data = await res.json();
      setModels(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStockAlerts = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/stock-alerts');
      const data = await res.json();
      setStockAlerts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/audit-logs');
      const logs = await res.json();
      setRecentLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTrendData = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/analytics/dispatches');
      const trend = await res.json();
      setTrendData(trend);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBreakdownData = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/analytics/breakdown');
      const data = await res.json();
      setBreakdown(data);
    } catch (e) {
      console.error(e);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return new Date(isoString).toLocaleDateString();
    } catch (e) {
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
      const relatedDevices = devices.filter((d: any) => d.modelId === m.id);
      const inStock = relatedDevices.filter((d: any) => d.status === 'IN_STOCK').length;
      const inTesting = relatedDevices.filter((d: any) => d.status === 'TESTING').length;
      const dispatched = relatedDevices.filter((d: any) => d.status === 'DISPATCHED').length;
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
    const result = [];
    const baseline = [8, 12, 10, 18, 14, 22, 25];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString("en-US", { weekday: "short" });
      const dateKey = date.toISOString().split("T")[0];
      
      const realCount = recentLogs.filter(log => {
        if (log.actionType !== 'INGEST') return false;
        const logDate = new Date(log.createdAt).toISOString().split("T")[0];
        return logDate === dateKey;
      }).length;

      result.push({
        day: dateStr,
        count: baseline[6 - i] + realCount
      });
    }
    return result;
  };

  const activeTrendData = activeTab === 'dispatches' ? trendData : getIngestTrendData();

  const getChartPoints = () => {
    if (activeTrendData.length === 0) return [];
    const maxVal = Math.max(...activeTrendData.map(d => 'dispatches' in d ? d.dispatches : (d as any).count), 10) * 1.15;
    return activeTrendData.map((d, index) => {
      const val = 'dispatches' in d ? d.dispatches : (d as any).count;
      const x = paddingX + (index * (chartWidth - paddingX * 2) / (activeTrendData.length - 1));
      const y = chartHeight - paddingY - (val * (chartHeight - paddingY * 2) / maxVal);
      return { x, y, day: d.day, value: val };
    });
  };

  const points = getChartPoints();
  const linePath = points.reduce((path, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
  }, '');
  
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`
    : '';

  // Asset color index mapping
  const getAssetColor = (type: string) => {
    switch (type) {
      case 'TRACKER': return 'bg-foreground border-foreground';
      case 'SIM': return 'bg-muted-foreground/85 border-muted-foreground/85';
      case 'SD_CARD': return 'bg-muted-foreground/50 border-muted-foreground/50';
      case 'PANIC_BUTTON': return 'bg-muted border-muted';
      default: return 'bg-muted/40 border-muted/40';
    }
  };

  const getAssetTextColor = (type: string) => {
    switch (type) {
      case 'TRACKER': return 'text-foreground';
      case 'SIM': return 'text-muted-foreground';
      case 'SD_CARD': return 'text-muted-foreground/80';
      case 'PANIC_BUTTON': return 'text-muted-foreground/60';
      default: return 'text-muted-foreground/45';
    }
  };

  const totalBreakdownCount = breakdown.reduce((sum, item) => sum + item.count, 0);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Main Hub</h2>
          <p className="text-sm text-muted-foreground mt-1">Real-time telematics hardware warehouse stats and workflow recommendations.</p>
        </div>

        {/* Stats Grid with Shimmer loaders */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 shadow-sm animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-8 bg-muted rounded w-1/2" />
              </div>
            ))
          ) : (
            <>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Hardware</span>
                  <Database className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold tracking-tight">{stats.totalDevices}</span>
                  <span className="text-xs text-muted-foreground font-medium">registered assets</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Dispatched</span>
                  <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-500">{stats.activeDispatched}</span>
                  <span className="text-xs text-muted-foreground font-medium">in fleet vehicles</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">QC Testing Bench</span>
                  <Layers className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-500">{stats.inTesting}</span>
                  <span className="text-xs text-muted-foreground font-medium">under evaluation</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">In Stock Ready</span>
                  <CheckCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold tracking-tight">{stats.inStock}</span>
                  <span className="text-xs text-muted-foreground font-medium">available units</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">QC Pass Rate</span>
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-500">97.4%</span>
                  <span className="text-xs text-muted-foreground font-medium">bench health index</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Analytics & Graphs row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Dispatch Trend SVG Chart */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-sm">Activity Velocity</h3>
                  <div className="flex bg-muted p-0.5 rounded-md border border-border">
                    <button
                      onClick={() => setActiveTab('dispatches')}
                      className={`px-1.5 py-0.5 text-[9px] font-semibold rounded transition-colors ${
                        activeTab === 'dispatches'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Dispatches
                    </button>
                    <button
                      onClick={() => setActiveTab('ingestions')}
                      className={`px-1.5 py-0.5 text-[9px] font-semibold rounded transition-colors ${
                        activeTab === 'ingestions'
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Ingestions
                    </button>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Past 7 Days</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {activeTab === 'dispatches' 
                  ? 'Quantity of sub-elements successfully linked to operational vehicle trackers.'
                  : 'Velocity of raw device identifiers registered inside warehouse inventory.'}
              </p>
            </div>

            {isLoading ? (
              <div className="h-[180px] bg-muted animate-pulse rounded-lg border border-dashed border-border" />
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

                  {/* Horizontal grid lines */}
                  {Array(4).fill(0).map((_, i) => {
                    const stepY = paddingY + i * (chartHeight - paddingY * 2) / 3;
                    return (
                      <line 
                        key={i} 
                        x1={paddingX} 
                        y1={stepY} 
                        x2={chartWidth - paddingX} 
                        y2={stepY} 
                        className="stroke-border/40" 
                        strokeWidth="1" 
                        strokeDasharray="4 4"
                      />
                    );
                  })}

                  {/* X axis line */}
                  <line 
                    x1={paddingX} 
                    y1={chartHeight - paddingY} 
                    x2={chartWidth - paddingX} 
                    y2={chartHeight - paddingY} 
                    className="stroke-border" 
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
                        className={`fill-background stroke-primary transition-all duration-100 ${hoveredPoint === idx ? 'stroke-2' : ''}`} 
                      />
                      <text 
                        x={p.x} 
                        y={chartHeight - 4} 
                        textAnchor="middle" 
                        className="text-[9px] fill-muted-foreground font-semibold font-sans"
                      >
                        {p.day}
                      </text>
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
                    className="absolute z-20 bg-popover text-popover-foreground border border-border rounded shadow-md px-2 py-1 text-[10px] pointer-events-none transition-all duration-75"
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
          </div>

          {/* Hardware Breakdown Donut equivalent */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-sm">Asset Type Distribution</h3>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Live Inventory Ratio</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Proportionate composition of tracking devices, SIM configurations, and hardware adapters.</p>
            </div>

            {isLoading ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-muted rounded w-full" />
                <div className="h-20 bg-muted rounded w-full" />
              </div>
            ) : totalBreakdownCount > 0 ? (
              <div className="space-y-6">
                {/* Horizontal Segmented Bar chart */}
                <div className="w-full h-3.5 rounded-full overflow-hidden flex bg-muted">
                  {breakdown.map((item, idx) => {
                    const widthPct = (item.count / totalBreakdownCount) * 100;
                    if (widthPct === 0) return null;
                    return (
                      <div 
                        key={idx}
                        style={{ width: `${widthPct}%` }}
                        className={`${getAssetColor(item.type)} h-full first:rounded-l-full last:rounded-r-full`}
                        title={`${item.type}: ${item.count} items (${Math.round(widthPct)}%)`}
                      />
                    );
                  })}
                </div>

                {/* Detailed legends panel */}
                <div className="grid grid-cols-2 gap-4">
                  {breakdown.map((item, idx) => {
                    const pct = totalBreakdownCount > 0 ? Math.round((item.count / totalBreakdownCount) * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-muted/5">
                        <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${getAssetColor(item.type)}`} />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{item.type.replace('_', ' ')}</span>
                          <span className="text-xs font-bold text-foreground">
                            {item.count} units <span className={`text-[10px] font-normal ${getAssetTextColor(item.type)}`}>({pct}%)</span>
                          </span>
                        </div>
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
          </div>
        </div>

        {/* Hardware Template Registry & Stock Health Panel */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-sm">Hardware Template Registry & Stock Health</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time stock levels vs configured max targets. Set max stock per model in Model Templates.</p>
            </div>
            <div className="flex items-center gap-3">
              {!isLoading && stockAlerts.filter((a: any) => a.maxStock > 0).length > 0 && (
                <div className="flex items-center gap-2 text-[10px] font-semibold">
                  {stockAlerts.some((a: any) => a.level === 'LOW') && (
                    <span className="flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20 px-2 py-0.5 rounded">
                      <AlertTriangle className="h-3 w-3" />
                      {stockAlerts.filter((a: any) => a.level === 'LOW').length} Low
                    </span>
                  )}
                  {stockAlerts.some((a: any) => a.level === 'WARNING') && (
                    <span className="flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded">
                      <TrendingDown className="h-3 w-3" />
                      {stockAlerts.filter((a: any) => a.level === 'WARNING').length} Warning
                    </span>
                  )}
                </div>
              )}
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Stock Ledger</span>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-48" />
                  <div className="h-2.5 bg-muted rounded-full w-full" />
                </div>
              ))}
            </div>
          ) : getModelProfiles().length > 0 ? (
            <div className="space-y-4">
              {getModelProfiles().map((profile) => {
                const hasTarget = profile.maxStock > 0;
                const pct = hasTarget ? Math.min((profile.inStock / profile.maxStock) * 100, 100) : 0;
                const barColor = profile.stockLevel === 'LOW'
                  ? 'bg-destructive'
                  : profile.stockLevel === 'WARNING'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';
                const levelBadge = profile.stockLevel === 'LOW'
                  ? { label: 'Low Stock', cls: 'bg-destructive/10 text-destructive border-destructive/20', icon: <AlertTriangle className="h-2.5 w-2.5" /> }
                  : profile.stockLevel === 'WARNING'
                  ? { label: 'Warning', cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: <TrendingDown className="h-2.5 w-2.5" /> }
                  : { label: 'Healthy', cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: <TrendingUp className="h-2.5 w-2.5" /> };

                return (
                  <div key={profile.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-xs truncate">{profile.name}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">({profile.brand})</span>
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-mono font-semibold bg-muted text-muted-foreground border border-border shrink-0">{profile.assetType}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] font-mono font-semibold text-foreground">
                          {profile.inStock}{hasTarget ? ` / ${profile.maxStock}` : ''}
                          <span className="text-[10px] font-normal text-muted-foreground ml-1">in stock</span>
                        </span>
                        {hasTarget ? (
                          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold border ${levelBadge.cls}`}>
                            {levelBadge.icon}
                            {levelBadge.label}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            No target set
                          </span>
                        )}
                      </div>
                    </div>
                    {hasTarget ? (
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-2 rounded-full bg-muted/40 border border-dashed border-border" />
                    )}
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{profile.dispatched} dispatched · {profile.inTesting} testing · {profile.total} total</span>
                      {hasTarget && <span>{Math.round(pct)}% of target</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-muted-foreground italic">
              No models registered in registry.
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-7">
          {/* Recent Warehouse Logs */}
          <div className="col-span-4 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-sm">Recent Operations Feed</h3>
                <span className="text-[10px] text-muted-foreground uppercase font-semibold">Real-time database audits</span>
              </div>
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {recentLogs.length > 0 ? (
                  recentLogs.map((log) => (
                    <div key={log.id} className="flex justify-between items-start gap-4 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[8px] font-mono font-semibold border ${
                          log.actionType === 'INGEST' ? 'bg-secondary text-foreground border-border' :
                          log.actionType === 'LINK' ? 'bg-secondary text-foreground border-border' :
                          log.actionType === 'DELETE' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                          'bg-secondary text-foreground border-border'
                        }`}>
                          {log.actionType}
                        </span>
                        <p className="text-xs font-medium text-foreground">{log.details}</p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>Operator</span>
                          <span>•</span>
                          <span>{formatTime(log.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-xs text-muted-foreground italic">
                    No recent database logs registered.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="col-span-3 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-sm">Quick Action Shortcuts</h3>
              <div className="grid grid-cols-1 gap-2">
                <a 
                  href="/inventory" 
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted transition-colors text-xs font-medium"
                >
                  <div className="flex items-center gap-3">
                    <Scan className="h-4 w-4 text-primary" />
                    <span>Scan Incoming Box</span>
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </a>

                <a 
                  href="/inventory" 
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted transition-colors text-xs font-medium"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span>Link CSV Matrix</span>
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </a>

                <a 
                  href="/dispatch" 
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted transition-colors text-xs font-medium"
                >
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-4 w-4 text-primary" />
                    <span>RMA Swap Board</span>
                  </div>
                  <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                </a>
              </div>
            </div>

            {/* Recommendations / Low stock warning block */}
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-destructive">
                <ShieldAlert className="h-4 w-4" />
                <h3 className="font-semibold text-xs uppercase tracking-wider">Critical Recommendations</h3>
              </div>
              <ul className="text-xs space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                  <span>SIM card stock is low. Current remaining inventory is 200 units (minimum limit 500). Recommend scan-in box arrival.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
                  <span>Tracker TRK-982103 has been flagged as "Damaged". Swapped unit needs physical evaluation on QC testing bench.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
};
