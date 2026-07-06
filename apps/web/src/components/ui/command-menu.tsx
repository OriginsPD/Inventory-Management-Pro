import { useNavigate } from '@tanstack/react-router';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ScrollArea } from '@ims_pro/ui/components/scroll-area';

interface CommandItem {
  id: string;
  name: string;
  category: 'Navigation' | 'Actions';
  icon: string;
  shortcut?: string;
  action: () => void;
}

export const CommandMenu = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const go = useCallback((to: string, search?: Record<string, string>) => {
    navigate({ to, search });
    setIsOpen(false);
  }, [navigate]);

  const commands = useMemo<CommandItem[]>(() => [
    { id: 'nav-dashboard', name: 'Go to Dashboard', category: 'Navigation', icon: 'dashboard', shortcut: 'G D', action: () => go('/dashboard') },
    { id: 'nav-inventory', name: 'Go to Device Inventory', category: 'Navigation', icon: 'inventory_2', shortcut: 'G I', action: () => go('/inventory') },
    { id: 'nav-models', name: 'Go to Model Templates', category: 'Navigation', icon: 'layers', shortcut: 'G M', action: () => go('/models') },
    { id: 'nav-customers', name: 'Go to Customers Registry', category: 'Navigation', icon: 'groups', shortcut: 'G C', action: () => go('/customers') },
    { id: 'nav-dispatch', name: 'Go to Customer Dispatch', category: 'Navigation', icon: 'local_shipping', shortcut: 'G P', action: () => go('/dispatch') },
    { id: 'nav-qc', name: 'Go to Technical QC Bench', category: 'Navigation', icon: 'biotech', shortcut: 'G Q', action: () => go('/qc') },
    { id: 'nav-swaps', name: 'Go to RMA Swaps Portal', category: 'Navigation', icon: 'swap_horiz', shortcut: 'G S', action: () => go('/swaps') },
    { id: 'nav-profile', name: 'Go to Operator Profile', category: 'Navigation', icon: 'person', shortcut: 'G U', action: () => go('/profile') },
    { id: 'nav-settings', name: 'Go to Application Settings', category: 'Navigation', icon: 'settings', shortcut: 'G A', action: () => go('/settings') },
    { id: 'nav-reports', name: 'Go to Reports Dashboard', category: 'Navigation', icon: 'analytics', shortcut: 'G R', action: () => go('/reports') },
    { id: 'action-ingest', name: 'Bulk Ingest Assets (CSV Wizard)', category: 'Actions', icon: 'upload_file', action: () => go('/inventory', { action: 'ingest' }) },
    { id: 'action-export-inventory', name: 'Export Active Inventory (Excel)', category: 'Actions', icon: 'table_chart', action: () => go('/reports', { tab: 'inventory' }) },
    { id: 'action-export-stock', name: 'Export Stock Health Report (Excel)', category: 'Actions', icon: 'monitoring', action: () => go('/reports', { tab: 'stock' }) },
    { id: 'action-export-customers', name: 'Export Customer Allocations (Excel)', category: 'Actions', icon: 'groups', action: () => go('/reports', { tab: 'customer' }) },
    { id: 'action-export-audit', name: 'Export Lifecycle Audit logs (Excel)', category: 'Actions', icon: 'history', action: () => go('/reports', { tab: 'audit' }) },
    { id: 'action-scan', name: 'Scan Box Incoming Inventory', category: 'Actions', icon: 'barcode_scanner', action: () => go('/inventory', { action: 'scan' }) },
    { id: 'action-swap', name: 'Perform Atomic RMA Swap', category: 'Actions', icon: 'sync_alt', action: () => go('/swaps', { action: 'new' }) },
    { id: 'action-dispatch-stage', name: 'Stage Dispatch Batch', category: 'Actions', icon: 'local_shipping', action: () => go('/dispatch', { action: 'stage' }) },
  ], [go]);

  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    const query = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.name.toLowerCase().includes(query) || 
      cmd.category.toLowerCase().includes(query)
    );
  }, [search, commands]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setSearch('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (filteredCommands.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filteredCommands[selectedIndex]?.action();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  const categories = ['Navigation', 'Actions'] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-background/60 animate-in fade-in duration-150">
      <div 
        ref={containerRef}
        className="w-full max-w-lg border border-border bg-card overflow-hidden flex flex-col max-h-[420px] animate-in zoom-in-95 duration-150 rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center gap-2.5 px-3.5 border-b border-border bg-card">
          <span className="material-symbols-outlined text-[18px] text-muted-foreground shrink-0">search</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search shortcuts..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-0 focus:ring-0"
          />
          <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-[#F7F6F3] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <ScrollArea className="flex-1 max-h-[300px]">
          {filteredCommands.length > 0 ? (
            <div className="p-2 space-y-3">
              {categories.map(category => {
                const categoryCommands = filteredCommands.filter(c => c.category === category);
                if (categoryCommands.length === 0) return null;
                return (
                  <div key={category} className="space-y-1">
                    <p className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {category}
                    </p>
                    <div className="space-y-0.5">
                      {categoryCommands.map(cmd => {
                        const globalIdx = filteredCommands.findIndex(c => c.id === cmd.id);
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <div
                            key={cmd.id}
                            onClick={() => cmd.action()}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`flex items-center justify-between px-2.5 py-2 rounded-md cursor-pointer transition-colors duration-100 ${
                              isSelected ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="material-symbols-outlined text-[16px] shrink-0">{cmd.icon}</span>
                              <span className="text-sm font-medium truncate">{cmd.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {cmd.shortcut && (
                                <kbd className="hidden md:inline-block font-mono text-[10px] text-muted-foreground px-1.5 border border-border bg-[#F7F6F3] rounded">
                                  {cmd.shortcut}
                                </kbd>
                              )}
                              {isSelected && (
                                <span className="material-symbols-outlined text-[14px] text-muted-foreground">keyboard_return</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">No matching commands found.</div>
          )}
        </ScrollArea>

        <div className="flex items-center justify-between px-3.5 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground shrink-0">
          <div className="flex items-center gap-2.5">
            <span>Navigate with arrows</span>
            <span>·</span>
            <span>Enter to select</span>
          </div>
          <kbd className="flex items-center gap-0.5 font-mono text-[10px] border border-border bg-card rounded px-1.5 py-0.5">
            Ctrl+K
          </kbd>
        </div>
      </div>
    </div>
  );
};
