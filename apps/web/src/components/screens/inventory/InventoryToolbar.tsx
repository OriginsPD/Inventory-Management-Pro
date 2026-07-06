import React, { useRef, useState, useEffect } from 'react';
import { Input } from '@ims_pro/ui/components/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ims_pro/ui/components/select';
import { Checkbox } from '@ims_pro/ui/components/checkbox';
import { DeviceModel } from '../../../lib/types/domain';

interface InventoryToolbarProps {
  search: string;
  setSearch: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  modelFilter: string;
  setModelFilter: (val: string) => void;
  models: DeviceModel[];
  visibleColumns: Record<string, boolean>;
  setVisibleColumns: (cols: any) => void;
}

export const InventoryToolbar: React.FC<InventoryToolbarProps> = ({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  modelFilter,
  setModelFilter,
  models,
  visibleColumns,
  setVisibleColumns,
}) => {
  const [isColumnsDropdownOpen, setIsColumnsDropdownOpen] = useState(false);
  const columnsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(event.target as Node)) {
        setIsColumnsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 surface-card rounded-xl">
      <div className="flex items-center gap-2 flex-1 max-w-sm">
        <Input 
          placeholder="Filter devices..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="text-sm h-9 bg-primary/5 border border-border text-foreground placeholder:text-muted-foreground/30 focus-visible:ring-primary/20"
        />
      </div>
      
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Select 
          value={statusFilter || "all"}
          onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[140px] text-xs h-9 bg-primary/5 border border-border rounded-lg text-foreground focus:ring-primary/20">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="IN_STOCK">IN STOCK</SelectItem>
            <SelectItem value="DISPATCHED">DISPATCHED</SelectItem>
            <SelectItem value="TESTING">TESTING</SelectItem>
            <SelectItem value="DAMAGED">DAMAGED</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={modelFilter || "all"}
          onValueChange={(val) => setModelFilter(val === "all" ? "" : val)}
        >
          <SelectTrigger className="w-[160px] text-xs h-9 bg-primary/5 border border-border rounded-lg text-foreground focus:ring-primary/20">
            <SelectValue placeholder="All Models" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            {models.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative" ref={columnsDropdownRef}>
          <button
            type="button"
            onClick={() => setIsColumnsDropdownOpen(!isColumnsDropdownOpen)}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-border bg-primary/5 hover:bg-primary/15 text-foreground h-9 px-3 gap-1.5 cursor-pointer"
          >
            Columns <span className="material-symbols-outlined text-sm">filter_list</span>
          </button>
          {isColumnsDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-primary/15 bg-card/95 backdrop-blur-2xl p-2 text-foreground shadow-xl z-40 space-y-1 font-sans">
              <div className="text-[10px] font-bold text-primary px-2 py-1 uppercase tracking-wider">Toggle Columns</div>
              {Object.entries(visibleColumns).map(([colKey, isVisible]) => {
                const label = colKey === 'identifier' ? 'Identifier' :
                              colKey === 'type' ? 'Type' :
                              colKey === 'modelName' ? 'Model Template' :
                              colKey === 'status' ? 'Status' :
                              colKey === 'metadata' ? 'Device Attributes' :
                              colKey === 'linked' ? 'Polymorphic Components' :
                              'Actions';
                return (
                  <label key={colKey} className="flex items-center gap-2 px-2 py-1.5 hover:bg-primary/5 rounded-lg cursor-pointer text-xs">
                    <Checkbox
                      checked={isVisible}
                      onCheckedChange={() => setVisibleColumns({
                        ...visibleColumns,
                        [colKey]: !isVisible
                      })}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

