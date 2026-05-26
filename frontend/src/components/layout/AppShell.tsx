import React, { useState, useEffect } from 'react';
import { CommandMenu } from '../ui/command-menu';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../ui/auth-context';
import { Link, useLocation } from 'react-router-dom';
import { StockAlert } from '../../lib/types/domain';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

  useEffect(() => {
    // Apply theme settings on load
    const savedAccent = localStorage.getItem('ims_theme_accent') || 'zinc';
    if (savedAccent && savedAccent !== 'zinc') {
      document.documentElement.setAttribute('data-accent', savedAccent);
    } else {
      document.documentElement.removeAttribute('data-accent');
    }

    const savedDensity = localStorage.getItem('ims_layout_density') || 'default';
    if (savedDensity === 'compact') {
      document.documentElement.classList.add('density-compact');
    } else {
      document.documentElement.classList.remove('density-compact');
    }
  }, []);

  useEffect(() => {
    apiClient.get<StockAlert[]>('/api/stock-alerts')
      .then(data => setStockAlerts(data))
      .catch(() => {});
  }, []);

  const navGroups = [
    {
      label: 'Operations',
      items: [
        { name: 'Dashboard', path: '/', icon: 'dashboard' },
        { name: 'Inventory', path: '/inventory', icon: 'inventory_2' },
        { name: 'Dispatch', path: '/dispatch', icon: 'local_shipping' },
        { name: 'QC Bench', path: '/qc', icon: 'biotech' },
      ]
    },
    {
      label: 'Management',
      items: [
        ...(user?.role === 'SUPER_USER' ? [{ name: 'Users', path: '/users', icon: 'manage_accounts' }] : []),
        { name: 'Model Templates', path: '/models', icon: 'layers' },
        { name: 'RMA Swaps', path: '/swaps', icon: 'swap_horiz' },
        { name: 'Customers', path: '/customers', icon: 'groups' },
        { name: 'Reports', path: '/reports', icon: 'analytics' },
        { name: 'Settings', path: '/settings', icon: 'settings' },
      ]
    },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-background text-foreground font-sans antialiased selection:bg-primary/30 relative">
      {/* Background Glow Decorations */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-primary/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-60 flex-col border-r border-primary/10 bg-card/60 backdrop-blur-2xl transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-14 items-center justify-between px-6 border-b border-primary/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-wider text-primary">IMS Pro</span>
          </div>
          <button 
            className="lg:hidden p-1 hover:bg-primary/15 rounded text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = currentPath === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
                        isActive 
                          ? 'bg-primary/5 text-primary border-r-2 border-primary font-semibold' 
                          : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Block */}
        <div className="p-4 border-t border-primary/5">
          <div className="glass-panel rounded-xl p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 text-xs font-bold text-primary">
                  {user?.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                </div>
                <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold truncate leading-tight text-foreground">{user?.name}</p>
                <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider mt-0.5">
                  {user?.role === 'SUPER_USER' ? 'Super User' : user?.role === 'TECHNICIAN' ? 'Technician' : 'Reviewer'}
                </p>
              </div>
            </div>
            <button 
              onClick={logout} 
              className="p-1 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors shrink-0 cursor-pointer" 
              title="Logout"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>

      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="flex h-14 items-center justify-between border-b border-primary/10 bg-background/60 backdrop-blur-xl px-6 shrink-0 z-10">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1.5 lg:hidden text-muted-foreground hover:text-foreground"
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          
          <div className="flex items-center gap-4 ml-auto">
            {/* Dynamic Stock Alert Badge */}
            {(() => {
              const withTarget = stockAlerts.filter(a => (a.maxStock ?? 0) > 0);
              const lowCount = withTarget.filter(a => a.level === 'LOW').length;
              const warnCount = withTarget.filter(a => a.level === 'WARNING').length;
              if (withTarget.length === 0) return null;
              if (lowCount > 0) return (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/25 font-semibold font-mono">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  <span>{lowCount} LOW STOCK ALERT{lowCount > 1 ? 'S' : ''}</span>
                </div>
              );
              if (warnCount > 0) return (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/25 font-semibold font-mono">
                  <span className="material-symbols-outlined text-xs">warning</span>
                  <span>{warnCount} STOCK WARNING{warnCount > 1 ? 'S' : ''}</span>
                </div>
              );
              return (
                <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/25 font-semibold font-mono">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>ALL STOCK HEALTHY</span>
                </div>
              );
            })()}

          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[1440px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
      <CommandMenu />
    </div>
  );
};
