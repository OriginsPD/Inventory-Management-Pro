import React, { useState, useEffect } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { CommandMenu } from '@/components/ui/command-menu';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/ui/auth-context';
import { useFeedback } from '@/components/ui/feedback-provider';
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { StockAlert } from '@/lib/types/domain';
import { IMSBrandLogo } from '@/components/ui/IMSBrandLogo';
import { GlobalScannerProvider } from '@/components/layout/GlobalScannerProvider';
import { GlobalScannerBar } from '@/components/layout/GlobalScannerBar';
import { ShortcutHelpOverlay } from '@/components/layout/ShortcutHelpOverlay';
import { OnboardingTour } from '@/components/layout/OnboardingTour';
import { StockAlertPill } from '@/components/portal';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/dispatch': 'Dispatch',
  '/qc': 'QC Bench',
  '/customers': 'Customers',
  '/models': 'Model Templates',
  '/swaps': 'RMA Swaps',
  '/reports': 'Reports',
  '/profile': 'Operator Profile',
  '/settings': 'System Settings',
  '/superuser': 'Super User Hub',
  '/alerts': 'Stock Alerts',
};

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const { toast } = useFeedback();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const shouldReduceMotion = useReducedMotion();

  const currentPath = useRouterState({ select: (s) => s.location.pathname });
  const pageTitle = PAGE_TITLES[currentPath] ?? (currentPath.startsWith('/devices/') ? 'Device Detail' : 'Portal');

  useEffect(() => {
    apiClient.get<StockAlert[]>('/api/stock-alerts')
      .then(data => setStockAlerts(data))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.info("Session terminated successfully");
      navigate({ to: "/login" });
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const navGroups = [
    {
      label: 'Command Center',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
      ],
    },
    {
      label: 'Field Ops',
      items: [
        { name: 'Inventory', path: '/inventory', icon: 'inventory_2' },
        { name: 'Dispatch', path: '/dispatch', icon: 'local_shipping' },
        { name: 'QC Bench', path: '/qc', icon: 'biotech' },
      ],
    },
    {
      label: 'Registry',
      items: [
        { name: 'Customers', path: '/customers', icon: 'groups' },
        { name: 'Model Templates', path: '/models', icon: 'layers' },
        { name: 'RMA Swaps', path: '/swaps', icon: 'swap_horiz' },
      ],
    },
    {
      label: 'Intelligence',
      items: [
        { name: 'Reports', path: '/reports', icon: 'analytics' },
        { name: 'Stock Alerts', path: '/alerts', icon: 'warning' },
      ],
    },
    {
      label: 'Console',
      items: [
        { name: 'Operator Profile', path: '/profile', icon: 'person' },
        { name: 'System Settings', path: '/settings', icon: 'settings' },
        ...(user?.role === 'SUPER_USER'
          ? [{ name: 'Super User Hub', path: '/superuser', icon: 'shield_person' }]
          : []),
      ],
    },
  ];

  return (
    <GlobalScannerProvider>
    <div className="h-screen w-screen overflow-hidden flex bg-background text-foreground font-sans antialiased selection:bg-primary/30 relative">
      <AnimatePresence>
        {sidebarOpen && (
          <m.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/80 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col sidebar-panel transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="relative flex h-20 items-center justify-start px-6 border-b border-border shrink-0">
          <Link to="/dashboard" className="flex items-center justify-start hover:opacity-90 transition-opacity">
            <IMSBrandLogo size={36} showText={true} />
          </Link>
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 lg:hidden p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {navGroups.map((group, groupIndex) => (
            <div
              key={group.label}
              className={groupIndex > 0 ? 'space-y-3 pt-4 border-t border-primary/5' : 'space-y-3'}
            >
              <p className="px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                        isActive 
                          ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-transparent hover:bg-red-500/10 border border-border/40 hover:border-red-500/30 text-muted-foreground hover:text-red-400 transition-all duration-200 group cursor-pointer"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Terminate Session</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-background">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 -ml-1.5 lg:hidden text-muted-foreground hover:text-foreground shrink-0"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground truncate">
              {pageTitle}
            </h1>
          </div>
          
          <div className="flex items-center gap-4 ml-auto shrink-0">
            {(() => {
              const withTarget = stockAlerts.filter(a => (a.maxStock ?? 0) > 0);
              const lowCount = withTarget.filter(a => a.level === 'LOW').length;
              const warnCount = withTarget.filter(a => a.level === 'WARNING').length;
              if (withTarget.length === 0) return null;
              if (lowCount > 0) return (
                <Link to="/alerts" className="hidden sm:block">
                  <StockAlertPill level="LOW" label="Critical Alerts" count={lowCount} />
                </Link>
              );
              if (warnCount > 0) return (
                <Link to="/alerts" className="hidden sm:block">
                  <StockAlertPill level="WARNING" label="Stock Warnings" count={warnCount} />
                </Link>
              );
              return (
                <Link to="/alerts" className="hidden sm:block">
                  <StockAlertPill level="HEALTHY" label="System Nominal" />
                </Link>
              );
            })()}

            <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
            <button
              onClick={() => navigate({ to: "/profile" })}
              className="flex items-center gap-3 px-3 py-1.5 hover:bg-muted border border-transparent hover:border-border transition-all group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-foreground uppercase tracking-tight leading-none group-hover:text-primary transition-colors">
                  {user?.name}
                </p>
                <p className="text-[8px] font-mono text-muted-foreground uppercase tracking-widest mt-1 leading-none">
                  {user?.role === 'SUPER_USER' ? 'Admin Node' : 'Technician'}
                </p>
              </div>
              <div className="w-8 h-8 bg-muted border border-border flex items-center justify-center text-[10px] font-black text-foreground group-hover:border-primary/50 transition-colors">
                {user?.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
              </div>
            </button>
          </div>
        </header>

        <main
          data-portal-main
          className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 pb-24 lg:pb-8 scrollbar-custom"
        >
          <div className="max-w-[1400px] w-full mx-auto">
            {children}
          </div>
        </main>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur-md">
          <div className="grid grid-cols-4 gap-1 p-2">
            {[
              { to: '/dashboard', icon: 'dashboard', label: 'Home' },
              { to: '/inventory', icon: 'inventory_2', label: 'Stock' },
              { to: '/dispatch', icon: 'local_shipping', label: 'Dispatch' },
              { to: '/qc', icon: 'biotech', label: 'QC' },
            ].map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl min-h-[52px] text-[8px] font-bold uppercase tracking-wider ${
                  currentPath === item.to ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      <GlobalScannerBar />
      <ShortcutHelpOverlay />
      <OnboardingTour />
      <CommandMenu />
    </div>
    </GlobalScannerProvider>
  );
};
