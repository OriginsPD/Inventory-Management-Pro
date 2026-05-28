import React, { useState, useEffect } from 'react';
import { CommandMenu } from '../ui/command-menu';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../ui/auth-context';
import { useFeedback } from '../ui/feedback-provider';
import { Link, useNavigate } from 'react-router-dom';
import { StockAlert } from '../../lib/types/domain';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const { toast } = useFeedback();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

  const currentPath = location.pathname;

  useEffect(() => {
    apiClient.get<StockAlert[]>('/api/stock-alerts')
      .then(data => setStockAlerts(data))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('Session terminated successfully');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const navGroups = [
    {
      label: 'Operations',
      items: [
        { name: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
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
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-card transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="relative flex h-20 items-center justify-center px-6 border-b border-border shrink-0">
          <div className="flex items-center justify-center">
            <img src="/logo.svg" alt="Amber Connect" className="h-14 w-auto max-w-[210px] object-contain" />
          </div>
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 lg:hidden p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-3">
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

        {/* Logout Section */}
        <div className="p-4 border-t border-border">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-muted/60 hover:bg-red-500/10 border border-border hover:border-red-500/20 text-muted-foreground hover:text-red-500 transition-all duration-200 group cursor-pointer"
          >
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Terminate Session</span>
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">logout</span>
          </button>
        </div>

      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-background">
        <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6 shrink-0 z-10">
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
                <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-red-500 bg-red-500/5 px-2 py-1 border border-red-500/20 font-bold font-mono uppercase tracking-tighter">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  <span>{lowCount} Critical Alerts</span>
                </div>
              );
              if (warnCount > 0) return (
                <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-amber-500 bg-amber-500/5 px-2 py-1 border border-amber-500/20 font-bold font-mono uppercase tracking-tighter">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  <span>{warnCount} Stock Warnings</span>
                </div>
              );
              return (
                <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-emerald-500 bg-emerald-500/5 px-2 py-1 border border-emerald-500/20 font-bold font-mono uppercase tracking-tighter">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  <span>System Nominal</span>
                </div>
              );
            })()}

            {/* Top-Right Profile Quick-Access */}
            <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
            <button
              onClick={() => navigate('/profile')}
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

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 custom-scrollbar">
          <div className="max-w-[1400px] w-full mx-auto">
            {children}
          </div>
        </main>
      </div>
      <CommandMenu />
    </div>
  );
};
