import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from "@/lib/hooks/useSearchParams";
import { apiClient } from '@/lib/api-client';
import { useFeedback } from '@/components/ui/feedback-provider';
import { useAuth } from '@/components/ui/auth-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Skeleton } from '@ims_pro/ui/components/skeleton';
import { Checkbox } from '@ims_pro/ui/components/checkbox';
import { ScrollArea } from '@ims_pro/ui/components/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@ims_pro/ui/components/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ims_pro/ui/components/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ims_pro/ui/components/table"
import { useDevices, useCustomers, useRelationships } from '@/lib/hooks/useDomain';
import { Device } from '@/lib/types/domain';

interface DeviceNode {
  device: Device;
  children: DeviceNode[];
}

const dispatchSchema = z.object({
  customerId: z.string().uuid('Please select a valid customer')
});

type DispatchFormValues = z.infer<typeof dispatchSchema>;

export const CustomerDispatch = () => {
  const { toast, confirm } = useFeedback();
  const { user } = useAuth();
  
  const { data: devices = [], isLoading: isLoadingDevices, refetch: refetchDevices } = useDevices();
  const { data: customers = [], isLoading: isLoadingCustomers } = useCustomers();
  const { data: relationships = [], isLoading: isLoadingRels } = useRelationships();
  
  const isLoading = isLoadingDevices || isLoadingCustomers || isLoadingRels;
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tabs State
  const [activeTab, setActiveTab] = useState<'console' | 'registry'>('console');

  // Search & Filters for Dispatched Registry Batches
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [linkFilter, setLinkFilter] = useState<string>('ALL');

  // Staging Selector Modal States
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const [modalTypeFilter, setModalTypeFilter] = useState('ALL');
  const [modalSelectedIds, setModalSelectedIds] = useState<Set<string>>(new Set());

  // Staged Queue State
  const [stagedDeviceIds, setStagedDeviceIds] = useState<string[]>([]);

  // Detailed Batch Modal State
  const [viewBatch, setViewBatch] = useState<{
    customerId: string;
    customerName: string;
    dispatchedAt: string;
    devices: Device[];
  } | null>(null);


  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State for batches
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { handleSubmit, control, formState: { errors }, reset } = useForm<DispatchFormValues>({
    resolver: zodResolver(dispatchSchema),
    defaultValues: {
      customerId: ''
    }
  });

  useEffect(() => {
    const customerId = searchParams.get('customer');
    if (customerId && customers.length > 0) {
      const match = customers.find(c => c.id === customerId);
      if (match) {
        reset({ customerId: match.id || '' });
        // Clear query parameters
        searchParams.delete('customer');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, customers]);

  const handleOpenSelectModal = () => {
    setModalSelectedIds(new Set(stagedDeviceIds));
    setModalSearch('');
    setModalTypeFilter('ALL');
    setIsSelectModalOpen(true);
  };

  const handleCommitStaging = () => {
    setStagedDeviceIds(Array.from(modalSelectedIds));
    setIsSelectModalOpen(false);
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

      const results = await Promise.all(stagedDeviceIds.map(async (id) => {
        const selectedDevice = devices.find(d => d.id === id);
        if (!selectedDevice) return false;

        const updatedMetadata = {
          ...(selectedDevice.metadata || {}),
          customerName: customer?.name || 'Unknown',
          dispatchedAt: dispatchTime
        };

        await apiClient.put(`/api/devices/${id}`, {
          identifier: selectedDevice.identifier,
          modelId: selectedDevice.modelId,
          status: 'DISPATCHED',
          customerId: values.customerId,
          metadata: updatedMetadata
        });
        return true;
      }));

      const anyFailed = results.some(res => res === false);
      if (anyFailed) {
        toast.error('Failed to dispatch some devices in the batch.');
      } else {
        toast.success(`Successfully dispatched ${stagedDeviceIds.length} units to ${customer?.name || 'fleet'}`);
        setStagedDeviceIds([]);
        reset();
        await refetchDevices();
      }
    } catch (e) {
      console.error(e);
      toast.error('Internal server error occurred while dispatching devices.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnBatch = async (batch: { customerId: string; customerName: string; dispatchedAt: string; devices: Device[] }) => {
    const roots = buildHierarchy(batch.devices);
    const isConfirmed = await confirm({
      title: 'Return Dispatch Batch?',
      message: `Are you sure you want to return this entire dispatch batch of ${batch.devices.length} devices to warehouse stock? This operation recursively resets child components.`
    });
    if (!isConfirmed) return;
    
    setIsSubmitting(true);
    try {
      const results = await Promise.all(roots.map(async (node) => {
        const dev = node.device;
        const cleanMetadata = { ...(dev.metadata || {}) };
        delete cleanMetadata.customerName;
        delete cleanMetadata.dispatchedAt;

        await apiClient.put(`/api/devices/${dev.id}`, {
          identifier: dev.identifier,
          modelId: dev.modelId,
          status: 'IN_STOCK',
          customerId: null,
          metadata: cleanMetadata
        });
        return true;
      }));

      const anyFailed = results.some(res => res === false);
      if (anyFailed) {
        toast.error('Failed to return some devices in the batch.');
      } else {
        toast.success(`Successfully returned dispatch batch of ${batch.devices.length} units to stock`);
        if (viewBatch && viewBatch.dispatchedAt === batch.dispatchedAt && viewBatch.customerId === batch.customerId) {
          setViewBatch(null);
        }
        await refetchDevices();
      }
    } catch (e) {
      console.error(e);
      toast.error('Internal server error occurred while returning dispatch batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const dispatchBatches = useMemo(() => {
    const batchesMap = new Map<string, {
      customerId: string;
      customerName: string;
      dispatchedAt: string;
      devices: Device[];
    }>();

    devices.forEach(d => {
      if (d.status === 'DISPATCHED' && d.metadata?.dispatchedAt && d.customerId) {
        const key = `${d.customerId}_${d.metadata.dispatchedAt}`;
        if (!batchesMap.has(key)) {
          batchesMap.set(key, {
            customerId: d.customerId,
            customerName: d.metadata.customerName || 'Unknown Fleet',
            dispatchedAt: d.metadata.dispatchedAt,
            devices: []
          });
        }
        batchesMap.get(key)!.devices.push(d);
      }
    });

    return Array.from(batchesMap.values()).sort((a, b) => 
      new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime()
    );
  }, [devices]);

  const filteredBatches = useMemo(() => {
    return dispatchBatches.filter(batch => {
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchesCustomer = batch.customerName.toLowerCase().includes(s);
        const matchesDevice = batch.devices.some(d => 
          d.identifier.toLowerCase().includes(s) ||
          d.modelName.toLowerCase().includes(s)
        );
        if (!matchesCustomer && !matchesDevice) return false;
      }

      if (typeFilter !== 'ALL') {
        const hasType = batch.devices.some(d => d.type === typeFilter);
        if (!hasType) return false;
      }

      if (linkFilter !== 'ALL') {
        const hasTopology = batch.devices.some(d => {
          const isLinkedPrimary = relationships.some(r => r.primaryDeviceId === d.id);
          const isLinkedChild = relationships.some(r => r.linkedDeviceId === d.id);
          const isLinked = isLinkedPrimary || isLinkedChild;
          return (linkFilter === 'LINKED' && isLinked) || (linkFilter === 'STANDALONE' && !isLinked);
        });
        if (!hasTopology) return false;
      }

      return true;
    });
  }, [dispatchBatches, search, typeFilter, linkFilter, relationships]);

  const [lastFilterHash, setLastFilterHash] = useState('');
  const currentFilterHash = `${search}-${typeFilter}-${linkFilter}-${devices.length}`;
  
  if (currentFilterHash !== lastFilterHash) {
    setLastFilterHash(currentFilterHash);
    setCurrentPage(1);
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredBatches.length / pageSize);

  const availableDevices = devices.filter(d => d.status === 'IN_STOCK');
  const filteredAvailable = availableDevices.filter(d => {
    if (modalSearch.trim()) {
      const s = modalSearch.toLowerCase();
      const matches = d.identifier.toLowerCase().includes(s) || d.modelName.toLowerCase().includes(s);
      if (!matches) return false;
    }
    if (modalTypeFilter !== 'ALL' && d.type !== modalTypeFilter) return false;
    return true;
  });

  const stagedDevices = stagedDeviceIds
    .map(id => devices.find(d => d.id === id))
    .filter(Boolean) as Device[];

  const stagedChildren = stagedDevices.flatMap(parent => 
    relationships
      .filter(r => r.primaryDeviceId === parent.id)
      .map(r => devices.find(d => d.id === r.linkedDeviceId))
      .filter(Boolean) as Device[]
  );

  const totalStagedCount = stagedDevices.length + stagedChildren.length;

  const buildHierarchy = (batchDevices: Device[]): DeviceNode[] => {
    const deviceMap = new Map<string, DeviceNode>();
    const childIds = new Set<string>();

    batchDevices.forEach(d => {
      deviceMap.set(d.id || '', { device: d, children: [] });
    });

    relationships.forEach(r => {
      const parentNode = deviceMap.get(r.primaryDeviceId);
      const childNode = deviceMap.get(r.linkedDeviceId);
      if (parentNode && childNode) {
        parentNode.children.push(childNode);
        childIds.add(r.linkedDeviceId);
      }
    });

    const roots: DeviceNode[] = [];
    batchDevices.forEach(d => {
      if (!childIds.has(d.id || '')) {
        const node = deviceMap.get(d.id || '');
        if (node) roots.push(node);
      }
    });

    return roots;
  };

  const getBatchCounts = (batchDevices: Device[]) => {
    const roots = buildHierarchy(batchDevices);
    const primaryCount = roots.length;
    const cascadeCount = batchDevices.length - primaryCount;
    return { primaryCount, cascadeCount };
  };

  const renderDeviceNode = (node: DeviceNode, depth: number = 0) => {
    return (
      <div key={node.device.id} className="space-y-1">
        <div 
          className="flex items-center justify-between p-2.5 rounded-xl border border-primary/10 bg-background/50 shadow-sm text-xs transition-all hover:bg-primary/5"
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-2 truncate">
            {depth > 0 && <span className="text-primary/30 font-mono select-none">└─</span>}
            <div className="truncate">
              <div className="font-bold text-foreground font-mono tracking-wider truncate">{node.device.identifier}</div>
              <div className="text-[10px] text-primary uppercase font-extrabold tracking-wider">{node.device.type} — {node.device.modelName}</div>
            </div>
          </div>
          <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary shrink-0 font-mono uppercase tracking-wider">
            {node.device.status}
          </span>
        </div>
        {node.children.map(child => renderDeviceNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full px-1 md:px-2">
        <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-start border-b border-primary/10 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Customer Dispatch</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select, stage, and dispatch hardware batches to client fleets, and trace registry distribution history.
            </p>
          </div>
          
          {/* Tab Navigation Menu Bar */}
          <div className="flex bg-card/60 p-1 rounded-lg border border-primary/10 shrink-0 h-fit mt-2 md:mt-0">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                activeTab === 'console'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dispatch Console
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                activeTab === 'registry'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dispatch Registry
            </button>
          </div>
        </div>

        {/* Tab 1: Dispatch Console */}
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Console Left Panel: Dispatch Configuration */}
            <div className="glass-panel p-5 rounded-2xl space-y-4 xl:col-span-4">
              <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
                <span className="material-symbols-outlined text-[18px] text-primary">local_shipping</span>
                <h3 className="font-extrabold text-sm text-foreground">Assign New Dispatch</h3>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : (
                <div className="space-y-4">


                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Target Customer / Fleet</label>
                      <Controller
                        control={control}
                        name="customerId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="w-full text-xs h-9 bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20">
                              <SelectValue placeholder="Select customer..." />
                            </SelectTrigger>
                            <SelectContent>
                              {customers.map(c => (
                                <SelectItem key={c.id} value={c.id || ''}>{c.name} ({c.type})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.customerId && (
                        <p className="text-[10px] text-red-400 mt-1.5 font-semibold">{errors.customerId.message}</p>
                      )}
                    </div>

                    {user?.role !== 'REVIEWER' ? (
                      <button 
                        type="submit" 
                        disabled={stagedDeviceIds.length === 0 || isSubmitting}
                        className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 active:scale-95 h-9 px-4 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                      >
                        {isSubmitting ? 'Processing Dispatch...' : `Confirm Dispatch Batch (${stagedDeviceIds.length})`}
                      </button>
                    ) : (
                      <div className="text-center text-xs text-muted-foreground p-3 border border-primary/10 rounded-xl bg-primary/5">
                        Read-only access. Dispatching is disabled.
                      </div>
                    )}
                  </form>
                </div>
              )}
            </div>

            {/* Console Right Panel: Staging Queue */}
            <div className="glass-panel p-5 rounded-2xl space-y-4 xl:col-span-8 h-[560px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between border-b border-primary/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">layers</span>
                  <h3 className="font-extrabold text-sm text-foreground">Staging Queue ({stagedDeviceIds.length})</h3>
                </div>

                <div className="flex items-center gap-2">
                  {stagedDeviceIds.length > 0 && user?.role !== 'REVIEWER' && (
                    <button 
                      type="button" 
                      onClick={onClearQueue}
                      className="text-xs text-red-400 hover:underline font-semibold cursor-pointer"
                    >
                      Clear Queue
                    </button>
                  )}
                  {user?.role !== 'REVIEWER' && (
                    <button
                      type="button"
                      onClick={handleOpenSelectModal}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-7 px-3 gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">add</span> Stage Devices
                    </button>
                  )}
                </div>
              </div>

              {stagedDevices.length === 0 ? (
                <div className="flex flex-1 min-h-0 items-center justify-center">
                <EmptyState
                  icon="local_shipping"
                  title="No Devices Staged"
                  description="There are currently no hardware tracking units staged for dispatch."
                  className="py-12 bg-transparent border-dashed border-primary/10"
                />
                </div>
              ) : (
                <ScrollArea className="flex-1 min-h-0 pr-1">
                  <div className="space-y-2 w-full">
                    {stagedDevices.map(d => {
                      const childLinks = relationships
                        .filter(r => r.primaryDeviceId === d.id)
                        .map(r => devices.find(dev => dev.id === r.linkedDeviceId))
                        .filter(Boolean) as Device[];

                      const parentRel = relationships.find(r => r.linkedDeviceId === d.id);
                      const parentDev = parentRel ? devices.find(dev => dev.id === parentRel.primaryDeviceId) : null;

                      return (
                        <div key={d.id} className="w-full text-xs border border-primary/10 bg-background/50 rounded-xl p-3 space-y-1.5 shadow-sm relative pr-10">
                          <button
                            type="button"
                            onClick={() => onRemoveFromQueue(d.id || '')}
                            className="absolute top-3 right-3 text-muted-foreground hover:text-red-400 hover:bg-primary/5 p-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                          
                          <div className="font-bold text-foreground font-mono text-sm tracking-wider">{d.identifier}</div>
                          <div className="text-[10px] text-primary uppercase font-extrabold tracking-wider">{d.type} — {d.modelName}</div>
                          
                          {childLinks.length > 0 && (
                            <div className="text-[10px] text-amber-400 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10 space-y-1 mt-1.5">
                              <span className="font-extrabold uppercase tracking-wider text-[8px] block">Includes Linked Cascade:</span>
                              {childLinks.map(c => (
                                <div key={c.id} className="font-mono">• {c.identifier} ({c.type})</div>
                              ))}
                            </div>
                          )}

                          {parentDev && (
                            <div className="text-[10px] text-primary bg-primary/5 p-2 rounded-lg border border-primary/10 space-y-1 mt-1.5">
                              <span className="font-extrabold uppercase tracking-wider text-[8px] block">Tied Component Linkage:</span>
                              <div className="font-mono">Tied to Parent: {parentDev.identifier} ({parentDev.modelName})</div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              {/* Summary cue badge */}
              {stagedDeviceIds.length > 0 && (
                <div className="bg-primary/10 text-foreground text-xs p-3 rounded-xl border border-primary/10 font-bold flex items-center gap-1.5 animate-in fade-in duration-200">
                  <span className="material-symbols-outlined text-[18px] text-primary shrink-0">inventory_2</span>
                  <span>
                    Staging Summary: <strong>{totalStagedCount}</strong> units total ({stagedDeviceIds.length} direct, {stagedChildren.length} cascading components).
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Dispatch Registry (Batches view) */}
        {activeTab === 'registry' && (
          <div className="space-y-4">
            {/* Registry Toolbar filters */}
            <div className="flex flex-col md:flex-row gap-3 border border-primary/10 p-3.5 rounded-xl bg-card/60 justify-between items-center">
              <div className="relative w-full md:flex-1">
                <span className="material-symbols-outlined text-[18px] text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
                <input 
                  placeholder="Search serial, client fleet, model name..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex h-9 w-full rounded-lg border border-primary/10 bg-primary/5 pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground"
                />
              </div>

              <div className="flex items-center gap-4 text-xs w-full md:w-auto shrink-0 justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold uppercase tracking-wider text-[10px]">Type:</span>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-8 border-primary/10 bg-background/50 text-xs w-36 text-foreground rounded-lg">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="TRACKER">Trackers</SelectItem>
                      <SelectItem value="SIM">SIM Cards</SelectItem>
                      <SelectItem value="PANIC_BUTTON">Panic Buttons</SelectItem>
                      <SelectItem value="KEYFOB">Key Fobs</SelectItem>
                      <SelectItem value="DASH_CAM">Dash Cams</SelectItem>
                      <SelectItem value="SD_CARD">SD Cards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-primary font-bold uppercase tracking-wider text-[10px]">Topology:</span>
                  <Select value={linkFilter} onValueChange={setLinkFilter}>
                    <SelectTrigger className="h-8 border-primary/10 bg-background/50 text-xs w-40 text-foreground rounded-lg">
                      <SelectValue placeholder="All Topologies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Topologies</SelectItem>
                      <SelectItem value="LINKED">Linked Clusters</SelectItem>
                      <SelectItem value="STANDALONE">Standalone Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Batches Table wrapper */}
            <div className="glass-panel rounded-xl overflow-hidden">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-10 font-bold uppercase tracking-wider text-[10px]">Dispatch Timestamp</TableHead>
                      <TableHead className="h-10 font-bold uppercase tracking-wider text-[10px]">Customer / Client Fleet</TableHead>
                      <TableHead className="h-10 font-bold uppercase tracking-wider text-[10px] text-center">Primary Units</TableHead>
                      <TableHead className="h-10 font-bold uppercase tracking-wider text-[10px] text-center">Total Components</TableHead>
                      <TableHead className="h-10 font-bold uppercase tracking-wider text-[10px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <TableRow key={index} className="animate-pulse">
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                          <TableCell className="text-center"><Skeleton className="h-4 w-10 mx-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedBatches.length > 0 ? (
                      paginatedBatches.map((batch) => {
                        const { primaryCount, cascadeCount } = getBatchCounts(batch.devices);
                        const batchKey = `${batch.customerId}_${batch.dispatchedAt}`;

                        return (
                          <TableRow key={batchKey} className="group hover:bg-primary/5 transition-colors">
                            <TableCell className="align-middle text-xs font-mono text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                                <span className="font-bold text-foreground">
                                  {new Date(batch.dispatchedAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </span>
                                <span>
                                  {new Date(batch.dispatchedAt).toLocaleTimeString(undefined, {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle font-semibold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-primary">person</span>
                                <span>{batch.customerName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle text-center font-bold text-foreground">
                              {primaryCount}
                            </TableCell>
                            <TableCell className="align-middle text-center text-muted-foreground text-xs">
                              <span className="font-bold text-foreground">{batch.devices.length}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">({cascadeCount} child components)</span>
                            </TableCell>
                            <TableCell className="align-middle text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewBatch(batch)}
                                  className="inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground h-8 px-2.5 gap-1 cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-sm">visibility</span> View Details
                                </button>
                                 {user?.role !== 'REVIEWER' && (
                                  <button
                                    type="button"
                                    onClick={() => handleReturnBatch(batch)}
                                    disabled={isSubmitting}
                                    className="inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-red-500/10 hover:text-red-400 text-foreground h-8 px-2.5 gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <span className="material-symbols-outlined text-sm">sync</span> Return Stock
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-auto p-0">
                          <EmptyState
                            icon="local_shipping"
                            title="No Batches Found"
                            description="No dispatched hardware batches match your search queries or client selection filters."
                            className="border-0 bg-transparent py-16"
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>

              {/* Pagination Controls */}
              {filteredBatches.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10 bg-transparent">
                  <div className="text-xs text-muted-foreground">
                    Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                    <span className="font-semibold text-foreground">{Math.min(endIndex, filteredBatches.length)}</span> of{' '}
                    <span className="font-semibold text-foreground">{filteredBatches.length}</span> batches
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
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
                            className={`inline-flex items-center justify-center rounded-lg text-xs font-bold h-8 w-8 transition-colors cursor-pointer ${
                              currentPage === pageNum
                                ? 'bg-primary text-primary-foreground'
                                : 'border border-primary/10 bg-primary/5 text-foreground hover:bg-primary/15'
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
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground disabled:opacity-30 disabled:pointer-events-none h-8 px-3 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL 1: Stage Devices Selection */}
        <Dialog open={isSelectModalOpen} onOpenChange={setIsSelectModalOpen}>
          <DialogContent className="glass-panel-elevated rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col border-0 p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150" showCloseButton={true}>
            <DialogHeader className="p-6 border-b border-primary/10 text-left space-y-0.5">
              <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground p-0">Stage Available Devices</DialogTitle>
            <DialogDescription className="text-xs text-muted mt-0.5">Select and queue available units from warehouse stock to prepare dispatch.</DialogDescription>
            </DialogHeader>

              {/* Filters */}
              <div className="p-4 border-b border-primary/10 bg-primary/5 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <span className="material-symbols-outlined text-sm text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">search</span>
                  <input
                    placeholder="Search serial or model name..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="flex h-9 w-full rounded-lg border border-primary/10 bg-background/50 pl-9 pr-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 text-foreground font-sans"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select value={modalTypeFilter} onValueChange={setModalTypeFilter}>
                    <SelectTrigger className="w-full text-xs h-9 bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="TRACKER">Trackers</SelectItem>
                      <SelectItem value="SIM">SIM Cards</SelectItem>
                      <SelectItem value="PANIC_BUTTON">Panic Buttons</SelectItem>
                      <SelectItem value="KEYFOB">Key Fobs</SelectItem>
                      <SelectItem value="DASH_CAM">Dash Cams</SelectItem>
                      <SelectItem value="SD_CARD">SD Cards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Table List (Scrollable) */}
              <ScrollArea className="flex-1 p-4">
                <div className="border border-primary/10 rounded-xl bg-background/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12 h-9 p-0 text-center">
                          <Checkbox 
                            checked={filteredAvailable.length > 0 && filteredAvailable.every(d => modalSelectedIds.has(d.id || ''))}
                            onCheckedChange={() => {
                              const isAllSelected = filteredAvailable.length > 0 && filteredAvailable.every(d => modalSelectedIds.has(d.id || ''));
                              setModalSelectedIds(prev => {
                                const next = new Set(prev);
                                if (isAllSelected) {
                                  filteredAvailable.forEach(d => next.delete(d.id || ''));
                                } else {
                                  filteredAvailable.forEach(d => next.add(d.id || ''));
                                }
                                return next;
                              });
                            }}
                          />
                        </TableHead>
                        <TableHead className="h-9 font-bold text-xs uppercase tracking-wider">Serial (ISN)</TableHead>
                        <TableHead className="h-9 font-bold text-xs uppercase tracking-wider">Model Template</TableHead>
                        <TableHead className="h-9 font-bold text-xs uppercase tracking-wider">Classification</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAvailable.length > 0 ? (
                        filteredAvailable.map(d => {
                          const isChecked = modalSelectedIds.has(d.id || '');
                          return (
                            <TableRow 
                              key={d.id || ''} 
                              className={`transition-colors cursor-pointer ${
                                isChecked ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-primary/5'
                              }`}
                              onClick={() => {
                                setModalSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(d.id || '')) {
                                    next.delete(d.id || '');
                                  } else {
                                    next.add(d.id || '');
                                  }
                                  return next;
                                });
                              }}
                            >
                              <TableCell className="w-12 p-0 text-center" onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={isChecked}
                                  onCheckedChange={() => {
                                    setModalSelectedIds(prev => {
                                      const next = new Set(prev);
                                      if (next.has(d.id || '')) {
                                        next.delete(d.id || '');
                                      } else {
                                        next.add(d.id || '');
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-bold font-mono text-foreground text-xs tracking-wider">{d.identifier}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{d.modelName}</TableCell>
                              <TableCell className="text-xs text-primary uppercase font-bold tracking-wider text-[10px] font-mono">{d.type}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="h-auto p-0">
                            <EmptyState
                              icon="search"
                              title="No Matching Devices"
                              description="No certified in-stock hardware templates match your current filter parameters."
                              className="border-0 bg-transparent py-10"
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="p-4 border-t border-primary/10 flex justify-between items-center bg-primary/5">
                <span className="text-xs text-muted-foreground font-semibold">
                  Selected: {modalSelectedIds.size} unit(s)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSelectModalOpen(false)}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-primary/5 h-9 px-4 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitStaging}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-4 cursor-pointer"
                  >
                    Stage Selected ({modalSelectedIds.size})
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        {/* MODAL 2: Batch Detail Hierarchy Breakdown */}
        <Dialog open={!!viewBatch} onOpenChange={(open) => { if (!open) setViewBatch(null); }}>
          {viewBatch && (
            <DialogContent className="glass-panel-elevated rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col border-0 p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-150" showCloseButton={true}>
              <DialogHeader className="p-6 border-b border-primary/10 text-left space-y-0.5">
                <DialogTitle className="text-lg font-extrabold tracking-tight text-foreground p-0">Dispatch Batch Details</DialogTitle>
            <DialogDescription className="flex items-center gap-1.5 text-xs text-muted mt-1">
                  <span className="material-symbols-outlined text-sm text-primary">person</span>
                  <span className="font-bold text-foreground">{viewBatch.customerName}</span>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <span>
                    {new Date(viewBatch.dispatchedAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </DialogDescription>
              </DialogHeader>

              {/* Scrollable Tree */}
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">layers</span>
                    Hierarchical Component Breakdown
                  </div>
                  <div className="space-y-3 bg-background/40 p-4 border border-primary/10 rounded-xl">
                    {buildHierarchy(viewBatch.devices).length > 0 ? (
                      buildHierarchy(viewBatch.devices).map(rootNode => renderDeviceNode(rootNode))
                    ) : (
                      <EmptyState
                        icon="layers"
                        title="Empty Dispatch Batch"
                        description="No hardware records or linked components are registered within this dispatch transaction."
                        className="border-0 bg-transparent py-6"
                      />
                    )}
                  </div>
                </div>
              </ScrollArea>

              {/* Footer */}
              <div className="p-4 border-t border-primary/10 flex justify-between items-center bg-primary/5">
                <span className="text-xs text-muted-foreground font-semibold">
                  Batch Total: {viewBatch.devices.length} unit(s)
                </span>
                <div className="flex gap-2">
                  {user?.role !== 'REVIEWER' && (
                    <button
                      type="button"
                      onClick={() => handleReturnBatch(viewBatch)}
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center rounded-lg text-xs font-bold transition-all border border-primary/10 bg-primary/5 hover:bg-red-500/10 hover:text-red-400 text-foreground h-9 px-4 gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">sync</span> Return Entire Batch
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewBatch(null)}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all border border-primary/10 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-primary/5 h-9 px-4 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </DialogContent>
          )}
        </Dialog>
      </div>
  );
};

