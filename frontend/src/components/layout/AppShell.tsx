import React, { useState, useEffect } from 'react';
import { Home, Database, Cpu, Menu, X, Shield, AlertCircle, Settings, Truck, CheckSquare, RefreshCw, Users } from 'lucide-react';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const currentPath = window.location.pathname;
  const [stockAlerts, setStockAlerts] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:3002/api/stock-alerts')
      .then(r => r.json())
      .then(data => setStockAlerts(data))
      .catch(() => {});
  }, []);

  const navGroups = [
    {
      label: 'Overview',
      items: [
        { name: 'Dashboard', path: '/', icon: Home },
      ]
    },
    {
      label: 'Hardware',
      items: [
        { name: 'Device Inventory', path: '/inventory', icon: Database },
        { name: 'Model Templates', path: '/models', icon: Cpu },
      ]
    },
    {
      label: 'Operations',
      items: [
        { name: 'Customers', path: '/customers', icon: Users },
        { name: 'Customer Dispatch', path: '/dispatch', icon: Truck },
        { name: 'QC Bench', path: '/qc', icon: CheckSquare },
        { name: 'RMA Swaps', path: '/swaps', icon: RefreshCw },
      ]
    },
    {
      label: 'System',
      items: [
        { name: 'Settings', path: '/settings', icon: Settings },
      ]
    },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background text-foreground font-sans antialiased selection:bg-primary selection:text-primary-foreground">
      
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-56 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-12 items-center justify-between px-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-foreground/80" />
            <span className="font-semibold tracking-tight text-xs">IMS-Pro</span>
            <span className="bg-muted text-muted-foreground text-[9px] font-mono px-1 py-0.5 rounded border border-border">v2.3</span>
          </div>
          <button 
            className="lg:hidden p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = currentPath === item.path;
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.name}
                      href={item.path}
                      className={`flex items-center gap-2.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                        isActive 
                          ? 'bg-secondary text-foreground border border-border/80' 
                          : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      {item.name}
                    </a>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Database Connection Status Block */}
        <div className="p-3 border-t border-border bg-muted/20 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="font-semibold text-foreground text-[10px]">Neon DB Connected</span>
              <span className="text-[8px] text-muted-foreground font-mono">pg.neon.tech</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="flex h-12 items-center justify-between border-b border-border bg-card px-4 lg:px-6 shrink-0">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1.5 lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-4 w-4" />
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            {/* Dynamic Stock Alert Badge */}
            {(() => {
              const withTarget = stockAlerts.filter(a => a.maxStock > 0);
              const lowCount = withTarget.filter(a => a.level === 'LOW').length;
              const warnCount = withTarget.filter(a => a.level === 'WARNING').length;
              if (withTarget.length === 0) return null;
              if (lowCount > 0) return (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-red-600 dark:text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/25 font-semibold font-mono">
                  <AlertCircle className="h-3 w-3" />
                  <span>{lowCount} LOW STOCK ALERT{lowCount > 1 ? 'S' : ''}</span>
                </div>
              );
              if (warnCount > 0) return (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25 font-semibold font-mono">
                  <AlertCircle className="h-3 w-3" />
                  <span>{warnCount} STOCK WARNING{warnCount > 1 ? 'S' : ''}</span>
                </div>
              );
              return (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/25 font-semibold font-mono">
                  <AlertCircle className="h-3 w-3" />
                  <span>ALL STOCK HEALTHY</span>
                </div>
              );
            })()}
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-[1440px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
