import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from "@/lib/hooks/useSearchParams";
import { useFeedback } from '@/components/ui/feedback-provider';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/components/ui/auth-context';

import { Button } from '@ims_pro/ui/components/button';
import { TableSkeleton } from '@/components/ui/loading';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims_pro/ui/components/table';
import { DEFAULT_QC_CHECKS, QCCheckStatus } from '@ims_pro/shared';
import type { QCCheckItem } from '@ims_pro/shared';
import { playSuccessBeep, playErrorBuzz, playChirp } from '@/lib/audio';
import { useDevices } from '@/lib/hooks/useDomain';
import { Device } from '@/lib/types/domain';
import { ScreenLayout, ScreenHeader, StaggerItem } from '@/components/ui/motion';

export const QCBench = () => {
  const { toast } = useFeedback();
  const { user } = useAuth();
  const { data: devices = [], isLoading, refetch: fetchDevices } = useDevices();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const qcDeviceId = searchParams.get('qcDevice');
    if (qcDeviceId && devices.length > 0) {
      const dev = devices.find(d => d.id === qcDeviceId);
      if (dev) {
        handleSelectDevice(dev);
        // Clear param
        searchParams.delete('qcDevice');
        setSearchParams(searchParams);
      }
    }
  }, [searchParams, devices]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pageSize = 10;

  // Checklist State
  const [results, setResults] = useState<Record<string, { status: QCCheckStatus; notes: string }>>({});

  // Telemetry Diagnostics State
  const [isRunningDiagnostics, setIsRunningDiagnostics] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);

  const filteredDevices = useMemo(() => {
    return devices.filter((d: Device) => {
      const matchesSearch = d.identifier.toLowerCase().includes(search.toLowerCase()) ||
        d.modelName.toLowerCase().includes(search.toLowerCase());
      // Only show devices that are in stock or already in testing
      const isEligible = d.status === 'IN_STOCK' || d.status === 'TESTING' || d.status === 'DAMAGED';
      return matchesSearch && isEligible;
    });
  }, [devices, search]);

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDevices = filteredDevices.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);

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
      const data = await apiClient.get<any>(`/api/devices/${selectedDevice.id}/telemetry-check`);
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
        
        toast.success('Live diagnostics telemetry checked successfully.');
      } else {
        playErrorBuzz();
        toast.error('Diagnostics telemetry check returned failure status.');
      }
    } catch (e) {
      console.error(e);
      playErrorBuzz();
      toast.error('Internal server error occurred during live diagnostics.');
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

      await apiClient.put(`/api/devices/${selectedDevice.id}`, {
        identifier: selectedDevice.identifier,
        modelId: selectedDevice.modelId,
        status: newStatus,
        metadata: updatedMetadata
      });

      if (overallStatus === 'PASSED') {
        toast.success(`QC Bench Report complete: ${selectedDevice.identifier} passed testing.`);
      } else {
        toast.info(`QC Bench Report complete: ${selectedDevice.identifier} failed critical checks.`);
      }
      await fetchDevices();
      setSelectedDevice(null);
    } catch (e) {
      console.error('Failed to submit QC report', e);
      playErrorBuzz();
      toast.error('Internal server error occurred while submitting QC report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (selectedDevice) {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setSelectedDevice(null)}
                className="h-9 w-9 bg-primary/5 border border-primary/20 hover:border-primary/50 text-foreground"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
              </Button>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Manual QC Testing</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Testing <span className="font-mono font-bold text-primary">{selectedDevice.identifier}</span> ({selectedDevice.modelName})
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="glass-panel px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="text-muted-foreground mr-1">Status:</span>
                {selectedDevice.status === 'IN_STOCK' && <span className="text-emerald-400 font-bold">In Stock</span>}
                {selectedDevice.status === 'DISPATCHED' && <span className="text-blue-400 font-bold">Dispatched</span>}
                {selectedDevice.status === 'TESTING' && <span className="text-amber-400 font-bold">Testing</span>}
                {selectedDevice.status === 'DAMAGED' && <span className="text-red-400 font-bold">Damaged</span>}
                {selectedDevice.status === 'RMA' && <span className="text-purple-300 font-bold">RMA Swap</span>}
                {!['IN_STOCK', 'DISPATCHED', 'TESTING', 'DAMAGED', 'RMA'].includes(selectedDevice.status) && (
                  <span className="text-primary font-bold">{selectedDevice.status.replace('_', ' ')}</span>
                )}
              </div>
            </div>
          </div>

          {/* Automated Telemetry Diagnostics Bench */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">sensors</span>
                  Automated Telemetry Diagnostics Bench
                </h3>
                <p className="text-xs text-muted-foreground">
                  Query active IoT cellular gateways, voltages, and GPS locks to auto-fill checklist fields.
                </p>
              </div>
              <Button
                onClick={runLiveDiagnostics}
                disabled={isRunningDiagnostics || user?.role === 'REVIEWER'}
                variant="outline"
                className="h-9 px-4 text-xs font-bold shrink-0 gap-1.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary"
              >
                {isRunningDiagnostics ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Querying Gateway...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">sensors</span>
                    Run Diagnostics
                  </>
                )}
              </Button>
            </div>

            {diagnosticsResult && (
              <div className="border border-primary/10 rounded-xl bg-primary/5 p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  {/* Status Indicator */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Diagnostics Status</span>
                    <span className={`inline-flex items-center gap-1 font-bold text-[9px] uppercase px-2 py-0.5 rounded border ${
                      diagnosticsResult.status === 'PASSED' 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {diagnosticsResult.status === 'PASSED' ? (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> GATEWAY PASS
                        </>
                      ) : (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> GATEWAY FAIL
                        </>
                      )}
                    </span>
                  </div>

                  {/* Network Operator */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Network Carrier</span>
                    <span className="font-mono text-foreground font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-primary">cell_tower</span>
                      {diagnosticsResult.network}
                    </span>
                  </div>

                  {/* Signal Strength (With bar gauge) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center pr-2">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Signal (RSSI)</span>
                      <span className="font-mono text-foreground text-[10px] font-bold">{diagnosticsResult.signalDbm} dBm</span>
                    </div>
                    <div className="flex items-end gap-0.5 h-3">
                      {/* 4-bar indicator */}
                      {[1, 2, 3, 4].map((bar) => {
                        const signal = diagnosticsResult.signalDbm;
                        let active = false;
                        if (bar === 1) active = true; // Poor/fair always gets 1 active
                        if (bar === 2 && signal > -105) active = true;
                        if (bar === 3 && signal > -95) active = true;
                        if (bar === 4 && signal > -80) active = true;
                        return (
                          <div
                            key={bar}
                            className={`w-1 rounded-sm transition-colors ${
                              active
                                ? signal > -105
                                  ? 'bg-emerald-400'
                                  : 'bg-red-400'
                                : 'bg-primary/10'
                            }`}
                            style={{ height: `${bar * 3}px` }}
                          />
                        );
                      })}
                      <span className="text-[9px] font-bold ml-1.5 font-mono uppercase text-muted-foreground leading-none">
                        {diagnosticsResult.signalDbm > -95 ? 'Good' : diagnosticsResult.signalDbm > -105 ? 'Fair' : 'Weak'}
                      </span>
                    </div>
                  </div>

                  {/* Battery Calibration (With progress bar) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center pr-2">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider block">Battery Voltage</span>
                      <span className="font-mono text-foreground text-[10px] font-bold">{diagnosticsResult.voltage}V</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-grow bg-primary/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            diagnosticsResult.voltage >= 3.6 ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(0, ((diagnosticsResult.voltage - 3.2) / (4.2 - 3.2)) * 100))}%`
                          }}
                        />
                      </div>
                      <span className="text-[9px] font-bold font-mono text-muted-foreground shrink-0 leading-none">
                        {Math.round(Math.min(100, Math.max(0, ((diagnosticsResult.voltage - 3.2) / (4.2 - 3.2)) * 100)))}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Threshold Info Banner */}
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground border-t border-primary/5 pt-2 font-medium">
                  <span className="material-symbols-outlined text-[12px] text-primary select-none">info</span>
                  <span>Gateway standards: Signal Strength must be better than <span className="font-mono">-105 dBm</span>. Battery voltage must calibrate above <span className="font-mono">3.6V</span>.</span>
                </div>
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="bg-primary/5 p-4 border-b border-primary/10 flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">fact_check</span>
                Hardware Test Matrix
              </h3>
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                Technician Checklist
              </span>
            </div>

            <div className="divide-y divide-primary/5">
              {DEFAULT_QC_CHECKS.map((check) => {
                const result = results[check.id];
                return (
                  <div key={check.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center hover:bg-primary/5 transition-colors">
                    <div className="md:col-span-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{check.label}</span>
                        {check.critical && (
                          <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 uppercase tracking-widest">
                            Critical
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Verify operating spec.</p>
                    </div>

                    <div className="md:col-span-4 flex items-center gap-3">
                      <button
                        className={`h-8 flex-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                          result.status === 'PASSED' 
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(52,211,153,0.1)]' 
                            : 'bg-transparent border-primary/10 text-muted-foreground hover:text-foreground hover:bg-primary/5'
                        } disabled:opacity-50 disabled:pointer-events-none`}
                        onClick={() => handleUpdateStatus(check.id, 'PASSED')}
                        disabled={user?.role === 'REVIEWER'}
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        <span>Pass</span>
                      </button>
                      <button
                        className={`h-8 flex-1 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all border ${
                          result.status === 'FAILED' 
                            ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_15px_rgba(248,113,113,0.1)]' 
                            : 'bg-transparent border-primary/10 text-muted-foreground hover:text-foreground hover:bg-primary/5'
                        } disabled:opacity-50 disabled:pointer-events-none`}
                        onClick={() => handleUpdateStatus(check.id, 'FAILED')}
                        disabled={user?.role === 'REVIEWER'}
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                        <span>Fail</span>
                      </button>
                    </div>

                    <div className="md:col-span-4">
                      <input 
                        placeholder="Add comments (optional)..." 
                        className="w-full bg-background border border-primary/10 rounded-lg py-1.5 px-3 text-xs font-medium placeholder:text-muted-foreground/30 focus:ring-1 focus:ring-primary focus:outline-none focus:border-primary text-foreground disabled:opacity-50"
                        value={result.notes}
                        onChange={(e) => handleUpdateNotes(check.id, e.target.value)}
                        disabled={user?.role === 'REVIEWER'}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 px-6 bg-primary/5 border-t border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="material-symbols-outlined text-sm text-muted-foreground">info</span>
                <span>Submit only after all items have been verified.</span>
              </div>
              {user?.role !== 'REVIEWER' ? (
                <Button 
                  disabled={!isComplete || isSubmitting}
                  onClick={handleSubmit}
                  className="gap-2 px-6 bg-primary text-primary-foreground font-bold hover:brightness-110 active:scale-95 transition-all rounded-lg"
                >
                  {isSubmitting ? (
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">done_all</span>
                  )}
                  Complete QC Report
                </Button>
              ) : (
                <div className="text-xs text-muted-foreground border border-primary/10 rounded-lg px-4 py-2 bg-primary/5">
                  Read-only view. Report completion is disabled.
                </div>
              )}
            </div>
          </div>
        </div>
    );
  }

  return (
    <ScreenLayout className="max-w-6xl mx-auto">
        <ScreenHeader
          title="QC Bench Testing"
          description="Select a hardware unit from inventory to begin the manual diagnostic checklist."
          actions={
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">search</span>
            <input
              placeholder="Search serial or model..."
              className="w-full bg-primary/5 border border-primary/10 rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-1 focus:ring-primary focus:outline-none text-foreground placeholder:text-muted-foreground/35"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          }
        />

        <StaggerItem>
        <div className="glass-panel rounded-2xl overflow-hidden">
          <Table>
            <TableHeader className="bg-card/40 border-b border-primary/10">
              <TableRow>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Device Identifier</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Model Template</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Status</TableHead>
                <TableHead className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Last Tested</TableHead>
                <TableHead className="text-right font-bold text-[10px] uppercase tracking-widest text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-primary/5">
              {isLoading ? (
                <TableSkeleton
                  bodyOnly
                  rows={5}
                  showHeader={false}
                  columns={[
                    { width: "w-32" },
                    { width: "w-24" },
                    { width: "w-20", type: "badge" },
                    { width: "w-28" },
                    { width: "w-20", align: "right", type: "icon" },
                  ]}
                />
              ) : paginatedDevices.length > 0 ? (
                paginatedDevices.map((device: Device) => {
                  const qcStatus = device.metadata?.qcStatus;
                  const qcTestedAt = device.metadata?.qcTestedAt;

                  return (
                    <TableRow key={device.id} className="group hover:bg-primary/5 transition-colors">
                      <TableCell className="font-mono font-bold text-primary">{device.identifier}</TableCell>
                      <TableCell className="text-xs text-foreground uppercase font-semibold">{device.modelName}</TableCell>
                      <TableCell>
                        {qcStatus === 'PASSED' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                            Passed
                          </span>
                        ) : qcStatus === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1 text-red-400 font-bold text-[10px] bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                            Failed
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-bold border border-primary/10 px-2 py-0.5 rounded uppercase tracking-wider">
                            Untested
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {qcTestedAt ? (
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">calendar_month</span>
                            <span>{new Date(qcTestedAt).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="italic opacity-50">Never</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <button 
                          onClick={() => handleSelectDevice(device)}
                          className="h-8 text-xs font-bold px-4 bg-primary text-primary-foreground rounded-md hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/10"
                        >
                          Start QC Test
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-3xl opacity-20">info</span>
                      <p>No devices found matching your search.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {!isLoading && filteredDevices.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-primary/10 bg-primary/5 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Showing <span className="font-mono font-bold text-foreground">{startIndex + 1}</span>
                {' '}to{' '}
                <span className="font-mono font-bold text-foreground">{Math.min(startIndex + pageSize, filteredDevices.length)}</span>
                {' '}of{' '}
                <span className="font-mono font-bold text-foreground">{filteredDevices.length}</span>
                {' '}eligible device{filteredDevices.length === 1 ? '' : 's'}.
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-primary/10 bg-primary/5 px-3 text-xs font-bold text-foreground transition-all hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-30"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="inline-flex h-8 items-center justify-center rounded-lg border border-primary/10 bg-primary/5 px-3 text-xs font-bold text-foreground transition-all hover:bg-primary/15 disabled:pointer-events-none disabled:opacity-30"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        </StaggerItem>
      </ScreenLayout>
  );
};

