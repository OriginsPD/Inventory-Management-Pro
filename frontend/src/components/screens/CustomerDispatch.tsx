import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Truck, 
  Search, 
  Calendar, 
  User, 
  Layers, 
  X, 
  PackageCheck,
  Plus,
  Eye,
  RefreshCw
} from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { Skeleton } from '../ui/skeleton';
import { Checkbox } from '../ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table"

interface Device {
  id: string;
  identifier: string;
  modelId: string;
  modelName: string;
  type: string;
  status: string;
  customerId?: string | null;
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

interface DeviceNode {
  device: Device;
  children: DeviceNode[];
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

  const [dispatchSuccess, setDispatchSuccess] = useState(false);
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

  // Open Staging Modal and sync existing selection
  const handleOpenSelectModal = () => {
    setModalSelectedIds(new Set(stagedDeviceIds));
    setModalSearch('');
    setModalTypeFilter('ALL');
    setIsSelectModalOpen(true);
  };

  // Commit selected items from modal to staging queue
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
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Returns a batch of devices recursively back to stock
  const handleReturnBatch = async (batch: { customerId: string; customerName: string; dispatchedAt: string; devices: Device[] }) => {
    const roots = buildHierarchy(batch.devices);
    if (!confirm(`Are you sure you want to return this entire dispatch batch of ${batch.devices.length} devices to warehouse stock? This operation recursively resets child components.`)) return;
    
    setIsSubmitting(true);
    try {
      await Promise.all(roots.map(async (node) => {
        const dev = node.device;
        const cleanMetadata = { ...(dev.metadata || {}) };
        delete cleanMetadata.customerName;
        delete cleanMetadata.dispatchedAt;

        return fetch(`http://localhost:3002/api/devices/${dev.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: dev.identifier,
            modelId: dev.modelId,
            status: 'IN_STOCK',
            customerId: null,
            metadata: cleanMetadata
          })
        });
      }));

      if (viewBatch && viewBatch.dispatchedAt === batch.dispatchedAt && viewBatch.customerId === batch.customerId) {
        setViewBatch(null);
      }
      
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group dispatched devices by customerId and dispatchedAt (O(n) runtime)
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

  const dispatchBatches = Array.from(batchesMap.values()).sort((a, b) => 
    new Date(b.dispatchedAt).getTime() - new Date(a.dispatchedAt).getTime()
  );

  // Filter batches based on registry tab options (O(n) runtime)
  const filteredBatches = dispatchBatches.filter(batch => {
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

  // Pagination for Batches Registry
  useEffect(() => {
    setCurrentPage(1);
  }, [search, typeFilter, linkFilter, devices.length]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedBatches = filteredBatches.slice(startIndex, endIndex);
  const totalPages = Math.ceil(filteredBatches.length / pageSize);

  // In-stock devices available for staging
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

  // Calculate nested/cascade counts for staging queue
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

  // Build the hierarchical tree node structure in O(n) runtime
  const buildHierarchy = (batchDevices: Device[]): DeviceNode[] => {
    const deviceMap = new Map<string, DeviceNode>();
    const childIds = new Set<string>();

    // 1. Create nodes for all devices in the batch
    batchDevices.forEach(d => {
      deviceMap.set(d.id, { device: d, children: [] });
    });

    // 2. Map links within the batch
    relationships.forEach(r => {
      const parentNode = deviceMap.get(r.primaryDeviceId);
      const childNode = deviceMap.get(r.linkedDeviceId);
      if (parentNode && childNode) {
        parentNode.children.push(childNode);
        childIds.add(r.linkedDeviceId);
      }
    });

    // 3. Roots are batch devices with no parent device in this batch
    const roots: DeviceNode[] = [];
    batchDevices.forEach(d => {
      if (!childIds.has(d.id)) {
        const node = deviceMap.get(d.id);
        if (node) roots.push(node);
      }
    });

    return roots;
  };

  // Helper to count root items and cascading items in batch
  const getBatchCounts = (batchDevices: Device[]) => {
    const roots = buildHierarchy(batchDevices);
    const primaryCount = roots.length;
    const cascadeCount = batchDevices.length - primaryCount;
    return { primaryCount, cascadeCount };
  };

  // Recursive tree renderer for detailed modal
  const renderDeviceNode = (node: DeviceNode, depth: number = 0) => {
    return (
      <div key={node.device.id} className="space-y-1">
        <div 
          className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card shadow-sm text-xs transition-all hover:bg-muted/10"
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-2 truncate">
            {depth > 0 && <span className="text-muted-foreground/30 font-mono select-none">└─</span>}
            <div className="truncate">
              <div className="font-semibold text-foreground font-mono truncate">{node.device.identifier}</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{node.device.type} — {node.device.modelName}</div>
            </div>
          </div>
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            {node.device.status}
          </span>
        </div>
        {node.children.map(child => renderDeviceNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-start border-b border-border pb-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Customer Dispatch</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select, stage, and dispatch hardware batches to client fleets, and trace registry distribution history.
            </p>
          </div>
          
          {/* Tab Navigation Menu Bar */}
          <div className="flex bg-muted p-1 rounded-lg border border-border/60 shrink-0 h-fit mt-2 md:mt-0">
            <button
              onClick={() => setActiveTab('console')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                activeTab === 'console'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dispatch Console
            </button>
            <button
              onClick={() => setActiveTab('registry')}
              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-all ${
                activeTab === 'registry'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Dispatch Registry
            </button>
          </div>
        </div>

        {/* Tab 1: Dispatch Console */}
        {activeTab === 'console' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
            {/* Console Left Panel: Dispatch Configuration */}
            <div className="border border-border p-5 rounded-lg bg-card space-y-4 md:col-span-2">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Truck className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Assign New Dispatch</h3>
              </div>
              
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {dispatchSuccess && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs p-2.5 rounded font-medium">
                      Batch units dispatched successfully to fleet!
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Target Customer / Fleet</label>
                      <Controller
                        control={control}
                        name="customerId"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger className="w-full bg-card h-9">
                              <SelectValue placeholder="Select customer..." />
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
                        <p className="text-[10px] text-destructive mt-1.5 font-semibold">{errors.customerId.message}</p>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      disabled={stagedDeviceIds.length === 0 || isSubmitting}
                      className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isSubmitting ? 'Processing Dispatch...' : `Confirm Dispatch Batch (${stagedDeviceIds.length})`}
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* Console Right Panel: Staging Queue */}
            <div className="border border-border p-5 rounded-lg bg-card space-y-4 md:col-span-3">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-zinc-500" />
                  <h3 className="font-semibold text-sm">Staging Queue ({stagedDeviceIds.length})</h3>
                </div>

                <div className="flex items-center gap-2">
                  {stagedDeviceIds.length > 0 && (
                    <button 
                      type="button" 
                      onClick={onClearQueue}
                      className="text-xs text-destructive hover:underline font-semibold"
                    >
                      Clear Queue
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleOpenSelectModal}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-7 px-3 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Stage Devices
                  </button>
                </div>
              </div>

              {stagedDevices.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg text-xs text-muted-foreground leading-normal">
                  No hardware units staged for dispatch.<br />Click "Stage Devices" to select from inventory.
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-custom">
                  {stagedDevices.map(d => {
                    const childLinks = relationships
                      .filter(r => r.primaryDeviceId === d.id)
                      .map(r => devices.find(dev => dev.id === r.linkedDeviceId))
                      .filter(Boolean) as Device[];

                    const parentRel = relationships.find(r => r.linkedDeviceId === d.id);
                    const parentDev = parentRel ? devices.find(dev => dev.id === parentRel.primaryDeviceId) : null;

                    return (
                      <div key={d.id} className="text-xs border border-border bg-card rounded-md p-3 space-y-1.5 shadow-sm relative pr-10">
                        <button
                          type="button"
                          onClick={() => onRemoveFromQueue(d.id)}
                          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground hover:bg-muted p-0.5 rounded transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        
                        <div className="font-semibold text-foreground font-mono text-sm">{d.identifier}</div>
                        <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{d.type} — {d.modelName}</div>
                        
                        {childLinks.length > 0 && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/5 p-2 rounded border border-amber-500/10 space-y-1 mt-1.5">
                            <span className="font-bold uppercase tracking-wider text-[8px] block">Includes Linked Cascade:</span>
                            {childLinks.map(c => (
                              <div key={c.id} className="font-mono">• {c.identifier} ({c.type})</div>
                            ))}
                          </div>
                        )}

                        {parentDev && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-500/5 p-2 rounded border border-blue-500/10 space-y-1 mt-1.5">
                            <span className="font-bold uppercase tracking-wider text-[8px] block">Tied Component Linkage:</span>
                            <div className="font-mono">Tied to Parent: {parentDev.identifier} ({parentDev.modelName})</div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Summary cue badge */}
              {stagedDeviceIds.length > 0 && (
                <div className="bg-primary/5 text-primary text-xs p-3 rounded-lg border border-primary/10 font-semibold flex items-center gap-1.5">
                  <PackageCheck className="h-4 w-4 text-primary shrink-0" />
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
            <div className="flex flex-col md:flex-row gap-3 border border-border p-3.5 rounded-lg bg-card justify-between items-center">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input 
                  placeholder="Search serial, client fleet, model name..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-center gap-4 text-xs w-full md:w-auto shrink-0 justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Type:</span>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-8 border-border bg-card w-36">
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
                  <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Topology:</span>
                  <Select value={linkFilter} onValueChange={setLinkFilter}>
                    <SelectTrigger className="h-8 border-border bg-card w-40">
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
            <div className="border border-border rounded-lg bg-card overflow-hidden">
              <div className="scrollbar-custom overflow-x-auto w-full">
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
                          <TableRow key={batchKey} className="transition-colors hover:bg-muted/30">
                            <TableCell className="align-middle text-xs font-mono text-muted-foreground">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground/80 shrink-0" />
                                <span className="font-semibold text-foreground">
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
                            <TableCell className="align-middle font-bold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span>{batch.customerName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle text-center font-bold text-foreground">
                              {primaryCount}
                            </TableCell>
                            <TableCell className="align-middle text-center text-muted-foreground text-xs">
                              <span className="font-bold text-foreground">{batch.devices.length}</span>
                              <span className="text-[10px] text-muted-foreground/80 ml-1">({cascadeCount} child components)</span>
                            </TableCell>
                            <TableCell className="align-middle text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewBatch(batch)}
                                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold border border-border bg-background shadow-sm hover:bg-accent text-foreground h-8 px-2.5 cursor-pointer transition-all flex items-center gap-1"
                                >
                                  <Eye className="h-3.5 w-3.5" /> View Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReturnBatch(batch)}
                                  disabled={isSubmitting}
                                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold border border-border bg-background shadow-sm hover:bg-destructive/10 hover:text-destructive text-foreground h-8 px-2.5 cursor-pointer transition-all flex items-center gap-1 disabled:opacity-50"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" /> Return Stock
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center p-12 text-sm text-muted-foreground">
                          No dispatched batches found matching search criteria.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {filteredBatches.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
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
        )}

        {/* MODAL 1: Stage Devices Selection (Checkboxes, 90vh Max, scrollable) */}
        {isSelectModalOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="border border-border rounded-xl bg-card shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-6 border-b border-border flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Stage Available Devices</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Select and queue available units from warehouse stock to prepare dispatch.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSelectModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Filters */}
              <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <input
                    placeholder="Search serial or model name..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="w-full sm:w-48">
                  <Select value={modalTypeFilter} onValueChange={setModalTypeFilter}>
                    <SelectTrigger className="w-full h-9">
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
              <div className="flex-1 overflow-y-auto p-4 scrollbar-custom">
                <div className="border border-border rounded-lg bg-card">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-12 h-9 p-0 text-center">
                          <Checkbox 
                            checked={filteredAvailable.length > 0 && filteredAvailable.every(d => modalSelectedIds.has(d.id))}
                            onCheckedChange={() => {
                              const isAllSelected = filteredAvailable.length > 0 && filteredAvailable.every(d => modalSelectedIds.has(d.id));
                              setModalSelectedIds(prev => {
                                const next = new Set(prev);
                                if (isAllSelected) {
                                  filteredAvailable.forEach(d => next.delete(d.id));
                                } else {
                                  filteredAvailable.forEach(d => next.add(d.id));
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
                          const isChecked = modalSelectedIds.has(d.id);
                          return (
                            <TableRow 
                              key={d.id} 
                              className={`transition-colors cursor-pointer ${
                                isChecked ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/40'
                              }`}
                              onClick={() => {
                                setModalSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(d.id)) {
                                    next.delete(d.id);
                                  } else {
                                    next.add(d.id);
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
                                      if (next.has(d.id)) {
                                        next.delete(d.id);
                                      } else {
                                        next.add(d.id);
                                      }
                                      return next;
                                    });
                                  }}
                                />
                              </TableCell>
                              <TableCell className="font-semibold font-mono text-xs">{d.identifier}</TableCell>
                              <TableCell className="text-xs">{d.modelName}</TableCell>
                              <TableCell className="text-xs text-muted-foreground uppercase font-bold tracking-wider text-[10px]">{d.type}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center p-8 text-xs text-muted-foreground">
                            No in-stock hardware matches filters.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex justify-between items-center bg-muted/10">
                <span className="text-xs text-muted-foreground font-semibold">
                  Selected: {modalSelectedIds.size} unit(s)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSelectModalOpen(false)}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitStaging}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4"
                  >
                    Stage Selected ({modalSelectedIds.size})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Batch Detail Hierarchy Breakdown (Locked to 90vh, scrollable) */}
        {viewBatch && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="border border-border rounded-xl bg-card shadow-lg max-w-xl w-full max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="p-6 border-b border-border flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">Dispatch Batch Details</h3>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
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
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewBatch(null)}
                  className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Tree */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-custom">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <Layers className="h-3.5 w-3.5" />
                  Hierarchical Component Breakdown
                </div>
                <div className="space-y-3 bg-muted/20 p-4 border border-border/80 rounded-lg">
                  {buildHierarchy(viewBatch.devices).length > 0 ? (
                    buildHierarchy(viewBatch.devices).map(rootNode => renderDeviceNode(rootNode))
                  ) : (
                    <div className="text-center py-6 text-xs text-muted-foreground">
                      No device records found in this batch.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-border flex justify-between items-center bg-muted/10">
                <span className="text-xs text-muted-foreground font-semibold">
                  Batch Total: {viewBatch.devices.length} unit(s)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReturnBatch(viewBatch)}
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center rounded-md text-xs font-semibold border border-border bg-background shadow-sm hover:bg-destructive/10 hover:text-destructive h-9 px-4 cursor-pointer transition-all flex items-center gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Return Entire Batch
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewBatch(null)}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
