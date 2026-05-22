import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Truck, 
  Search, 
  Calendar, 
  User, 
  Link as LinkIcon, 
  Layers, 
  X, 
  Check, 
  ChevronDown, 
  PackageCheck
} from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { Skeleton } from '../ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"

interface Device {
  id: string;
  identifier: string;
  modelId: string;
  modelName: string;
  type: string;
  status: string;
  metadata?: Record<string, any>;
}

interface Relationship {
  id: string;
  primaryDeviceId: string;
  linkedDeviceId: string;
  createdAt: string;
}

interface Customer {
  id: string;
  name: string;
  type: string;
}

// Zod Schema validates customerId.
const dispatchSchema = z.object({
  customerId: z.string().uuid('Please select a valid customer')
});

type DispatchFormValues = z.infer<typeof dispatchSchema>;

export const CustomerDispatch = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Custom Filters for Dispatched List
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [linkFilter, setLinkFilter] = useState<string>('ALL');

  // Multi-select & Search Dropdown States
  const [stagedDeviceIds, setStagedDeviceIds] = useState<string[]>([]);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { handleSubmit, control, formState: { errors }, reset } = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: {
      customerId: ''
    }
  });

  // Handle clicking away to close search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const devRes = await fetch('http://localhost:3002/api/devices');
      const devData = await devRes.json();
      setDevices(devData);

      const custRes = await fetch('http://localhost:3002/api/customers');
      const custData = await custRes.json();
      setCustomers(custData);

      const relRes = await fetch('http://localhost:3002/api/device-links');
      const relData = await relRes.json();
      setRelationships(relData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const onAddToQueue = (deviceId: string) => {
    if (!stagedDeviceIds.includes(deviceId)) {
      setStagedDeviceIds(prev => [...prev, deviceId]);
    }
    setDropdownSearch('');
  };

  const onRemoveFromQueue = (deviceId: string) => {
    setStagedDeviceIds(prev => prev.filter(id => id !== deviceId));
  };

  const onClearQueue = () => {
    setStagedDeviceIds([]);
  };

  const onSubmit = async (values: DispatchFormValues) => {
    if (stagedDeviceIds.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const dispatchTime = new Date().toISOString();
      const customer = customers.find(c => c.id === values.customerId);

      // Dispatch all staged devices in parallel
      await Promise.all(stagedDeviceIds.map(async (id) => {
        const selectedDevice = devices.find(d => d.id === id);
        if (!selectedDevice) return;

        const updatedMetadata = {
          ...(selectedDevice.metadata || {}),
          customerName: customer?.name || 'Unknown',
          dispatchedAt: dispatchTime
        };

        return fetch(`http://localhost:3002/api/devices/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: selectedDevice.identifier,
            modelId: selectedDevice.modelId,
            status: 'DISPATCHED',
            customerId: values.customerId,
            metadata: updatedMetadata
          })
        });
      }));

      setDispatchSuccess(true);
      setStagedDeviceIds([]);
      reset();
      setTimeout(() => setDispatchSuccess(false), 3000);
      fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoDispatch = async (deviceId: string) => {
    if (!confirm('Are you sure you want to return this device (and any linked components) to stock?')) return;
    try {
      const selectedDevice = devices.find(d => d.id === deviceId);
      if (!selectedDevice) return;

      const cleanMetadata = { ...(selectedDevice.metadata || {}) };
      delete cleanMetadata.customerName;
      delete cleanMetadata.dispatchedAt;

      const res = await fetch(`http://localhost:3002/api/devices/${deviceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: selectedDevice.identifier,
          modelId: selectedDevice.modelId,
          status: 'IN_STOCK',
          customerId: null,
          metadata: cleanMetadata
        })
      });

      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter in-stock devices for search dropdown list
  const availableDevices = devices.filter(d => d.status === 'IN_STOCK');
  const filteredAvailable = availableDevices.filter(d => 
    d.identifier.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
    d.modelName.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
    d.type.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  // Group filtered devices by asset type
  const groupedAvailable = filteredAvailable.reduce((acc, dev) => {
    if (!acc[dev.type]) acc[dev.type] = [];
    acc[dev.type].push(dev);
    return acc;
  }, {} as Record<string, Device[]>);

  // Get details for all staged devices
  const stagedDevices = stagedDeviceIds
    .map(id => devices.find(d => d.id === id))
    .filter(Boolean) as Device[];

  // Calculate nested/cascade counts for staged queue
  const stagedChildren = stagedDevices.flatMap(parent => 
    relationships
      .filter(r => r.primaryDeviceId === parent.id)
      .map(r => devices.find(d => d.id === r.linkedDeviceId))
      .filter(Boolean) as Device[]
  );

  const totalStagedCount = stagedDevices.length + stagedChildren.length;

  // Filter dispatched devices for list
  const dispatchedDevices = devices.filter(d => {
    const matchesStatus = d.status === 'DISPATCHED';
    if (!matchesStatus) return false;

    const matchesSearch = 
      d.identifier.toLowerCase().includes(search.toLowerCase()) ||
      (d.metadata?.customerName || '').toLowerCase().includes(search.toLowerCase()) ||
      d.modelName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (typeFilter !== 'ALL' && d.type !== typeFilter) return false;

    const isLinkedPrimary = relationships.some(r => r.primaryDeviceId === d.id);
    const isLinkedChild = relationships.some(r => r.linkedDeviceId === d.id);
    const isLinked = isLinkedPrimary || isLinkedChild;

    if (linkFilter === 'LINKED' && !isLinked) return false;
    if (linkFilter === 'STANDALONE' && isLinked) return false;

    return true;
  });

  // Reset pagination on search or filters
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, linkFilter, devices.length]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDispatched = dispatchedDevices.slice(startIndex, endIndex);
  const totalPages = Math.ceil(dispatchedDevices.length / pageSize);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Customer Dispatch</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Search, select, and stage multiple hardware units to dispatch them to client fleets as a single batch log.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Panel: Staged Multi-dispatch Form */}
          <div className="border border-border p-5 rounded-lg bg-card space-y-4 md:col-span-1 h-fit">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Assign New Dispatch</h3>
            </div>
            
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {dispatchSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs p-2.5 rounded font-medium">
                    Batch units dispatched successfully to fleet!
                  </div>
                )}

                {/* 1. Custom Search Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Search & Select Device</label>
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(prev => !prev)}
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring text-left text-muted-foreground"
                  >
                    <span>Add units to staging...</span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-11 left-0 z-50 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-50 slide-in-from-top-1">
                      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          placeholder="Type ISN or model name..."
                          value={dropdownSearch}
                          onChange={(e) => setDropdownSearch(e.target.value)}
                          className="flex h-7 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground border-0 focus:ring-0 p-0"
                          autoFocus
                        />
                      </div>
                      
                      <div className="max-h-60 overflow-y-auto p-1 space-y-1">
                        {Object.keys(groupedAvailable).length > 0 ? (
                          Object.entries(groupedAvailable).map(([type, list]) => (
                            <div key={type}>
                              <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-wider bg-muted/40 rounded-sm">
                                {type}
                              </div>
                              {list.map(d => {
                                const isStaged = stagedDeviceIds.includes(d.id);
                                return (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => {
                                      if (isStaged) {
                                        onRemoveFromQueue(d.id);
                                      } else {
                                        onAddToQueue(d.id);
                                      }
                                    }}
                                    className="w-full flex items-center justify-between text-left text-xs px-2.5 py-1.5 rounded-sm hover:bg-accent transition-colors font-medium"
                                  >
                                    <div className="truncate pr-2">
                                      <span className="font-mono text-foreground font-semibold">{d.identifier}</span>
                                      <span className="text-muted-foreground text-[10px] ml-1.5">({d.modelName})</span>
                                    </div>
                                    {isStaged && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-4 text-xs text-muted-foreground">
                            No matching stock units found
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Staging Queue Staged Area (Cue list) */}
                <div className="space-y-2 border border-border p-3.5 rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-zinc-500" /> 
                      Staging Queue ({stagedDeviceIds.length})
                    </span>
                    {stagedDeviceIds.length > 0 && (
                      <button 
                        type="button" 
                        onClick={onClearQueue}
                        className="text-[10px] text-destructive hover:underline font-semibold"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {stagedDevices.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground leading-normal">
                      No hardware units staged yet.<br />Use the search selector above.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {stagedDevices.map(d => {
                        const childLinks = relationships
                          .filter(r => r.primaryDeviceId === d.id)
                          .map(r => devices.find(dev => dev.id === r.linkedDeviceId))
                          .filter(Boolean) as Device[];

                        const parentRel = relationships.find(r => r.linkedDeviceId === d.id);
                        const parentDev = parentRel ? devices.find(dev => dev.id === parentRel.primaryDeviceId) : null;

                        return (
                          <div key={d.id} className="text-xs border border-border/80 bg-card rounded-md p-2.5 space-y-1.5 shadow-sm relative pr-8">
                            <button
                              type="button"
                              onClick={() => onRemoveFromQueue(d.id)}
                              className="absolute top-2 right-2 text-zinc-400 hover:text-foreground hover:bg-muted p-0.5 rounded transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <div className="font-semibold text-foreground truncate">{d.identifier}</div>
                            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{d.type} — {d.modelName}</div>
                            
                            {childLinks.length > 0 && (
                              <div className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/5 p-1.5 rounded border border-amber-500/10 space-y-0.5 mt-1">
                                <span className="font-bold uppercase tracking-wider text-[8px] block">Includes Linked Cascade:</span>
                                {childLinks.map(c => (
                                  <div key={c.id} className="font-mono">• {c.identifier} ({c.type})</div>
                                ))}
                              </div>
                            )}

                            {parentDev && (
                              <div className="text-[9px] text-blue-600 dark:text-blue-400 bg-blue-500/5 p-1.5 rounded border border-blue-500/10 space-y-0.5 mt-1">
                                <span className="font-bold uppercase tracking-wider text-[8px] block">Component Linkage:</span>
                                <div className="font-mono">Tied to Tracker: {parentDev.identifier}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Summary Cue Badge */}
                  {stagedDeviceIds.length > 0 && (
                    <div className="bg-primary/5 text-primary text-[11px] p-2.5 rounded-md border border-primary/10 font-medium flex items-center gap-1.5">
                      <PackageCheck className="h-4 w-4 text-primary shrink-0" />
                      <span>
                        Total items to dispatch: <strong>{totalStagedCount}</strong> ({stagedDeviceIds.length} select + {stagedChildren.length} cascade)
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. Customer Info & Confirm Dispatch */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Customer / Fleet</label>
                    <Controller
                      control={control}
                      name="customerId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a customer..." />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.customerId && (
                      <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.customerId.message}</p>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={stagedDeviceIds.length === 0 || isSubmitting}
                    className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSubmitting ? 'Processing Dispatch...' : `Confirm Dispatch Batch (${stagedDeviceIds.length})`}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Panel: Dispatched Registry Table */}
          <div className="md:col-span-2 space-y-4">
            {/* High-density controls & filter options */}
            <div className="flex flex-col gap-2.5 border border-border p-3 rounded-lg bg-card">
              <div className="flex items-center gap-2 px-2 border-b border-border/50 pb-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input 
                  placeholder="Search serial, client fleet, model..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex h-8 w-full bg-transparent px-1 text-sm focus-visible:outline-none placeholder:text-muted-foreground border-0"
                />
              </div>

              <div className="flex items-center gap-4 text-xs px-2 pt-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Type:</span>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-7 border-none shadow-none bg-transparent font-semibold p-0 focus:ring-0">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="TRACKER">Trackers</SelectItem>
                      <SelectItem value="SIM">SIM Cards</SelectItem>
                      <SelectItem value="PERIPHERAL">Peripherals</SelectItem>
                      <SelectItem value="DASH_CAM">Dash Cams</SelectItem>
                      <SelectItem value="SD_CARD">SD Cards</SelectItem>
                      <SelectItem value="PANIC_BUTTON">Panic Buttons</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-medium">Topology:</span>
                  <Select value={linkFilter} onValueChange={setLinkFilter}>
                    <SelectTrigger className="h-7 border-none shadow-none bg-transparent font-semibold p-0 focus:ring-0">
                      <SelectValue placeholder="All Topologies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Topologies</SelectItem>
                      <SelectItem value="LINKED">Linked Clusters Only</SelectItem>
                      <SelectItem value="STANDALONE">Standalone Units Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="border border-border rounded-lg bg-card overflow-visible">
              <div className="w-full overflow-visible">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">Serial (ISN) & Links</th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">Template / Type</th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">Customer / Fleet</th>
                      <th className="h-10 px-4 text-left font-medium text-muted-foreground">Dispatched Date</th>
                      <th className="h-10 px-4 text-right font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <tr key={index} className="animate-pulse">
                          <td className="p-4 align-middle"><Skeleton className="h-4 w-32" /></td>
                          <td className="p-4 align-middle"><Skeleton className="h-4 w-24" /></td>
                          <td className="p-4 align-middle"><Skeleton className="h-4 w-28" /></td>
                          <td className="p-4 align-middle"><Skeleton className="h-4 w-20" /></td>
                          <td className="p-4 align-middle text-right"><Skeleton className="h-4 w-4 ml-auto" /></td>
                        </tr>
                      ))
                    ) : paginatedDispatched.length > 0 ? (
                      paginatedDispatched.map((device) => {
                        const childUnits = relationships
                          .filter(r => r.primaryDeviceId === device.id)
                          .map(r => devices.find(d => d.id === r.linkedDeviceId))
                          .filter(Boolean) as Device[];

                        const parentRel = relationships.find(r => r.linkedDeviceId === device.id);
                        const parentDevice = parentRel ? devices.find(d => d.id === parentRel.primaryDeviceId) : null;

                        return (
                          <tr key={device.id} className="transition-colors hover:bg-muted/50 align-top">
                            <td className="p-4 align-middle">
                              <div className="font-medium tracking-mono text-foreground">{device.identifier}</div>
                              
                              {childUnits.length > 0 && (
                                <div className="text-[10px] text-muted-foreground mt-2 border-l-2 border-primary/20 pl-2 space-y-1">
                                  <div className="font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[8px] flex items-center gap-1">
                                    <Layers className="h-3 w-3 text-primary/60" />
                                    <span>Linked Components Dispatched:</span>
                                  </div>
                                  {childUnits.map(unit => (
                                    <div key={unit.id} className="flex items-center gap-1.5">
                                      <span className="w-1 h-1 rounded-full bg-primary" />
                                      <span className="font-mono text-foreground">{unit.identifier}</span>
                                      <span className="text-[9px] text-muted-foreground">({unit.type} — {unit.modelName})</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {parentDevice && (
                                <div className="text-[10px] text-muted-foreground mt-1.5 border-l-2 border-blue-500/20 pl-2">
                                  <div className="font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-[8px] flex items-center gap-1">
                                    <LinkIcon className="h-3 w-3 text-blue-500/60" />
                                    <span>Part of tracker cluster:</span>
                                  </div>
                                  <div className="font-mono text-foreground flex items-center gap-1 mt-0.5">
                                    <span>{parentDevice.identifier}</span>
                                    <span className="text-[9px] text-muted-foreground">({parentDevice.modelName})</span>
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="p-4 align-middle">
                              <div className="font-medium text-foreground">{device.modelName}</div>
                              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 font-semibold">{device.type}</div>
                            </td>
                            <td className="p-4 align-middle font-semibold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span>{device.metadata?.customerName || 'Unknown Fleet'}</span>
                              </div>
                            </td>
                            <td className="p-4 align-middle text-muted-foreground text-xs">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3 w-3" />
                                <span>
                                  {device.metadata?.dispatchedAt 
                                    ? new Date(device.metadata.dispatchedAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                            </td>
                            <td className="p-4 align-middle text-right">
                              <button
                                type="button"
                                onClick={() => handleUndoDispatch(device.id)}
                                className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors border border-border bg-background shadow-sm hover:bg-destructive/10 hover:text-destructive h-8 px-2.5 cursor-pointer"
                                title="Return to stock (will return linked components too)"
                              >
                                Return Stock
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-sm text-muted-foreground">
                          No dispatched units matching filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {dispatchedDevices.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
                  <div className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-foreground">{Math.min(endIndex, dispatchedDevices.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{dispatchedDevices.length}</span> units
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors border border-border bg-background shadow-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none h-8 px-3"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      if (
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        Math.abs(pageNum - currentPage) <= 1
                      ) {
                        return (
                          <button
                            key={pageNum}
                            type="button"
                            onClick={() => setCurrentPage(pageNum)}
                            className={`inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors h-8 w-8 ${
                              currentPage === pageNum
                                ? 'bg-primary text-primary-foreground shadow'
                                : 'border border-border bg-background hover:bg-accent'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      if (pageNum === 2 || pageNum === totalPages - 1) {
                        return <span key={pageNum} className="text-muted-foreground px-1 text-xs">...</span>;
                      }
                      return null;
                    }).filter((el, idx, arr) => {
                      if (el?.type === 'span' && arr[idx - 1]?.type === 'span') return false;
                      return true;
                    })}

                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="inline-flex items-center justify-center rounded-md text-xs font-semibold transition-colors border border-border bg-background shadow-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none h-8 px-3"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
