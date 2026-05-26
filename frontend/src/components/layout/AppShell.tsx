import React, { useState, useEffect } from 'react';
import { CommandMenu } from '../ui/command-menu';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../ui/auth-context';
import { useFeedback } from '../ui/feedback-provider';
import { Link, useLocation } from 'react-router-dom';
import { StockAlert } from '../../lib/types/domain';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const { toast } = useFeedback();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

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
    <div className="h-screen w-screen overflow-hidden flex bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-primary/30 relative">
      {/* Mobile Sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950 transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-14 items-center justify-between px-6 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black tracking-[0.2em] text-white uppercase">IMS<span className="text-primary">PRO</span></span>
          </div>
          <button 
            className="lg:hidden p-1 hover:bg-zinc-900 rounded text-zinc-500 hover:text-zinc-100"
            onClick={() => setSidebarOpen(false)}
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-8">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-3">
              <p className="px-3 text-[9px] font-bold uppercase tracking-[0.25em] text-zinc-600">
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
                          ? 'bg-zinc-900 text-primary border-l-2 border-primary' 
                          : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-100'
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

        {/* User Profile Block */}
        <div className="p-4 border-t border-zinc-900">
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-none p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-none bg-zinc-800 flex items-center justify-center border border-zinc-700 text-[10px] font-black text-zinc-300">
                  {user?.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 block h-2 w-2 bg-emerald-500 border border-zinc-950" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold truncate leading-tight text-zinc-100 uppercase tracking-tight">{user?.name}</p>
                <p className="text-[8px] text-zinc-600 font-mono uppercase tracking-widest mt-0.5">
                  {user?.role === 'SUPER_USER' ? 'Admin Node' : user?.role === 'TECHNICIAN' ? 'Technician' : 'Reviewer'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleLogout} 
              className="p-1 hover:bg-red-500/10 rounded-none text-zinc-600 hover:text-red-500 transition-colors shrink-0 cursor-pointer" 
              title="Logout"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>

      </aside>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-[#09090b]">
        <header className="flex h-14 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 shrink-0 z-10">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 -ml-1.5 lg:hidden text-zinc-500 hover:text-zinc-100"
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
