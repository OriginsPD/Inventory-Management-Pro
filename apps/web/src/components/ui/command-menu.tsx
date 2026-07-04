import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  Home, 
  Database, 
  Cpu, 
  Users, 
  Truck, 
  CheckSquare, 
  RefreshCw, 
  Settings, 
  Scan, 
  FileSpreadsheet,
  CornerDownLeft
} from 'lucide-react';
import { ScrollArea } from '@ims_pro/ui/components/scroll-area';

interface CommandItem {
  id: string;
  name: string;
  category: 'Navigation' | 'Actions';
  icon: any;
  shortcut?: string;
  action: () => void;
}

export const CommandMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<CommandItem[]>(() => [
    // Navigation Commands
    {
      id: 'nav-dashboard',
      name: 'Go to Dashboard',
      category: 'Navigation',
      icon: Home,
      shortcut: 'G D',
      action: () => { window.location.href = '/'; }
    },
    {
      id: 'nav-inventory',
      name: 'Go to Device Inventory',
      category: 'Navigation',
      icon: Database,
      shortcut: 'G I',
      action: () => { window.location.href = '/inventory'; }
    },
    {
      id: 'nav-models',
      name: 'Go to Model Templates',
      category: 'Navigation',
      icon: Cpu,
      shortcut: 'G M',
      action: () => { window.location.href = '/models'; }
    },
    {
      id: 'nav-customers',
      name: 'Go to Customers Registry',
      category: 'Navigation',
      icon: Users,
      shortcut: 'G C',
      action: () => { window.location.href = '/customers'; }
    },
    {
      id: 'nav-dispatch',
      name: 'Go to Customer Dispatch',
      category: 'Navigation',
      icon: Truck,
      shortcut: 'G P',
      action: () => { window.location.href = '/dispatch'; }
    },
    {
      id: 'nav-qc',
      name: 'Go to Technical QC Bench',
      category: 'Navigation',
      icon: CheckSquare,
      shortcut: 'G Q',
      action: () => { window.location.href = '/qc'; }
    },
    {
      id: 'nav-swaps',
      name: 'Go to RMA Swaps Portal',
      category: 'Navigation',
      icon: RefreshCw,
      shortcut: 'G S',
      action: () => { window.location.href = '/swaps'; }
    },
    {
      id: 'nav-settings',
      name: 'Go to Application Settings',
      category: 'Navigation',
      icon: Settings,
      shortcut: 'G A',
      action: () => { window.location.href = '/settings'; }
    },
    {
      id: 'nav-reports',
      name: 'Go to Reports Dashboard',
      category: 'Navigation',
      icon: FileSpreadsheet,
      shortcut: 'G R',
      action: () => { window.location.href = '/reports'; }
    },

    // Action Commands
    {
      id: 'action-ingest',
      name: 'Bulk Ingest Assets (CSV Wizard)',
      category: 'Actions',
      icon: FileSpreadsheet,
      action: () => {
        window.location.href = '/inventory?action=ingest';
      }
    },
    {
      id: 'action-export-inventory',
      name: 'Export Active Inventory (Excel)',
      category: 'Actions',
      icon: FileSpreadsheet,
      action: () => {
        window.location.href = '/reports?tab=inventory';
      }
    },
    {
      id: 'action-export-stock',
      name: 'Export Stock Health Report (Excel)',
      category: 'Actions',
      icon: FileSpreadsheet,
      action: () => {
        window.location.href = '/reports?tab=stock';
      }
    },
    {
      id: 'action-export-customers',
      name: 'Export Customer Allocations (Excel)',
      category: 'Actions',
      icon: FileSpreadsheet,
      action: () => {
        window.location.href = '/reports?tab=customer';
      }
    },
    {
      id: 'action-export-audit',
      name: 'Export Lifecycle Audit logs (Excel)',
      category: 'Actions',
      icon: FileSpreadsheet,
      action: () => {
        window.location.href = '/reports?tab=audit';
      }
    },
    {
      id: 'action-scan',
      name: 'Scan Box Incoming Inventory',
      category: 'Actions',
      icon: Scan,
      action: () => {
        window.location.href = '/inventory?action=scan';
      }
    },
    {
      id: 'action-swap',
      name: 'Perform Atomic RMA Swap',
      category: 'Actions',
      icon: RefreshCw,
      action: () => {
        window.location.href = '/swaps?action=new';
      }
    },
    {
      id: 'action-dispatch-stage',
      name: 'Stage Dispatch Batch',
      category: 'Actions',
      icon: Truck,
      action: () => {
        window.location.href = '/dispatch?action=stage';
      }
    }
  ], []);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;
    const query = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.name.toLowerCase().includes(query) || 
      cmd.category.toLowerCase().includes(query)
    );
  }, [search, commands]);

  // Handle global shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle menu with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setSearch('');
        setSelectedIndex(0);
      }

      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Key navigation in list
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
      setIsOpen(false);
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  // Group commands by category
  const categories = ['Navigation', 'Actions'] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        ref={containerRef}
        className="w-full max-w-lg border border-border bg-card shadow-xl rounded-lg overflow-hidden flex flex-col max-h-[420px] animate-in zoom-in-95 duration-150"
      >
        {/* Search header */}
        <div className="flex items-center gap-2.5 px-3.5 border-b border-border bg-card">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search shortcuts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-0 focus:ring-0"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Command list content */}
        <ScrollArea className="flex-1 max-h-[300px]">
          {filteredCommands.length > 0 ? (
            <div className="p-2 space-y-3">
              {categories.map(category => {
                const categoryCommands = filteredCommands.filter(c => c.category === category);
                if (categoryCommands.length === 0) return null;

                return (
                  <div key={category} className="space-y-1">
                    <p className="px-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {category}
                    </p>
                    <div className="space-y-0.5">
                      {categoryCommands.map(cmd => {
                        // Find global index in the flattened filteredCommands array
                        const globalIdx = filteredCommands.findIndex(c => c.id === cmd.id);
                        const isSelected = globalIdx === selectedIndex;
                        const Icon = cmd.icon;

                        return (
                          <div
                            key={cmd.id}
                            onClick={() => {
                              cmd.action();
                              setIsOpen(false);
                            }}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors duration-100 ${
                              isSelected 
                                ? 'bg-secondary text-foreground' 
                                : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon className="h-3.5 w-3.5 shrink-0" />
                              <span className="text-xs font-medium truncate">{cmd.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 shrink-0">
                              {cmd.shortcut && (
                                <kbd className="hidden md:inline-block font-mono text-[9px] text-muted-foreground px-1 border border-border bg-muted/50 rounded">
                                  {cmd.shortcut}
                                </kbd>
                              )}
                              {isSelected && (
                                <CornerDownLeft className="h-3 w-3 text-muted-foreground opacity-60" />
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
            <div className="py-12 text-center text-xs text-muted-foreground italic">
              No matching commands found.
            </div>
          )}
        </ScrollArea>

        {/* Keyboard navigation footer */}
        <div className="flex items-center justify-between px-3.5 py-2 border-t border-border bg-muted/30 text-[10px] text-muted-foreground font-medium shrink-0">
          <div className="flex items-center gap-2.5">
            <span>↑↓ to navigate</span>
            <span>·</span>
            <span>↵ to select</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[9px] border border-border/60 bg-card rounded px-1 shadow-sm py-0.5">
            <span className="font-sans">Ctrl</span><span>+</span><span>K</span>
          </div>
        </div>
      </div>
    </div>
  );
};
