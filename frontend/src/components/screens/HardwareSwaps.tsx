import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../ui/auth-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFeedback } from '../ui/feedback-provider';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select"
import { useDevices, useRelationships } from '../../lib/hooks/useDomain';
import { Device } from '../../lib/types/domain';

const swapSchema = z.object({
  oldDeviceId: z.string().min(1, 'Select the faulty active unit'),
  newDeviceId: z.string().min(1, 'Select a stocked replacement unit')
}).refine(data => data.oldDeviceId !== data.newDeviceId, {
  message: 'Replacement unit must be different from faulty unit',
  path: ['newDeviceId']
});

type SwapFormValues = z.infer<typeof swapSchema>;

export const HardwareSwaps = () => {
  const { toast } = useFeedback();
  const { user } = useAuth();
  
  const { data: devices = [], isLoading: isLoadingDevices, refetch: fetchDevices } = useDevices();
  const { data: relationships = [], isLoading: isLoadingRels } = useRelationships();
  
  const isLoading = isLoadingDevices || isLoadingRels;
  const [search, setSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { handleSubmit, control, formState: { errors }, reset, watch } = useForm<SwapFormValues>({
    resolver: zodResolver(swapSchema),
    defaultValues: {
      oldDeviceId: '',
      newDeviceId: ''
    }
  });

  const oldDeviceId = watch("oldDeviceId");
  const linkedRelationships = relationships.filter(r => r.primaryDeviceId === oldDeviceId);
  const inheritedComponents = linkedRelationships
    .map(r => devices.find(d => d.id === r.linkedDeviceId))
    .filter(Boolean) as Device[];

  const onSubmit = async (values: SwapFormValues) => {
    try {
      const responseData = await apiClient.post<any>('/api/devices/swap', {
        oldDeviceId: values.oldDeviceId,
        newDeviceId: values.newDeviceId
      });

      if (responseData && !responseData.error) {
        toast.success('Hardware replacement swap processed and logged successfully!');
        reset();
        await fetchDevices();
      } else {
        console.error("Swap endpoint returned error:", responseData?.error);
        toast.error(responseData?.error || 'Failed to process hardware swap.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Internal server error occurred while processing hardware swap.');
    }
  };

  // Lists
  const dispatchedUnits = devices.filter((d: Device) => d.status === 'DISPATCHED');
  const stockedUnits = devices.filter((d: Device) => d.status === 'IN_STOCK');
  
  const damagedUnits = devices.filter((d: Device) => {
    const isDamaged = d.status === 'DAMAGED';
    const matchesSearch = d.identifier.toLowerCase().includes(search.toLowerCase()) ||
      d.modelName.toLowerCase().includes(search.toLowerCase());
    return isDamaged && matchesSearch;
  });

  // Reset pagination on search
  useEffect(() => {
    setCurrentPage(1);
  }, [search, devices.length]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDamaged = damagedUnits.slice(startIndex, endIndex);
  const totalPages = Math.ceil(damagedUnits.length / pageSize);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground">RMA Swaps & Replacements</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Swap out faulty field hardware tracking units with certified warehouse stock to maintain uptime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Swap Form */}
          <div className="md:col-span-1 glass-panel p-5 rounded-2xl space-y-4 h-fit">
            <div className="flex items-center gap-2 border-b border-primary/10 pb-3">
              <span className="material-symbols-outlined text-[18px] text-primary">sync</span>
              <h3 className="font-extrabold text-sm text-foreground">Log Unit Replacement Swap</h3>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-9 w-full animate-pulse" />
                <Skeleton className="h-9 w-full animate-pulse" />
              </div>
            ) : (
              <>


                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Faulty Field Unit (Dispatched)
                    </label>
                    <Controller
                      control={control}
                      name="oldDeviceId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className={`w-full text-xs h-9 bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20 ${errors.oldDeviceId ? 'border-red-500/50 focus:ring-red-500/20' : ''}`}>
                            <SelectValue placeholder="Select active device..." />
                          </SelectTrigger>
                          <SelectContent>
                            {dispatchedUnits.map((d: Device) => (
                              <SelectItem key={d.id || ''} value={d.id || ''}>
                                {d.identifier} - {d.modelName} ({d.metadata?.customerName || 'Unknown Fleet'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.oldDeviceId && (
                      <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.oldDeviceId.message}</p>
                    )}
                  </div>

                  {inheritedComponents.length > 0 && (
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Inherited Components ({inheritedComponents.length})
                        </span>
                        <span className="material-symbols-outlined text-sm text-primary animate-pulse">arrow_forward</span>
                      </div>
                      <div className="space-y-1.5">
                        {inheritedComponents.map((comp) => (
                          <div key={comp.id} className="flex items-center justify-between text-xs bg-background/50 border border-primary/10 px-2 py-1 rounded-lg">
                            <div className="flex flex-col">
                              <span className="font-bold text-foreground font-mono tracking-wider">{comp.identifier}</span>
                              <span className="text-[9px] text-muted-foreground">{comp.modelName}</span>
                            </div>
                            <span className="text-[9px] font-mono uppercase bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded text-primary font-bold">
                              {comp.type}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-muted-foreground italic leading-normal">
                        These child devices will be automatically transferred and linked to the replacement tracker.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Replacement Warehouse Unit (In Stock)
                    </label>
                    <Controller
                      control={control}
                      name="newDeviceId"
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger className={`w-full text-xs h-9 bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20 ${errors.newDeviceId ? 'border-red-500/50 focus:ring-red-500/20' : ''}`}>
                            <SelectValue placeholder="Select replacement unit..." />
                          </SelectTrigger>
                          <SelectContent>
                            {stockedUnits.map((d: Device) => (
                              <SelectItem key={d.id || ''} value={d.id || ''}>{d.identifier} - {d.modelName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.newDeviceId && (
                      <p className="text-[10px] text-red-400 mt-1 font-semibold">{errors.newDeviceId.message}</p>
                    )}
                  </div>

                  {user?.role !== 'REVIEWER' ? (
                    <button 
                      type="submit" 
                      className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-4 cursor-pointer"
                    >
                      Perform Unit Replacement Swap
                    </button>
                  ) : (
                    <div className="text-center text-xs text-muted-foreground p-3 border border-primary/10 rounded-xl bg-primary/5">
                      Read-only access. Hardware swaps are disabled.
                    </div>
                  )}
                </form>
              </>
            )}
          </div>

          {/* Column 2 & 3: Damaged Registry */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-primary/10 p-2 rounded-xl bg-card/60">
              <div className="flex items-center gap-2 flex-1 px-2">
                <span className="material-symbols-outlined text-sm text-muted-foreground shrink-0">search</span>
                <input 
                  placeholder="Filter damaged/RMA units registry..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex h-9 w-full bg-transparent px-2 py-1 text-sm focus-visible:outline-none placeholder:text-muted-foreground/30 text-foreground border-0"
                />
              </div>
            </div>

            <div className="glass-panel rounded-xl overflow-visible">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Faulty Serial</TableHead>
                    <TableHead>Model Template</TableHead>
                    <TableHead>Former Customer</TableHead>
                    <TableHead>Replacement Unit</TableHead>
                    <TableHead>Swap Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <TableRow key={index} className="animate-pulse">
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : paginatedDamaged.length > 0 ? (
                    paginatedDamaged.map((device: Device) => (
                      <TableRow key={device.id} className="group hover:bg-primary/5 transition-colors">
                        <TableCell className="font-bold tracking-mono text-foreground font-mono text-xs">{device.identifier}</TableCell>
                        <TableCell className="text-muted-foreground">{device.modelName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs">
                            <span className="material-symbols-outlined text-xs text-muted-foreground">person</span>
                            <span>{device.metadata?.customerName || 'Internal Inventory'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {device.metadata?.replacedBy ? (
                            <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                              <span className="material-symbols-outlined text-xs mr-1 text-emerald-400">check_circle</span> {device.metadata.replacedBy}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                              <span className="material-symbols-outlined text-xs mr-1 text-amber-400">warning</span> Awaiting Swap
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {device.metadata?.swappedAt ? (
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-xs text-muted-foreground">calendar_today</span>
                              <span>
                                {new Date(device.metadata.swappedAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="italic text-muted-foreground/60">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-auto p-0">
                        <EmptyState
                          icon="warning"
                          title="No Damaged or Swapped Units"
                          description="There are currently no active damaged units or completed RMA swaps registered in the log."
                          className="border-0 bg-transparent py-12"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {damagedUnits.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10 bg-transparent">
                <div className="text-xs text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                  <span className="font-semibold text-foreground">{Math.min(endIndex, damagedUnits.length)}</span> of{' '}
                  <span className="font-semibold text-foreground">{damagedUnits.length}</span> units
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
      </div>
  );
};

