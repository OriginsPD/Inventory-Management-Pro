import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../ui/auth-context';
import { useFeedback } from '../ui/feedback-provider';
import { useInventory } from './inventory/useInventory';
import { InventoryToolbar } from './inventory/InventoryToolbar';
import { InventoryTable } from './inventory/InventoryTable';
import { SelectionBanner } from './inventory/SelectionBanner';
import { SingleEntryModal } from './inventory/SingleEntryModal';
import { BulkOperationsModal } from './inventory/BulkOperationsModal';
import { DeviceDetailModal } from './inventory/DeviceDetailModal';
import { ManageLinksModal } from './inventory/ManageLinksModal';
import { Device } from '../../lib/types/domain';
import { useHotScanner } from '../../lib/hooks/useHotScanner';
import { playSuccessBeep, playChirp, playErrorBuzz } from '../../lib/audio';
import { InlineErrorState } from '../ui/inline-error-state';

export const DeviceInventory = () => {
  const { user } = useAuth();
  const { toast, confirm } = useFeedback();
  
  // State for filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  
  // State for table
  const [sortField, setSortField] = useState('identifier');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [isAllSelectedGlobally, setIsAllSelectedGlobally] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    identifier: true,
    type: true,
    modelName: true,
    status: true,
    metadata: true,
    linked: true,
    actions: true
  });

  // State for modals
  const [activeModal, setActiveModal] = useState<'none' | 'single' | 'bulk'>('none');
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [viewModalDevice, setViewModalDevice] = useState<Device | null>(null);
  const [linkModalDevice, setLinkModalDevice] = useState<Device | null>(null);
  const [pendingScannerBarcode, setPendingScannerBarcode] = useState<string | null>(null);

  // Offline buffer state
  const [pendingSyncItems, setPendingSyncItems] = useState<Partial<Device>[]>(() => {
    const stored = localStorage.getItem('ims_pending_sync');
    return stored ? JSON.parse(stored) : [];
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Hook for data
  const { 
    devices, 
    isLoadingDevices, 
    models, 
    relationships, 
    devicesError,
    modelsError,
    relationshipsError,
    hasInventoryError,
    deleteDevice, 
    bulkDeleteDevices, 
    syncDevices,
    refetchDevices,
    refetchModels,
    refetchRelationships
  } = useInventory({ search: debouncedSearch, status: statusFilter, modelId: modelFilter });

  const inventoryError = devicesError || modelsError || relationshipsError;

  const retryInventoryQueries = () => {
    refetchDevices();
    refetchModels();
    refetchRelationships();
  };

  const syncPendingItems = useCallback(async (itemsToSync?: Partial<Device>[]) => {
    const items = itemsToSync || pendingSyncItems;
    if (items.length === 0) return;
    try {
      await syncDevices(items);
      localStorage.removeItem('ims_pending_sync');
      setPendingSyncItems([]);
      playSuccessBeep();
      toast.success('Offline queue synced successfully.');
    } catch {
      playErrorBuzz();
    }
  }, [pendingSyncItems, syncDevices, toast]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Handle online/offline
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      const latest = localStorage.getItem('ims_pending_sync');
      if (latest) {
        const items = JSON.parse(latest);
        if (items.length > 0) syncPendingItems(items);
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingItems]);

  const bufferPendingSync = (payload: Partial<Device>[]) => {
    const stored = localStorage.getItem('ims_pending_sync');
    const existing = stored ? JSON.parse(stored) : [];
    const merged = [...existing, ...payload].filter((item, idx, self) =>
      self.findIndex(t => t.identifier === item.identifier) === idx
    );
    localStorage.setItem('ims_pending_sync', JSON.stringify(merged));
    setPendingSyncItems(merged);
    playChirp();
  };

  // Hot Scanner listener
  useHotScanner((barcode) => {
    if (activeModal === 'none') {
      setPendingScannerBarcode(barcode);
      playChirp();
      setActiveModal('bulk');
    }
  });

  // Sorting & Pagination
  const sortedDevices = useMemo(() => {
    const result = [...devices];
    if (sortField) {
      result.sort((a, b) => {
        const valA = String((a as unknown as Record<string, unknown>)[sortField] ?? '').toLowerCase();
        const valB = String((b as unknown as Record<string, unknown>)[sortField] ?? '').toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [devices, sortField, sortDirection]);

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedDevices = sortedDevices.slice(startIndex, startIndex + pageSize);
  const totalPages = Math.ceil(sortedDevices.length / pageSize);

  // Handlers
  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const toggleDeviceSelection = (id: string) => {
    setSelectedDeviceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const togglePageSelection = () => {
    const pageIds = paginatedDevices.map(d => d.id || '');
    const allInPage = pageIds.every(id => selectedDeviceIds.includes(id));
    if (allInPage) setSelectedDeviceIds(prev => prev.filter(id => !pageIds.includes(id)));
    else setSelectedDeviceIds(prev => [...new Set([...prev, ...pageIds])]);
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Delete Device?', message: 'Are you sure?' })) {
      await deleteDevice(id);
      toast.success('Device deleted');
    }
  };

  const handleBulkDelete = async (ids: string[]) => {
    if (await confirm({ title: 'Bulk Delete?', message: `Delete ${ids.length} devices?` })) {
      await bulkDeleteDevices(ids);
      toast.success('Bulk delete executed');
      setSelectedDeviceIds([]);
      setIsAllSelectedGlobally(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {!isOnline && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 px-4 flex items-center gap-2 text-xs font-medium">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span>Connection Offline: Operations will be cached locally.</span>
        </div>
      )}

      {pendingSyncItems.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-3 px-4 flex justify-between items-center text-xs font-medium">
          <span>You have <strong>{pendingSyncItems.length}</strong> pending items buffered.</span>
          <button onClick={() => syncPendingItems()} disabled={!isOnline} className="bg-amber-500 hover:bg-amber-600 text-white rounded px-3 py-1 font-bold disabled:opacity-50">Sync Queue</button>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Device Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tracking hardware, SIMs, and peripherals.</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role !== 'REVIEWER' && (
            <>
              <button onClick={() => setActiveModal('bulk')} className="inline-flex items-center justify-center rounded-lg text-xs font-bold border border-primary/10 bg-primary/5 hover:bg-primary/15 text-foreground h-9 px-4 gap-1.5 cursor-pointer">
                <span className="material-symbols-outlined text-sm">upload</span> Bulk Operations
              </button>
              <button onClick={() => { setEditingDevice(null); setActiveModal('single'); }} className="inline-flex items-center justify-center rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-4 gap-1.5 cursor-pointer">
                <span className="material-symbols-outlined text-sm">add</span> Single Entry
              </button>
            </>
          )}
        </div>
      </div>

      <InventoryToolbar 
        search={search} setSearch={setSearch}
        statusFilter={statusFilter} setStatusFilter={setStatusFilter}
        modelFilter={modelFilter} setModelFilter={setModelFilter}
        models={models}
        visibleColumns={visibleColumns} setVisibleColumns={setVisibleColumns}
      />

      {hasInventoryError && (
        <div className="glass-panel rounded-xl overflow-hidden">
          <InlineErrorState
            title="Inventory data failed to load"
            description="Some inventory data could not be loaded. Retry the request before editing devices or managing links."
            error={inventoryError}
            onRetry={retryInventoryQueries}
          />
        </div>
      )}

      <div className="space-y-4">
        <SelectionBanner 
          devices={devices} paginatedDevices={paginatedDevices}
          selectedDeviceIds={selectedDeviceIds} setSelectedDeviceIds={setSelectedDeviceIds}
          isAllSelectedGlobally={isAllSelectedGlobally} setIsAllSelectedGlobally={setIsAllSelectedGlobally}
          handleBulkDelete={handleBulkDelete}
        />

        <InventoryTable 
          devices={devices} paginatedDevices={paginatedDevices}
          isLoading={isLoadingDevices}
          selectedDeviceIds={selectedDeviceIds}
          isAllSelectedGlobally={isAllSelectedGlobally}
          togglePageSelection={togglePageSelection}
          toggleDeviceSelection={toggleDeviceSelection}
          visibleColumns={visibleColumns}
          handleSort={handleSort}
          user={user}
          setViewModalDevice={setViewModalDevice}
          setLinkModalDevice={setLinkModalDevice}
          handleOpenEditModal={(d) => { setEditingDevice(d); setActiveModal('single'); }}
          handleDelete={handleDelete}
          currentPage={currentPage} setCurrentPage={setCurrentPage}
          totalPages={totalPages}
        />
      </div>

      <SingleEntryModal 
        isOpen={activeModal === 'single'} 
        onClose={() => { setActiveModal('none'); setEditingDevice(null); }}
        models={models}
        editingDevice={editingDevice}
        onSuccess={refetchDevices}
      />

      <BulkOperationsModal 
        isOpen={activeModal === 'bulk'}
        onClose={() => setActiveModal('none')}
        models={models}
        onSuccess={refetchDevices}
        isOnline={isOnline}
        bufferPendingSync={bufferPendingSync}
        devices={devices}
        initialScannedIdentifier={pendingScannerBarcode}
        onInitialScanConsumed={() => setPendingScannerBarcode(null)}
      />

      <DeviceDetailModal device={viewModalDevice} onClose={() => setViewModalDevice(null)} />

      <ManageLinksModal 
        device={linkModalDevice} 
        onClose={() => setLinkModalDevice(null)}
        devices={devices}
        models={models}
        relationships={relationships}
        onSuccess={() => { refetchRelationships(); refetchDevices(); }}
      />
    </div>
  );
};

