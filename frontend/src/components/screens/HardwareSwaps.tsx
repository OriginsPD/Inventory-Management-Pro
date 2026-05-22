import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RefreshCw, Search, AlertTriangle, Calendar, User, CheckCircle2, ArrowRight } from 'lucide-react';
import { AppShell } from '../layout/AppShell';
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

interface Device {
  id: string;
  identifier: string;
  modelId: string;
  modelName: string;
  type: string;
  status: string;
  metadata?: Record<string, any>;
}

// Browser HTML5 synthesised beep/buzz generators
const playAudioTone = (frequency: number, duration: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle' = 'sine') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.value = frequency;
    
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.warn("AudioContext failed to play beep", e);
  }
};

const playSuccessBeep = () => {
  playAudioTone(850, 0.08, 'sine');
  setTimeout(() => playAudioTone(1250, 0.1, 'sine'), 70);
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate([50, 30, 50]);
  }
};

const playErrorBuzz = () => {
  playAudioTone(170, 0.25, 'triangle');
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(200);
  }
};

const swapSchema = z.object({
  oldDeviceId: z.string().min(1, 'Select the faulty active unit'),
  newDeviceId: z.string().min(1, 'Select a stocked replacement unit')
}).refine(data => data.oldDeviceId !== data.newDeviceId, {
  message: 'Replacement unit must be different from faulty unit',
  path: ['newDeviceId']
});

type SwapFormValues = z.infer<typeof swapSchema>;

export const HardwareSwaps = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [swapSuccess, setSwapSuccess] = useState(false);

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

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3002/api/devices');
      const data = await res.json();
      setDevices(data);

      const relRes = await fetch('http://localhost:3002/api/device-links');
      if (relRes.ok) {
        const relData = await relRes.json();
        setRelationships(relData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const oldDeviceId = watch("oldDeviceId");
  const linkedRelationships = relationships.filter(r => r.primaryDeviceId === oldDeviceId);
  const inheritedComponents = linkedRelationships
    .map(r => devices.find(d => d.id === r.linkedDeviceId))
    .filter(Boolean) as Device[];

  const onSubmit = async (values: SwapFormValues) => {
    try {
      const res = await fetch('http://localhost:3002/api/devices/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldDeviceId: values.oldDeviceId,
          newDeviceId: values.newDeviceId
        })
      });

      const responseData = await res.json();

      if (res.ok && !responseData.error) {
        setSwapSuccess(true);
        playSuccessBeep();
        reset();
        setTimeout(() => setSwapSuccess(false), 3000);
        fetchDevices();
      } else {
        console.error("Swap endpoint returned error:", responseData?.error);
        playErrorBuzz();
      }
    } catch (e) {
      console.error(e);
      playErrorBuzz();
    }
  };

  // Lists
  const dispatchedUnits = devices.filter(d => d.status === 'DISPATCHED');
  const stockedUnits = devices.filter(d => d.status === 'IN_STOCK');
  
  const damagedUnits = devices.filter(d => {
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
    <AppShell>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">RMA Swaps & Replacements</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Swap out faulty field hardware tracking units with certified warehouse stock to maintain uptime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Swap Form */}
          <div className="md:col-span-1 border border-border p-5 rounded-lg bg-card space-y-4 h-fit">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Log Unit Replacement Swap</h3>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            ) : (
              <>
                {swapSuccess && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs p-2.5 rounded font-medium">
                    Hardware swap processed and logged successfully!
                  </div>
                )}

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
                          <SelectTrigger className={`w-full text-sm h-9 bg-card ${errors.oldDeviceId ? 'border-destructive focus:ring-destructive' : ''}`}>
                            <SelectValue placeholder="Select active device..." />
                          </SelectTrigger>
                          <SelectContent>
                            {dispatchedUnits.map(d => (
                              <SelectItem key={d.id} value={d.id}>
                                {d.identifier} - {d.modelName} ({d.metadata?.customerName || 'Unknown Fleet'})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.oldDeviceId && (
                      <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.oldDeviceId.message}</p>
                    )}
                  </div>

                  {inheritedComponents.length > 0 && (
                    <div className="bg-muted/30 border border-border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Inherited Components ({inheritedComponents.length})
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-primary animate-pulse" />
                      </div>
                      <div className="space-y-1.5">
                        {inheritedComponents.map((comp) => (
                          <div key={comp.id} className="flex items-center justify-between text-xs bg-background/50 border border-border/60 px-2 py-1 rounded">
                            <div className="flex flex-col">
                              <span className="font-semibold text-foreground tracking-mono">{comp.identifier}</span>
                              <span className="text-[9px] text-muted-foreground">{comp.modelName}</span>
                            </div>
                            <span className="text-[9px] font-mono uppercase bg-muted border border-border px-1.5 py-0.5 rounded text-muted-foreground">
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
                          <SelectTrigger className={`w-full text-sm h-9 bg-card ${errors.newDeviceId ? 'border-destructive focus:ring-destructive' : ''}`}>
                            <SelectValue placeholder="Select replacement unit..." />
                          </SelectTrigger>
                          <SelectContent>
                            {stockedUnits.map(d => (
                              <SelectItem key={d.id} value={d.id}>{d.identifier} - {d.modelName}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.newDeviceId && (
                      <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.newDeviceId.message}</p>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 cursor-pointer"
                  >
                    Perform Unit Replacement Swap
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Column 2 & 3: Damaged Registry */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border border-border p-2 rounded-lg bg-card">
              <div className="flex items-center gap-2 flex-1 px-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <input 
                  placeholder="Filter damaged/RMA units registry..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex h-9 w-full bg-transparent px-2 py-1 text-sm focus-visible:outline-none placeholder:text-muted-foreground border-0"
                />
              </div>
            </div>

            <div className="border border-border rounded-lg bg-card overflow-visible">
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
                    paginatedDamaged.map((device) => (
                      <TableRow key={device.id}>
                        <TableCell className="font-medium tracking-mono text-foreground">{device.identifier}</TableCell>
                        <TableCell className="text-muted-foreground">{device.modelName}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span>{device.metadata?.customerName || 'Internal Inventory'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {device.metadata?.replacedBy ? (
                            <span className="inline-flex items-center gap-1 font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                              <CheckCircle2 className="h-3 w-3" /> {device.metadata.replacedBy}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                              <AlertTriangle className="h-3 w-3" /> Awaiting Swap
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {device.metadata?.swappedAt ? (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
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
                          icon={AlertTriangle}
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
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
    </AppShell>
  );
};
