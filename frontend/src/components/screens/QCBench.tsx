import { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Search, 
  Calendar, 
  Check, 
  AlertCircle, 
  ArrowLeft,
  Info,
  Save,
  Loader2,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DEFAULT_QC_CHECKS, QCCheckStatus } from '@ims-pro/shared';
import type { QCCheckItem } from '@ims-pro/shared';

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

const playChirp = () => {
  playAudioTone(950, 0.05, 'sine');
};

interface Device {
  id: string;
  identifier: string;
  modelId: string;
  modelName: string;
  type: string;
  status: string;
  metadata?: Record<string, any>;
}

export const QCBench = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checklist State
  const [results, setResults] = useState<Record<string, { status: QCCheckStatus; notes: string }>>({});

  // Telemetry Diagnostics State
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3002/api/devices');
      const data = await res.json();
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const matchesSearch = d.identifier.toLowerCase().includes(search.toLowerCase()) ||
        d.modelName.toLowerCase().includes(search.toLowerCase());
      // Only show devices that are in stock or already in testing
      const isEligible = d.status === 'IN_STOCK' || d.status === 'TESTING' || d.status === 'DAMAGED';
      return matchesSearch && isEligible;
    });
  }, [devices, search]);

  const handleSelectDevice = (device: Device) => {
    setSelectedDevice(device);
    setDiagnosticsResult(null);
    setIsRunningDiagnostics(false);
    // Initialize results
    const initialResults: Record<string, { status: QCCheckStatus; notes: string }> = {};
    DEFAULT_QC_CHECKS.forEach((check) => {
      initialResults[check.id] = { status: 'UNTESTED', notes: '' };
    });
    setResults(initialResults);
  };

  const handleUpdateStatus = (checkId: string, status: QCCheckStatus) => {
    playChirp();
    setResults(prev => ({
      ...prev,
      [checkId]: { ...prev[checkId], status }
    }));
  };

  const handleUpdateNotes = (checkId: string, notes: string) => {
    setResults(prev => ({
      ...prev,
      [checkId]: { ...prev[checkId], notes }
    }));
  };

  const isComplete = useMemo(() => {
    return Object.values(results).every(r => r.status !== 'UNTESTED');
  }, [results]);

  const runLiveDiagnostics = async () => {
    if (!selectedDevice) return;
    setIsRunningDiagnostics(true);
    setDiagnosticsResult(null);
    playChirp();
    try {
      const res = await fetch(`http://localhost:3002/api/devices/${selectedDevice.id}/telemetry-check`);
      const data = await res.json();
      if (data.success && data.telemetry) {
        const tel = data.telemetry;
        setDiagnosticsResult(tel);
        playSuccessBeep();
        
        // Auto-fill physical/power/battery/sim/gps depending on telemetry
        const cellStatus = tel.status === 'PASSED' || (tel.signalDbm > -105 && tel.gpsSatellites >= 4) ? 'PASSED' : 'FAILED';
        const powerStatus = tel.status === 'PASSED' || tel.voltage >= 3.6 ? 'PASSED' : 'FAILED';

        setResults(prev => ({
          ...prev,
          power: { status: powerStatus, notes: `Auto-verified via Telemetry (Voltage: ${tel.voltage}V)` },
          battery: { status: powerStatus, notes: `Auto-verified via Telemetry (Voltage: ${tel.voltage}V)` },
          sim: { status: cellStatus, notes: `Auto-verified via Telemetry (${tel.network}, ${tel.signalDbm} dBm)` },
          gps: { status: cellStatus, notes: `Auto-verified via Telemetry (${tel.gpsSatellites} satellites)` }
        }));
      } else {
        playErrorBuzz();
      }
    } catch (e) {
      console.error(e);
      playErrorBuzz();
    } finally {
      setIsRunningDiagnostics(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDevice || !isComplete) return;

    setIsSubmitting(true);
    try {
      const items: QCCheckItem[] = DEFAULT_QC_CHECKS.map((check) => ({
        ...check,
        status: results[check.id].status,
        notes: results[check.id].notes
      }));

      const hasCriticalFailure = items.some(item => item.critical && item.status === 'FAILED');
      const overallStatus = hasCriticalFailure ? 'FAILED' : 'PASSED';

      if (overallStatus === 'PASSED') {
        playSuccessBeep();
      } else {
        playErrorBuzz();
      }

      const updatedMetadata = {
        ...(selectedDevice.metadata || {}),
        qcStatus: overallStatus,
        qcTestedAt: new Date().toISOString(),
        qcChecklist: items
      };

      // Determine new device status
      // If it passes, it remains IN_STOCK (or moves to IN_STOCK if it was TESTING/DAMAGED)
      // If it fails, it moves to DAMAGED (Locked)
      const newStatus = overallStatus === 'PASSED' ? 'IN_STOCK' : 'DAMAGED';

      await fetch(`http://localhost:3002/api/devices/${selectedDevice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: selectedDevice.identifier,
          modelId: selectedDevice.modelId,
          status: newStatus,
          metadata: updatedMetadata
        })
      });

      await fetchDevices();
      setSelectedDevice(null);
    } catch (e) {
      console.error('Failed to submit QC report', e);
      playErrorBuzz();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedDevice) {
    return (
      <AppShell>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setSelectedDevice(null)}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h2 className="text-xl font-semibold tracking-tight">Manual QC Testing</h2>
                <p className="text-sm text-muted-foreground">
                  Testing <span className="font-mono font-medium text-foreground">{selectedDevice.identifier}</span> ({selectedDevice.modelName})
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`px-2 py-1 rounded border text-[10px] font-bold uppercase tracking-wider ${
                selectedDevice.status === 'IN_STOCK' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                selectedDevice.status === 'DAMAGED' ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                'bg-zinc-500/10 text-zinc-600 border-zinc-500/20'
              }`}>
                Current: {selectedDevice.status}
              </div>
            </div>
          </div>

          {/* Automated Telemetry Diagnostics Bench */}
          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Automated Telemetry Diagnostics Bench
                </h3>
                <p className="text-xs text-muted-foreground">
                  Query active IoT cellular gateways, voltages, and GPS locks to auto-fill checklist fields.
                </p>
              </div>
              <Button
                onClick={runLiveDiagnostics}
                disabled={isRunningDiagnostics}
                variant="outline"
                className="h-9 px-4 text-xs font-semibold shrink-0 gap-1.5"
              >
                {isRunningDiagnostics ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Querying Gateway...
                  </>
                ) : (
                  <>
                    <Activity className="h-3.5 w-3.5" />
                    Run Diagnostics
                  </>
                )}
              </Button>
            </div>

            {diagnosticsResult && (
              <div className="border border-border/80 rounded-lg bg-muted/10 p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Diagnostics Status</span>
                  <span className={`inline-flex items-center gap-1 font-semibold text-[10px] uppercase px-1.5 py-0.5 rounded border ${
                    diagnosticsResult.status === 'PASSED' 
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                      : 'bg-red-500/10 text-red-600 border-red-500/20'
                  }`}>
                    {diagnosticsResult.status}
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Cellular Network</span>
                  <span className="font-mono text-foreground font-semibold">{diagnosticsResult.network}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Signal Strength</span>
                  <span className="font-mono text-foreground font-semibold">{diagnosticsResult.signalDbm} dBm</span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">Calibration Voltage</span>
                  <span className="font-mono text-foreground font-semibold">{diagnosticsResult.voltage}V</span>
                </div>
              </div>
            )}
          </div>

          <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
            <div className="bg-muted/30 p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Hardware Test Matrix
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                Technician Checklist
              </span>
            </div>

            <div className="divide-y divide-border">
              {DEFAULT_QC_CHECKS.map((check) => {
                const result = results[check.id];
                return (
                  <div key={check.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-muted/10 transition-colors">
                    <div className="md:col-span-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{check.label}</span>
                        {check.critical && (
                          <span className="text-[9px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-tighter">
                            Critical
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Verify the {check.label.toLowerCase()} is within operating spec.</p>
                    </div>

                    <div className="md:col-span-4 flex items-center gap-3">
                      <Button
                        size="sm"
                        variant={result.status === 'PASSED' ? 'default' : 'outline'}
                        className={`h-9 flex-1 gap-1.5 ${result.status === 'PASSED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}`}
                        onClick={() => handleUpdateStatus(check.id, 'PASSED')}
                      >
                        <Check className="h-4 w-4" />
                        <span className="text-xs">Pass</span>
                      </Button>
                      <Button
                        size="sm"
                        variant={result.status === 'FAILED' ? 'destructive' : 'outline'}
                        className={`h-9 flex-1 gap-1.5 ${result.status === 'FAILED' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}`}
                        onClick={() => handleUpdateStatus(check.id, 'FAILED')}
                      >
                        {/* Red Check Mark as requested by user instead of X */}
                        <Check className="h-4 w-4" />
                        <span className="text-xs">Fail</span>
                      </Button>
                    </div>

                    <div className="md:col-span-4">
                      <Input 
                        placeholder="Add notes (optional)..." 
                        className="h-9 text-xs"
                        value={result.notes}
                        onChange={(e) => handleUpdateNotes(check.id, e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 bg-muted/20 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>Submit only after all items have been verified.</span>
              </div>
              <Button 
                disabled={!isComplete || isSubmitting}
                onClick={handleSubmit}
                className="gap-2 px-6"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Complete QC Report
              </Button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">QC Bench Testing</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Select a hardware unit from inventory to begin the manual diagnostic checklist.
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search serial or model..."
              className="pl-9 h-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Device Identifier</TableHead>
                <TableHead>Model Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Tested</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredDevices.length > 0 ? (
                filteredDevices.map((device) => {
                  const qcStatus = device.metadata?.qcStatus;
                  const qcTestedAt = device.metadata?.qcTestedAt;

                  return (
                    <TableRow key={device.id} className="group">
                      <TableCell className="font-mono font-medium">{device.identifier}</TableCell>
                      <TableCell className="text-xs text-muted-foreground uppercase">{device.modelName}</TableCell>
                      <TableCell>
                        {qcStatus === 'PASSED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            <CheckCircle2 className="h-3 w-3" /> Passed
                          </span>
                        ) : qcStatus === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-[10px] bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider">
                            <AlertCircle className="h-3 w-3" /> Failed
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-medium border border-border px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Untested
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {qcTestedAt ? (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(qcTestedAt).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="italic opacity-50">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => handleSelectDevice(device)}
                          className="h-8 text-xs font-semibold"
                        >
                          Start QC Test
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Info className="h-8 w-8 opacity-20" />
                      <p>No devices found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppShell>
  );
};
