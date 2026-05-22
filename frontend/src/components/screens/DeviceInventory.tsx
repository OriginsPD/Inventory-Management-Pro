import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Upload, 
  Trash2, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  Scan, 
  X, 
  FileSpreadsheet, 
  Info, 
  Volume2, 
  MoreHorizontal, 
  Eye, 
  Edit2, 
  Link as LinkIcon, 
  ChevronDown, 
  ArrowUpDown,
  History
} from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { EmptyState } from '../ui/empty-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../ui/table';

interface Device {
  id: string;
  identifier: string;
  modelId: string;
  modelName: string;
  type: string;
  status: string;
  linked: number;
  metadata?: Record<string, any>;
}

interface DeviceModel {
  id: string;
  name: string;
  brand: string;
  assetType: string;
  allowedChildren?: string | string[];
  identifierPattern?: string;
}

interface ParsedLink {
  primaryISN: string;
  childISN: string;
  childType: string;
  status: 'valid' | 'invalid';
  message?: string;
  autoCreatePrimary?: string;
  autoCreateChild?: string;
}

interface IngestItem {
  identifier: string;
  metadata: Record<string, any>;
}

// Dynamic Zod Validation Schema Builder
const createSingleSchema = (modelsList: DeviceModel[]) => {
  return z.object({
    identifier: z.string()
      .min(3, "Identifier must be at least 3 characters")
      .max(40, "Identifier is too long")
      .regex(/^[a-zA-Z0-9\-_]+$/, "Only letters, numbers, dashes, and underscores allowed"),
    modelId: z.string().min(1, "Please select a model template"),
    meta1: z.string().optional(),
    meta2: z.string().optional()
  }).superRefine((data, ctx) => {
    const selectedModel = modelsList.find(m => m.id === data.modelId);
    const assetType = selectedModel ? selectedModel.assetType : 'TRACKER';

    if (assetType === 'SIM') {
      if (!data.meta1 || data.meta1.trim() === '') {
        ctx.addIssue({
          path: ['meta1'],
          code: z.ZodIssueCode.custom,
          message: "MSISDN phone number is required"
        });
      }
      if (!data.meta2 || data.meta2.trim() === '') {
        ctx.addIssue({
          path: ['meta2'],
          code: z.ZodIssueCode.custom,
          message: "Carrier is required"
        });
      }
    } else if (assetType === 'SD_CARD') {
      if (!data.meta1 || data.meta1.trim() === '') {
        ctx.addIssue({
          path: ['meta1'],
          code: z.ZodIssueCode.custom,
          message: "Capacity is required"
        });
      }
      if (!data.meta2 || data.meta2.trim() === '') {
        ctx.addIssue({
          path: ['meta2'],
          code: z.ZodIssueCode.custom,
          message: "Speed rating is required"
        });
      }
    }
  });
};

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

export const DeviceInventory = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [models, setModels] = useState<DeviceModel[]>([]);
  const [relationships, setRelationships] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');

  // Active Modals: 'none', 'single', 'bulk'
  const [activeModal, setActiveModal] = useState<'none' | 'single' | 'bulk'>('none');
  const [bulkSubTab, setBulkSubTab] = useState<'ingest' | 'link'>('ingest');

  const [viewModalDevice, setViewModalDevice] = useState<Device | null>(null);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [linkModalDevice, setLinkModalDevice] = useState<Device | null>(null);
  const [linkModalError, setLinkModalError] = useState<string>('');
  const [stagedLinks, setStagedLinks] = useState<any[]>([]);
  const [linkSearch, setLinkSearch] = useState<string>('');
  const [linkParentSearch, setLinkParentSearch] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Tab & Audit Log details modal states
  const [deviceDetailTab, setDeviceDetailTab] = useState<'info' | 'activity'>('info');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAuditLogsLoading, setIsAuditLogsLoading] = useState(false);

  // Keyboard Scanner / Browser Connectivity status
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingSyncItems, setPendingSyncItems] = useState<any[]>([]);

  // CSV Mapper State
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [isCsvMapping, setIsCsvMapping] = useState(false);
  const [csvMappings, setCsvMappings] = useState({
    identifier: '',
    meta1: '__none__',
    meta2: '__none__'
  });

  // Multi-Selection State
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [isAllSelectedGlobally, setIsAllSelectedGlobally] = useState<boolean>(false);

  // Sorting State
  const [sortField, setSortField] = useState<'identifier' | 'type' | 'modelName' | 'status' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column Visibility State
  const columnsDropdownRef = useRef<HTMLDivElement>(null);
  const [isColumnsDropdownOpen, setIsColumnsDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    identifier: true,
    type: true,
    modelName: true,
    status: true,
    metadata: true,
    linked: true,
    actions: true,
  });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (columnsDropdownRef.current && !columnsDropdownRef.current.contains(e.target as Node)) {
        setIsColumnsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSort = (field: 'identifier' | 'type' | 'modelName' | 'status') => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const toggleDeviceSelection = (id: string) => {
    if (isAllSelectedGlobally) {
      setIsAllSelectedGlobally(false);
      setSelectedDeviceIds(devices.map(d => d.id).filter(x => x !== id));
    } else {
      if (selectedDeviceIds.includes(id)) {
        setSelectedDeviceIds(selectedDeviceIds.filter(x => x !== id));
      } else {
        setSelectedDeviceIds([...selectedDeviceIds, id]);
      }
    }
  };

  const togglePageSelection = () => {
    const pageIds = paginatedDevices.map(d => d.id);
    const isAllPageSelected = pageIds.length > 0 && pageIds.every(id => selectedDeviceIds.includes(id));
    if (isAllPageSelected || isAllSelectedGlobally) {
      setIsAllSelectedGlobally(false);
      setSelectedDeviceIds(selectedDeviceIds.filter(id => !pageIds.includes(id)));
    } else {
      const newSelected = [...selectedDeviceIds];
      pageIds.forEach(id => {
        if (!newSelected.includes(id)) {
          newSelected.push(id);
        }
      });
      setSelectedDeviceIds(newSelected);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedDeviceIds([]);
    setIsAllSelectedGlobally(false);
  }, [search, statusFilter, modelFilter, devices.length]);

  const sortedDevices = React.useMemo(() => {
    let result = [...devices];
    if (sortField) {
      result.sort((a, b) => {
        let valA = '';
        let valB = '';
        if (sortField === 'identifier') {
          valA = a.identifier;
          valB = b.identifier;
        } else if (sortField === 'type') {
          valA = a.type;
          valB = b.type;
        } else if (sortField === 'modelName') {
          valA = a.modelName;
          valB = b.modelName;
        } else if (sortField === 'status') {
          valA = a.status;
          valB = b.status;
        }
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [devices, sortField, sortDirection]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedDevices = sortedDevices.slice(startIndex, endIndex);
  const totalPages = Math.ceil(sortedDevices.length / pageSize);

  // React Hook Form for Single Entry
  const { register, handleSubmit, watch, setValue, control, formState: { errors }, reset, setError } = useForm({
    resolver: zodResolver(createSingleSchema(models)),
    defaultValues: {
      identifier: '',
      modelId: '',
      meta1: '',
      meta2: ''
    }
  });

  const selectedModelId = watch('modelId');
  
  // Bulk Ingestion state
  const [bulkSelectedModelId, setBulkSelectedModelId] = useState('');
  const [bulkIngestList, setBulkIngestList] = useState<IngestItem[]>([]);
  const [scanInputText, setScanInputText] = useState('');
  const [bulkIngestError, setBulkIngestError] = useState('');
  const [duplicateCountAlert, setDuplicateCountAlert] = useState<number>(0);
  const [patternCountAlert, setPatternCountAlert] = useState<number>(0);

  // Bulk Linking state
  const [linkPairs, setLinkPairs] = useState<ParsedLink[]>([]);
  const [primaryScan, setPrimaryScan] = useState('');
  const [childScan, setChildScan] = useState('');
  const [linkError, setLinkError] = useState('');

  const scanIngestInputRef = useRef<HTMLInputElement>(null);
  const scanLinkPrimaryRef = useRef<HTMLInputElement>(null);
  const scanLinkChildRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDevices();
    fetchModels();
    fetchRelationships();
  }, [search, statusFilter, modelFilter]);

  // -- GLOBAL KEYBOARD SCANNER LISTENER WEDGE --
  const handleGlobalBarcodeScanned = (barcode: string) => {
    if (activeModal === 'single') {
      setValue('identifier', barcode);
      playSuccessBeep();
    } else if (activeModal === 'bulk') {
      if (bulkSubTab === 'ingest') {
        processIngestionList([{ identifier: barcode, metadata: {} }]);
      } else if (bulkSubTab === 'link') {
        if (!primaryScan) {
          setPrimaryScan(barcode);
          playChirp();
        } else {
          setChildScan(barcode);
          triggerManualLinkScanWithParams(primaryScan, barcode);
        }
      }
    } else {
      playChirp();
      setActiveModal('bulk');
      setBulkSubTab('ingest');
      processIngestionList([{ identifier: barcode, metadata: {} }]);
    }
  };

  const handleGlobalBarcodeScannedRef = useRef(handleGlobalBarcodeScanned);
  useEffect(() => {
    handleGlobalBarcodeScannedRef.current = handleGlobalBarcodeScanned;
  });

  useEffect(() => {
    let accumulatedKeys = '';
    let lastKeyTime = Date.now();

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      const now = Date.now();
      const delay = now - lastKeyTime;
      lastKeyTime = now;

      // Enter key marks termination of a barcode scanner payload
      if (e.key === 'Enter') {
        if (accumulatedKeys.length >= 3) {
          handleGlobalBarcodeScannedRef.current(accumulatedKeys.trim());
          accumulatedKeys = '';
          e.preventDefault();
        } else {
          accumulatedKeys = '';
        }
        return;
      }

      if (e.key.length > 1) return;

      // Wedge scanner types extremely fast (<35ms). Slow input is from a human typing.
      if (delay > 35 && isInput) {
        accumulatedKeys = '';
        return;
      }

      accumulatedKeys += e.key;
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // -- OFFLINE BUFFER EFFECTS & UTILITIES --
  const syncPendingItems = async (itemsToSync?: any[]) => {
    const items = itemsToSync || pendingSyncItems;
    if (items.length === 0) return;

    try {
      const res = await fetch('http://localhost:3002/api/devices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: items })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.removeItem('ims_pending_sync');
        setPendingSyncItems([]);
        playSuccessBeep();
        fetchDevices();
      } else {
        throw new Error(data.error || 'Server validation failed during sync');
      }
    } catch (e) {
      console.error('Failed to sync queue:', e);
      playErrorBuzz();
    }
  };

  const bufferPendingSync = (payload: any[]) => {
    const stored = localStorage.getItem('ims_pending_sync');
    let existing: any[] = [];
    if (stored) {
      try {
        existing = JSON.parse(stored);
      } catch (e) {
        console.error(e);
      }
    }
    const merged = [...existing, ...payload];
    // De-duplicate by identifier
    const uniqueMerged = merged.filter((item, idx, self) =>
      self.findIndex(t => t.identifier === item.identifier) === idx
    );
    localStorage.setItem('ims_pending_sync', JSON.stringify(uniqueMerged));
    setPendingSyncItems(uniqueMerged);
    playChirp();
  };

  useEffect(() => {
    // Load pending queue from local storage
    const stored = localStorage.getItem('ims_pending_sync');
    if (stored) {
      try {
        setPendingSyncItems(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when online
      const latestStored = localStorage.getItem('ims_pending_sync');
      if (latestStored) {
        try {
          const items = JSON.parse(latestStored);
          if (items && items.length > 0) {
            syncPendingItems(items);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // -- DETAILS TAB & AUDIT LOG EFFECTS --
  useEffect(() => {
    if (viewModalDevice && deviceDetailTab === 'activity') {
      const fetchAuditLogs = async () => {
        setIsAuditLogsLoading(true);
        try {
          const res = await fetch(`http://localhost:3002/api/devices/${viewModalDevice.id}/audit-logs`);
          if (res.ok) {
            const data = await res.json();
            setAuditLogs(data);
          } else {
            console.error('Failed to fetch audit logs');
          }
        } catch (err) {
          console.error('Error fetching audit logs:', err);
        } finally {
          setIsAuditLogsLoading(false);
        }
      };
      fetchAuditLogs();
    }
  }, [viewModalDevice?.id, deviceDetailTab]);

  useEffect(() => {
    if (!viewModalDevice) {
      setDeviceDetailTab('info');
      setAuditLogs([]);
    }
  }, [viewModalDevice]);

  useEffect(() => {
    if (activeModal === 'none') {
      setIsCsvMapping(false);
      setCsvHeaders([]);
      setCsvRows([]);
    }
  }, [activeModal]);

  const fetchDevices = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (modelFilter) params.append('modelId', modelFilter);

      const res = await fetch(`http://localhost:3002/api/devices?${params.toString()}`);
      const data = await res.json();
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/device-models');
      const data = await res.json();
      setModels(data);
      if (data.length > 0) {
        setValue('modelId', data[0].id);
        if (!bulkSelectedModelId) setBulkSelectedModelId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRelationships = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/device-links');
      const data = await res.json();
      setRelationships(data);
    } catch (e) {
      console.error(e);
    }
  };

  const getSelectedModelType = (id: string) => {
    const m = models.find(x => x.id === id);
    return m ? m.assetType : 'TRACKER';
  };

  // Create or Update Single Device via React Hook Form Submission
  const onSubmitSingle = async (values: any) => {
    // Real-time client-side regex check
    const selectedModel = models.find(m => m.id === values.modelId);
    if (selectedModel && selectedModel.identifierPattern) {
      try {
        const regex = new RegExp(selectedModel.identifierPattern, 'i');
        if (!regex.test(values.identifier)) {
          setError('identifier', { 
            type: 'manual', 
            message: `Barcode format mismatch. Expected pattern: ${selectedModel.identifierPattern}` 
          });
          playErrorBuzz();
          return;
        }
      } catch (e) {
        console.error('Invalid model pattern regex:', selectedModel.identifierPattern);
      }
    }

    const type = getSelectedModelType(values.modelId);
    const metadata: Record<string, any> = {};
    
    if (type === 'SIM') {
      metadata.phoneNumber = values.meta1;
      metadata.carrier = values.meta2;
    } else if (type === 'SD_CARD') {
      metadata.capacity = values.meta1;
      metadata.speedClass = values.meta2;
    } else if (type === 'TRACKER') {
      metadata.firmware = values.meta1;
      metadata.hwRevision = values.meta2;
    } else if (type === 'PANIC_BUTTON') {
      metadata.rfFrequency = values.meta1;
      metadata.buttonColor = values.meta2;
    }

    try {
      const url = editingDeviceId 
        ? `http://localhost:3002/api/devices/${editingDeviceId}` 
        : 'http://localhost:3002/api/devices';
      const method = editingDeviceId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: values.identifier,
          modelId: values.modelId,
          status: 'IN_STOCK',
          metadata
        })
      });
      const data = await res.json();
      if (data.error) {
        setError('identifier', { type: 'manual', message: data.error });
        playErrorBuzz();
        return;
      }
      reset({
        identifier: '',
        modelId: models[0]?.id || '',
        meta1: '',
        meta2: ''
      });
      setEditingDeviceId(null);
      setActiveModal('none');
      playSuccessBeep();
      fetchDevices();
    } catch (e) {
      setError('root', { type: 'manual', message: 'Failed to connect to API server.' });
      playErrorBuzz();
    }
  };

  const handleOpenEditModal = (device: Device) => {
    setEditingDeviceId(device.id);
    setValue('identifier', device.identifier);
    setValue('modelId', device.modelId);
    
    if (device.type === 'SIM') {
      setValue('meta1', device.metadata?.phoneNumber || '');
      setValue('meta2', device.metadata?.carrier || '');
    } else if (device.type === 'SD_CARD') {
      setValue('meta1', device.metadata?.capacity || '');
      setValue('meta2', device.metadata?.speedClass || '');
    } else if (device.type === 'TRACKER') {
      setValue('meta1', device.metadata?.firmware || '');
      setValue('meta2', device.metadata?.hwRevision || '');
    } else if (device.type === 'PANIC_BUTTON') {
      setValue('meta1', device.metadata?.rfFrequency || '');
      setValue('meta2', device.metadata?.buttonColor || '');
    } else {
      setValue('meta1', '');
      setValue('meta2', '');
    }
    setActiveModal('single');
  };

  // Delete device
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    try {
      const res = await fetch(`http://localhost:3002/api/devices/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        playSuccessBeep();
        fetchDevices();
      } else {
        playErrorBuzz();
      }
    } catch (e) {
      playErrorBuzz();
    }
  };

  // Parse CSV for Ingestion & Transition to Column Mapper
  const handleIngestCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setDuplicateCountAlert(0);
    setPatternCountAlert(0);
    setBulkIngestError('');
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/[\r\n]+/).map(s => s.trim()).filter(s => s.length > 0);
      if (lines.length === 0) {
        setBulkIngestError('The selected CSV file is empty.');
        playErrorBuzz();
        return;
      }

      // Parse headers from first line
      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      
      // Parse rest of the lines
      const rows = lines.slice(1).map(line => 
        line.split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''))
      ).filter(row => row.length > 0 && row.some(cell => cell.length > 0));

      if (rows.length === 0) {
        setBulkIngestError('No data rows found in the CSV file.');
        playErrorBuzz();
        return;
      }

      setCsvHeaders(headers);
      setCsvRows(rows);
      setIsCsvMapping(true);
      playChirp();

      // Pre-populate mapping fields with best-guess defaults
      setCsvMappings({
        identifier: headers[0] || '',
        meta1: headers[1] || '__none__',
        meta2: headers[2] || '__none__'
      });
    };
    reader.readAsText(e.target.files[0]);
    e.target.value = '';
  };

  const handleCommitCsvMapping = () => {
    if (!csvMappings.identifier) {
      setBulkIngestError('Identifier / Serial mapping is required.');
      playErrorBuzz();
      return;
    }

    const idIndex = csvHeaders.indexOf(csvMappings.identifier);
    const meta1Index = csvMappings.meta1 && csvMappings.meta1 !== '__none__' ? csvHeaders.indexOf(csvMappings.meta1) : -1;
    const meta2Index = csvMappings.meta2 && csvMappings.meta2 !== '__none__' ? csvHeaders.indexOf(csvMappings.meta2) : -1;

    const targetType = getSelectedModelType(bulkSelectedModelId);

    const parsedItems = csvRows.map(row => {
      const serial = idIndex !== -1 ? row[idIndex] || '' : '';
      const meta1 = meta1Index !== -1 ? row[meta1Index] || '' : '';
      const meta2 = meta2Index !== -1 ? row[meta2Index] || '' : '';

      const metadata: Record<string, any> = {};
      if (serial) {
        if (targetType === 'SIM') {
          metadata.phoneNumber = meta1;
          metadata.carrier = meta2;
        } else if (targetType === 'SD_CARD') {
          metadata.capacity = meta1;
          metadata.speedClass = meta2;
        } else if (targetType === 'TRACKER') {
          metadata.firmware = meta1;
          metadata.hwRevision = meta2;
        } else if (targetType === 'PANIC_BUTTON') {
          metadata.rfFrequency = meta1;
          metadata.buttonColor = meta2;
        }
      }
      return { identifier: serial, metadata };
    }).filter(p => p.identifier.length > 0);

    processIngestionList(parsedItems);
    
    // Reset wizard state
    setIsCsvMapping(false);
    setCsvHeaders([]);
    setCsvRows([]);
    playSuccessBeep();
  };

  const getMappedPreviewRows = () => {
    const idIndex = csvHeaders.indexOf(csvMappings.identifier);
    const meta1Index = csvMappings.meta1 && csvMappings.meta1 !== '__none__' ? csvHeaders.indexOf(csvMappings.meta1) : -1;
    const meta2Index = csvMappings.meta2 && csvMappings.meta2 !== '__none__' ? csvHeaders.indexOf(csvMappings.meta2) : -1;

    return csvRows.slice(0, 3).map(row => {
      const idValue = idIndex !== -1 ? row[idIndex] || '' : '';
      const meta1Value = meta1Index !== -1 ? row[meta1Index] || '' : '';
      const meta2Value = meta2Index !== -1 ? row[meta2Index] || '' : '';

      return {
        identifier: idValue,
        meta1: meta1Value,
        meta2: meta2Value
      };
    });
  };

  // Dedup and add lists of prepared ingestion items
  const processIngestionList = (list: IngestItem[]) => {
    // 1. Filter out items that do not match the selected model's barcode pattern template
    const selectedModel = models.find(m => m.id === bulkSelectedModelId);
    let invalidPatternCount = 0;
    let patternMatchedList = list;

    if (selectedModel && selectedModel.identifierPattern) {
      try {
        const regex = new RegExp(selectedModel.identifierPattern, 'i');
        patternMatchedList = list.filter(item => {
          const isValid = regex.test(item.identifier);
          if (!isValid) {
            invalidPatternCount++;
          }
          return isValid;
        });
      } catch (e) {
        console.error('Invalid model pattern regex:', selectedModel.identifierPattern);
      }
    }

    const uniqueIdentifiers = [...new Set(patternMatchedList.map(x => x.identifier))];
    const duplicatesInBatch = patternMatchedList.length - uniqueIdentifiers.length;

    const existingIdentifiers = devices.map(d => d.identifier);
    const currentPreparedIdentifiers = bulkIngestList.map(b => b.identifier);

    const finalUniqueList = patternMatchedList.filter((item, idx, self) => 
      self.findIndex(t => t.identifier === item.identifier) === idx &&
      !existingIdentifiers.includes(item.identifier) &&
      !currentPreparedIdentifiers.includes(item.identifier)
    );

    const duplicatesInDb = patternMatchedList.length - finalUniqueList.length;
    const totalFiltered = duplicatesInBatch + duplicatesInDb;

    if (invalidPatternCount > 0) {
      setPatternCountAlert(prev => prev + invalidPatternCount);
      playErrorBuzz();
    }

    if (totalFiltered > 0) {
      setDuplicateCountAlert(prev => prev + totalFiltered);
      playErrorBuzz();
    }

    if (finalUniqueList.length > 0) {
      setBulkIngestList(prev => [...finalUniqueList, ...prev]);
      playSuccessBeep();
    }
  };

  // Execute Bulk Ingestion commit (with local storage fallback)
  const handleBulkIngestSubmit = async () => {
    if (bulkIngestList.length === 0 || !bulkSelectedModelId) {
      setBulkIngestError('Please scan devices or upload a CSV first.');
      playErrorBuzz();
      return;
    }

    const payload = bulkIngestList.map(item => ({
      identifier: item.identifier,
      modelId: bulkSelectedModelId,
      status: 'IN_STOCK',
      metadata: item.metadata,
      type: bulkAssetType
    }));

    if (!isOnline) {
      bufferPendingSync(payload);
      setBulkIngestList([]);
      setDuplicateCountAlert(0);
      setPatternCountAlert(0);
      setActiveModal('none');
      return;
    }

    try {
      const res = await fetch('http://localhost:3002/api/devices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: payload })
      });
      
      if (!res.ok) {
        throw new Error('Server returned non-ok status');
      }

      const data = await res.json();
      if (data.success) {
        setBulkIngestList([]);
        setDuplicateCountAlert(0);
        setPatternCountAlert(0);
        setActiveModal('none');
        playSuccessBeep();
        fetchDevices();
      } else {
        bufferPendingSync(payload);
        setBulkIngestList([]);
        setDuplicateCountAlert(0);
        setPatternCountAlert(0);
        setActiveModal('none');
      }
    } catch (e) {
      bufferPendingSync(payload);
      setBulkIngestList([]);
      setDuplicateCountAlert(0);
      setPatternCountAlert(0);
      setActiveModal('none');
    }
  };

  // Scanner listener inside Ingestion Modal
  const handleIngestScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = scanInputText.trim();
      if (val) {
        processIngestionList([{ identifier: val, metadata: {} }]);
      }
      setScanInputText('');
    }
  };

  // Update specific metadata on bulk ingestion item
  const handleUpdateItemMeta = (index: number, key: string, value: string) => {
    setBulkIngestList(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        metadata: {
          ...copy[index].metadata,
          [key]: value
        }
      };
      return copy;
    });
  };

  // Parse CSV for Linking
  const handleLinkCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/[\r\n]+/).map(s => s.trim()).filter(s => s.length > 0);
      const links = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        return { primaryISN: parts[0] || '', childISN: parts[1] || '' };
      }).filter(pair => pair.primaryISN && pair.childISN);

      try {
        const res = await fetch('http://localhost:3002/api/device-links/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links })
        });
        const data = await res.json();
        setLinkPairs(data);
        if (data.some((d: any) => d.status === 'invalid')) {
          playErrorBuzz();
        } else {
          playSuccessBeep();
        }
      } catch (err) {
        setLinkError('Failed to preview CSV relationships.');
        playErrorBuzz();
      }
    };
    reader.readAsText(e.target.files[0]);
  };

  // Trigger link scan with explicit variables
  const triggerManualLinkScanWithParams = async (pScan: string, cScan: string) => {
    setLinkError('');
    try {
      const res = await fetch('http://localhost:3002/api/device-links/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: [{ primaryISN: pScan, childISN: cScan }] })
      });
      const data = await res.json();
      if (data && data[0]) {
        setLinkPairs(prev => [data[0], ...prev]);
        setPrimaryScan('');
        setChildScan('');
        
        if (data[0].status === 'invalid') {
          playErrorBuzz();
        } else {
          playSuccessBeep();
        }
        
        scanLinkPrimaryRef.current?.focus();
      }
    } catch (e) {
      setLinkError('Failed to validate connection.');
      playErrorBuzz();
    }
  };

  const triggerManualLinkScan = () => {
    triggerManualLinkScanWithParams(primaryScan, childScan);
  };

  // Execute link relationships commit
  const handleLinkCommit = async () => {
    const valid = linkPairs.filter(p => p.status === 'valid').map(p => ({
      primaryISN: p.primaryISN,
      childISN: p.childISN
    }));

    if (valid.length === 0) {
      setLinkError('No valid links to commit.');
      playErrorBuzz();
      return;
    }

    try {
      const res = await fetch('http://localhost:3002/api/device-links/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ links: valid })
      });
      const data = await res.json();
      if (data.success) {
        setLinkPairs([]);
        setActiveModal('none');
        playSuccessBeep();
        fetchDevices();
      } else {
        playErrorBuzz();
      }
    } catch (e) {
      setLinkError('Failed to commit relationships.');
      playErrorBuzz();
    }
  };

  const openBulkModal = () => {
    setBulkIngestList([]);
    setLinkPairs([]);
    setBulkIngestError('');
    setLinkError('');
    setDuplicateCountAlert(0);
    setPatternCountAlert(0);
    setActiveModal('bulk');
  };

  const singleAssetType = getSelectedModelType(selectedModelId);
  const bulkAssetType = getSelectedModelType(bulkSelectedModelId);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 w-full">
        {!isOnline && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-500 rounded-lg p-3 px-4 flex items-center gap-2 text-xs font-medium animate-in fade-in duration-200">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            <span>Connection Offline: Operations will be cached locally until internet connectivity is restored.</span>
          </div>
        )}

        {pendingSyncItems.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 rounded-lg p-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-medium animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0" />
              <span>
                Offline Sync: You have <strong>{pendingSyncItems.length}</strong> pending ingestion item(s) buffered locally in queue {isOnline ? "(Ready to Sync)" : "(Currently Offline)"}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => syncPendingItems()}
              disabled={!isOnline}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white dark:text-black shadow h-8 px-3.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              Sync Queue
            </button>
          </div>
        )}
        
        {/* Header & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Device Inventory</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage tracking hardware, SIMs, and peripherals.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1.5 rounded-md border border-border">
              <Volume2 className="h-3.5 w-3.5" />
              <span>Synth Audio feedback active</span>
            </div>
            <button 
              onClick={openBulkModal}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
            >
              <Upload className="mr-2 h-4 w-4" /> Bulk Operations
            </button>
            <button 
              onClick={() => { 
                setEditingDeviceId(null);
                reset({
                  identifier: '',
                  modelId: models[0]?.id || '',
                  meta1: '',
                  meta2: ''
                });
                setActiveModal('single'); 
              }}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
            >
              <Plus className="mr-2 h-4 w-4" /> Single Entry
            </button>
          </div>
        </div>

        {/* 1. Modal Dialog: Single Entry (React Hook Form + Zod) */}
        {activeModal === 'single' && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setActiveModal('none'); setEditingDeviceId(null); }}
          >
            <div 
              className="border border-border p-6 rounded-lg bg-card shadow-lg max-w-md w-full relative space-y-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => { setActiveModal('none'); setEditingDeviceId(null); }} 
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-semibold tracking-tight">{editingDeviceId ? 'Edit Device Properties' : 'Add Single Device'}</h3>
              
              {errors.root && (
                <div className="bg-destructive/10 text-destructive text-xs p-2.5 rounded border border-destructive/20 font-medium">
                  {errors.root.message}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmitSingle)} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">ISN / IMEI / ICCID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. TRK-982103"
                    {...register('identifier')}
                    className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                      errors.identifier ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                    }`}
                  />
                  {errors.identifier && (
                    <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.identifier.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Device Model Template</label>
                  <Controller
                    control={control}
                    name="modelId"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <SelectTrigger className={`w-full text-sm h-9 bg-card ${errors.modelId ? 'border-destructive focus:ring-destructive' : ''}`}>
                          <SelectValue placeholder="Select a model..." />
                        </SelectTrigger>
                        <SelectContent>
                          {models.map(m => (
                            <SelectItem key={m.id} value={m.id}>{m.name} ({m.brand})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.modelId && (
                    <p className="text-[10px] text-destructive mt-1 font-semibold">{errors.modelId.message}</p>
                  )}
                </div>

                {/* Dynamic Polymorphic Metadata Fields validated dynamically via Zod superRefine */}
                {singleAssetType === 'SIM' && (
                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone Number (MSISDN)</label>
                      <input 
                        type="text" 
                        placeholder="+1 (868) 555-0199"
                        {...register('meta1')}
                        className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                          errors.meta1 ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                        }`}
                      />
                      {errors.meta1 && (
                        <p className="text-[9px] text-destructive mt-1 font-semibold">{errors.meta1.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Network Carrier</label>
                      <input 
                        type="text" 
                        placeholder="e.g. KORE Wireless"
                        {...register('meta2')}
                        className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                          errors.meta2 ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                        }`}
                      />
                      {errors.meta2 && (
                        <p className="text-[9px] text-destructive mt-1 font-semibold">{errors.meta2.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {singleAssetType === 'TRACKER' && (
                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Firmware Version</label>
                      <input 
                        type="text" 
                        placeholder="e.g. v1.2.9"
                        {...register('meta1')}
                        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Hardware Revision</label>
                      <input 
                        type="text" 
                        placeholder="e.g. REV_C"
                        {...register('meta2')}
                        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
                      />
                    </div>
                  </div>
                )}

                {singleAssetType === 'SD_CARD' && (
                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Storage Capacity</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 32GB"
                        {...register('meta1')}
                        className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                          errors.meta1 ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                        }`}
                      />
                      {errors.meta1 && (
                        <p className="text-[9px] text-destructive mt-1 font-semibold">{errors.meta1.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Speed Class</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Class 10 / U3"
                        {...register('meta2')}
                        className={`flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                          errors.meta2 ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
                        }`}
                      />
                      {errors.meta2 && (
                        <p className="text-[9px] text-destructive mt-1 font-semibold">{errors.meta2.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {singleAssetType === 'PANIC_BUTTON' && (
                  <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">RF Frequency</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 433 MHz"
                        {...register('meta1')}
                        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Button Color</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Red"
                        {...register('meta2')}
                        className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <button 
                    type="button" 
                    onClick={() => setActiveModal('none')}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4"
                  >
                    {editingDeviceId ? 'Save Changes' : 'Add Device'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Unified Modal: Bulk Operations */}
        {activeModal === 'bulk' && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setActiveModal('none')}
          >
            <div 
              className="border border-border rounded-lg bg-card shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setActiveModal('none')} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10">
                <X className="h-4 w-4" />
              </button>

              <div className="p-6 pb-0 flex flex-col gap-4">
                {/* Tab Switcher */}
                <div className="flex border-b border-border pb-2 gap-4">
                  <button 
                    onClick={() => setBulkSubTab('ingest')}
                    className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${bulkSubTab === 'ingest' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    Bulk Ingestion
                  </button>
                  <button 
                    onClick={() => setBulkSubTab('link')}
                    className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${bulkSubTab === 'link' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                  >
                    Polymorphic Linking
                  </button>
                </div>
              </div>

              {/* Scrollable Content Area */}
              <ScrollArea className="flex-1 p-6 pt-4">
                <div className="space-y-6">
                {/* TAB CONTENT: Bulk Ingestion */}
                {bulkSubTab === 'ingest' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">Mass Inventory Ingestion</h3>
                      <p className="text-[11px] text-muted-foreground">Upload serial numbers or scan barcode tags to register new hardware into inventory.</p>
                    </div>

                    {bulkIngestError && (
                      <div className="bg-destructive/10 text-destructive text-xs p-2.5 rounded border border-destructive/20 font-medium">
                        {bulkIngestError}
                      </div>
                    )}

                    {duplicateCountAlert > 0 && (
                      <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30 text-amber-800 dark:text-amber-500 text-xs p-2.5 rounded-lg flex items-center justify-between font-medium">
                        <div className="flex items-center gap-2">
                          <Info className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0" />
                          <span>Filtered out {duplicateCountAlert} duplicate entries (already registered or in current list).</span>
                        </div>
                        <button onClick={() => { setDuplicateCountAlert(0); }} className="text-[10px] underline hover:no-underline font-semibold ml-4">
                          Dismiss
                        </button>
                      </div>
                    )}

                    {patternCountAlert > 0 && (
                      <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-800 dark:text-rose-500 text-xs p-2.5 rounded-lg flex items-center justify-between font-medium animate-pulse">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-500 shrink-0" />
                          <span>Filtered out {patternCountAlert} barcode(s) due to format mismatch with model pattern.</span>
                        </div>
                        <button onClick={() => setPatternCountAlert(0)} className="text-[10px] underline hover:no-underline font-semibold ml-4">
                          Dismiss
                        </button>
                      </div>
                    )}

                    {isCsvMapping ? (
                      /* STRIPE-STYLE COLUMN MAPPER WIZARD */
                      <div className="space-y-6 border border-border p-5 rounded-lg bg-muted/5">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="text-sm font-semibold text-foreground">CSV Column Import Wizard</h4>
                            <p className="text-xs text-muted-foreground">Map your CSV column headers to the target model's database schema attributes.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCsvMapping(false);
                              setCsvHeaders([]);
                              setCsvRows([]);
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground font-semibold underline"
                          >
                            Cancel Mapping
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Mapping Identifier */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground block">
                              Identifier / Serial <span className="text-destructive">*</span>
                            </label>
                            <Select
                              value={csvMappings.identifier}
                              onValueChange={(val) => setCsvMappings(prev => ({ ...prev, identifier: val }))}
                            >
                              <SelectTrigger className="w-full text-xs h-9 bg-card">
                                <SelectValue placeholder="Select identifier column" />
                              </SelectTrigger>
                              <SelectContent>
                                {csvHeaders.map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Mapping Meta 1 */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground block">
                              {bulkAssetType === 'SIM' ? 'Phone Number (MSISDN)' :
                               bulkAssetType === 'SD_CARD' ? 'Storage Capacity' :
                               bulkAssetType === 'TRACKER' ? 'Firmware Version' :
                               bulkAssetType === 'PANIC_BUTTON' ? 'RF Frequency' : 'Metadata Field 1'} (Optional)
                            </label>
                            <Select
                              value={csvMappings.meta1}
                              onValueChange={(val) => setCsvMappings(prev => ({ ...prev, meta1: val }))}
                            >
                              <SelectTrigger className="w-full text-xs h-9 bg-card">
                                <SelectValue placeholder="Select column (or none)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">-- None --</SelectItem>
                                {csvHeaders.map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Mapping Meta 2 */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground block">
                              {bulkAssetType === 'SIM' ? 'Network Carrier' :
                               bulkAssetType === 'SD_CARD' ? 'Speed Class' :
                               bulkAssetType === 'TRACKER' ? 'Hardware Revision' :
                               bulkAssetType === 'PANIC_BUTTON' ? 'Button Color' : 'Metadata Field 2'} (Optional)
                            </label>
                            <Select
                              value={csvMappings.meta2}
                              onValueChange={(val) => setCsvMappings(prev => ({ ...prev, meta2: val }))}
                            >
                              <SelectTrigger className="w-full text-xs h-9 bg-card">
                                <SelectValue placeholder="Select column (or none)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">-- None --</SelectItem>
                                {csvHeaders.map(h => (
                                  <SelectItem key={h} value={h}>{h}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Preview Section */}
                        <div className="space-y-2">
                          <div className="text-xs font-semibold text-muted-foreground">Preview Mapped Data (First 3 rows)</div>
                          <div className="border border-border rounded-lg bg-card overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="px-3 text-[10px] font-semibold text-muted-foreground uppercase">Identifier / Serial</TableHead>
                                  <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">
                                    {bulkAssetType === 'SIM' ? 'Phone Number' :
                                     bulkAssetType === 'SD_CARD' ? 'Capacity' :
                                     bulkAssetType === 'TRACKER' ? 'Firmware' :
                                     bulkAssetType === 'PANIC_BUTTON' ? 'RF Freq' : 'Meta 1'}
                                  </TableHead>
                                  <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">
                                    {bulkAssetType === 'SIM' ? 'Carrier' :
                                     bulkAssetType === 'SD_CARD' ? 'Speed' :
                                     bulkAssetType === 'TRACKER' ? 'HW Rev' :
                                     bulkAssetType === 'PANIC_BUTTON' ? 'Color' : 'Meta 2'}
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody className="font-mono">
                                {getMappedPreviewRows().map((row, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell className="px-3 text-foreground font-semibold">{row.identifier || <span className="text-muted-foreground italic">empty</span>}</TableCell>
                                    <TableCell className="text-foreground">{row.meta1 || <span className="text-muted-foreground italic">-</span>}</TableCell>
                                    <TableCell className="text-foreground">{row.meta2 || <span className="text-muted-foreground italic">-</span>}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCsvMapping(false);
                              setCsvHeaders([]);
                              setCsvRows([]);
                            }}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
                          >
                            Cancel Mapping
                          </button>
                          <button
                            type="button"
                            onClick={handleCommitCsvMapping}
                            disabled={!csvMappings.identifier}
                            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                          >
                            Commit Ingestion
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1">
                          <div>
                            <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Template Model</label>
                            <Select 
                              value={bulkSelectedModelId}
                              onValueChange={(val) => {
                                setBulkSelectedModelId(val);
                                setBulkIngestList([]);
                                setDuplicateCountAlert(0);
                                setPatternCountAlert(0);
                              }}
                            >
                              <SelectTrigger className="w-full text-sm h-9 bg-card">
                                <SelectValue placeholder="Select a model..." />
                              </SelectTrigger>
                              <SelectContent>
                                {models.map(m => (
                                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.brand})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border border-border/80 rounded-lg p-4 bg-muted/10 flex flex-col justify-between space-y-4">
                            <div className="text-center">
                              <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                              <h4 className="text-xs font-semibold">CSV List Upload</h4>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Drop a CSV file. Headers will be mapped dynamically.</p>
                            </div>
                            <label className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 cursor-pointer">
                              Browse CSV File
                              <input type="file" className="hidden" accept=".csv" onChange={handleIngestCSVUpload} />
                            </label>
                          </div>

                          <div className="border border-border/80 rounded-lg p-4 bg-muted/10 space-y-3">
                            <div className="flex items-center gap-1.5 text-primary">
                              <Scan className="h-4 w-4 animate-pulse" />
                              <h4 className="text-xs font-semibold">Rapid Physical Scanner</h4>
                            </div>
                            <input 
                              ref={scanIngestInputRef}
                              type="text"
                              placeholder="Focus & scan barcode strap-on..."
                              value={scanInputText}
                              onChange={(e) => setScanInputText(e.target.value)}
                              onKeyDown={handleIngestScanKeyDown}
                              className="flex h-9 w-full rounded-md border border-primary bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/20 tracking-mono font-medium"
                              autoFocus
                            />
                            <p className="text-[10px] text-muted-foreground">Duplicates are automatically parsed out.</p>
                          </div>
                        </div>

                        {/* Reactive Form Ingestion Table */}
                        <div className="border border-border rounded-lg bg-card overflow-hidden">
                          <div className="bg-muted/40 p-2.5 px-4 text-xs font-semibold text-muted-foreground flex justify-between items-center border-b border-border sticky top-0 z-10">
                            <span>Prepared Ingestion Table ({bulkIngestList.length})</span>
                            {bulkIngestList.length > 0 && (
                              <button 
                                onClick={() => { setBulkIngestList([]); setDuplicateCountAlert(0); setPatternCountAlert(0); }}
                                className="text-[10px] text-destructive hover:underline font-semibold"
                              >
                                Clear List
                              </button>
                            )}
                          </div>

                          <div className="overflow-x-auto">
                            {bulkIngestList.length > 0 ? (
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-card hover:bg-transparent">
                                    <TableHead className="px-4 text-[10px] font-semibold text-muted-foreground uppercase">Serial / ISN</TableHead>

                                    {/* Dynamic headers depending on asset type */}
                                    {bulkAssetType === 'SIM' && (
                                      <>
                                        <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">Phone Number (MSISDN)</TableHead>
                                        <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">Carrier</TableHead>
                                      </>
                                    )}
                                    {bulkAssetType === 'TRACKER' && (
                                      <>
                                        <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">Firmware</TableHead>
                                        <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">HW Revision</TableHead>
                                      </>
                                    )}
                                    {bulkAssetType === 'SD_CARD' && (
                                      <>
                                        <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">Capacity</TableHead>
                                        <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">Speed Class</TableHead>
                                      </>
                                    )}
                                    {bulkAssetType === 'PANIC_BUTTON' && (
                                      <>
                                        <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">RF Frequency</TableHead>
                                        <TableHead className="px-2 text-[10px] font-semibold text-muted-foreground uppercase">Color</TableHead>
                                      </>
                                    )}

                                    <TableHead className="px-2 text-right text-[10px] font-semibold text-muted-foreground uppercase">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody className="font-mono">
                                  {bulkIngestList.map((item, idx) => (
                                    <TableRow key={idx} className="hover:bg-muted/30 transition-colors">
                                      <TableCell className="px-4 font-medium tracking-mono text-xs">{item.identifier}</TableCell>

                                      {bulkAssetType === 'SIM' && (
                                        <>
                                          <TableCell className="p-1">
                                            <input 
                                              type="text" 
                                              placeholder="Phone number" 
                                              value={item.metadata.phoneNumber || ''} 
                                              onChange={(e) => handleUpdateItemMeta(idx, 'phoneNumber', e.target.value)}
                                              className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                            />
                                          </TableCell>
                                          <TableCell className="p-1">
                                            <input 
                                              type="text" 
                                              placeholder="Carrier" 
                                              value={item.metadata.carrier || ''} 
                                              onChange={(e) => handleUpdateItemMeta(idx, 'carrier', e.target.value)}
                                              className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                            />
                                          </TableCell>
                                        </>
                                      )}

                                      {bulkAssetType === 'TRACKER' && (
                                        <>
                                          <TableCell className="p-1">
                                            <input 
                                              type="text" 
                                              placeholder="e.g. v1.2" 
                                              value={item.metadata.firmware || ''} 
                                              onChange={(e) => handleUpdateItemMeta(idx, 'firmware', e.target.value)}
                                              className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                            />
                                          </TableCell>
                                          <TableCell className="p-1">
                                            <input 
                                              type="text" 
                                              placeholder="e.g. REV_A" 
                                              value={item.metadata.hwRevision || ''} 
                                              onChange={(e) => handleUpdateItemMeta(idx, 'hwRevision', e.target.value)}
                                              className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                            />
                                          </TableCell>
                                        </>
                                      )}

                                      {bulkAssetType === 'SD_CARD' && (
                                        <>
                                          <TableCell className="p-1">
                                            <input 
                                              type="text" 
                                              placeholder="e.g. 64GB" 
                                              value={item.metadata.capacity || ''} 
                                              onChange={(e) => handleUpdateItemMeta(idx, 'capacity', e.target.value)}
                                              className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                            />
                                          </TableCell>
                                          <TableCell className="p-1">
                                            <input 
                                              type="text" 
                                              placeholder="e.g. U3" 
                                              value={item.metadata.speedClass || ''} 
                                              onChange={(e) => handleUpdateItemMeta(idx, 'speedClass', e.target.value)}
                                              className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                            />
                                          </TableCell>
                                        </>
                                      )}

                                      {bulkAssetType === 'PANIC_BUTTON' && (
                                        <>
                                          <TableCell className="p-1">
                                            <input 
                                              type="text" 
                                              placeholder="e.g. 433MHz" 
                                              value={item.metadata.rfFrequency || ''} 
                                              onChange={(e) => handleUpdateItemMeta(idx, 'rfFrequency', e.target.value)}
                                              className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                            />
                                          </TableCell>
                                          <TableCell className="p-1">
                                            <input 
                                              type="text" 
                                              placeholder="e.g. Red" 
                                              value={item.metadata.buttonColor || ''} 
                                              onChange={(e) => handleUpdateItemMeta(idx, 'buttonColor', e.target.value)}
                                              className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                            />
                                          </TableCell>
                                        </>
                                      )}

                                      <TableCell className="px-2 text-right">
                                        <button 
                                          onClick={() => setBulkIngestList(bulkIngestList.filter((_, i) => i !== idx))} 
                                          className="text-[10px] text-destructive hover:underline font-sans font-semibold"
                                        >
                                          Remove
                                        </button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            ) : (
                              <EmptyState
                                icon={Scan}
                                title="No devices prepared"
                                description="Scan barcodes or drop a CSV file to begin."
                              />
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* TAB CONTENT: Bulk Linking */}
                {bulkSubTab === 'link' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold">Polymorphic Linking Engine</h3>
                      <p className="text-[11px] text-muted-foreground">Establish links between trackers and secondary assets. Non-existent devices will be auto-created.</p>
                    </div>

                    {linkError && (
                      <div className="bg-destructive/10 text-destructive text-xs p-2.5 rounded border border-destructive/20 font-medium">
                        {linkError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border border-border/80 rounded-lg p-4 bg-muted/10 flex flex-col justify-between space-y-4">
                        <div className="text-center">
                          <FileSpreadsheet className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <h4 className="text-xs font-semibold">CSV Matrix Upload</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Drop a two-column CSV mapping primary to child device.</p>
                        </div>
                        <label className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-semibold border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 cursor-pointer">
                          Browse CSV File
                          <input type="file" className="hidden" accept=".csv" onChange={handleLinkCSVUpload} />
                        </label>
                      </div>

                      <div className="border border-border/80 rounded-lg p-4 bg-muted/10 space-y-3">
                        <div className="flex items-center gap-1.5 text-primary">
                          <Scan className="h-4 w-4 animate-pulse" />
                          <h4 className="text-xs font-semibold">Scan Pairing Input</h4>
                        </div>
                        <div className="space-y-2">
                          <input 
                            ref={scanLinkPrimaryRef}
                            type="text"
                            placeholder="Step 1: Scan Primary Tracker..."
                            value={primaryScan}
                            onChange={(e) => setPrimaryScan(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && scanLinkChildRef.current?.focus()}
                            className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring tracking-mono font-medium"
                          />
                          <input 
                            ref={scanLinkChildRef}
                            type="text"
                            placeholder="Step 2: Scan Child Asset (SIM/SD)..."
                            value={childScan}
                            onChange={(e) => setChildScan(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && triggerManualLinkScan()}
                            className="flex h-8 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring tracking-mono font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border border-border rounded-lg bg-card overflow-hidden">
                      <div className="bg-muted/40 p-2.5 px-4 text-xs font-semibold text-muted-foreground flex justify-between items-center border-b border-border sticky top-0 z-10">
                        <span>Prepared Relationships ({linkPairs.length})</span>
                        {linkPairs.length > 0 && (
                          <button 
                            onClick={() => setLinkPairs([])}
                            className="text-[10px] text-destructive hover:underline font-semibold"
                          >
                            Clear List
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-border font-mono">
                        {linkPairs.length > 0 ? (
                          linkPairs.map((pair, idx) => (
                            <div key={idx} className={`p-2.5 px-4 flex justify-between items-center text-xs transition-colors ${pair.status === 'invalid' ? 'bg-destructive/5' : 'hover:bg-muted/50'}`}>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold tracking-mono">{pair.primaryISN}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-semibold tracking-mono text-muted-foreground">{pair.childISN}</span>
                                <span className="bg-secondary text-secondary-foreground text-[9px] px-1.5 py-0.5 rounded font-semibold ml-2 font-sans">
                                  {pair.childType}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 font-sans">
                                {pair.message && (
                                  <span className="bg-amber-100/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-500 border border-amber-200/50 px-2 py-0.5 rounded text-[10px] font-semibold">
                                    {pair.message}
                                  </span>
                                )}
                                {pair.status === 'valid' ? (
                                  <span className="inline-flex items-center text-emerald-600 dark:text-emerald-500 font-medium text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Valid Link
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-destructive font-medium text-[11px]" title={pair.message}>
                                    <AlertCircle className="w-3.5 h-3.5 mr-1" /> Invalid
                                  </span>
                                )}
                                <button onClick={() => setLinkPairs(linkPairs.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState
                            icon={LinkIcon}
                            title="No relationships prepared"
                            description="Scan parent/child barcode pairs or upload a CSV schema mapping matrix."
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
                </div>
              </ScrollArea>

              {/* Fixed Footer */}
              {!isCsvMapping && (
                <div className="p-6 pt-4 border-t border-border flex gap-2 justify-end bg-card rounded-b-xl">
                  <button 
                    type="button" 
                    onClick={() => setActiveModal('none')}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
                  >
                    Cancel
                  </button>
                  {bulkSubTab === 'ingest' ? (
                    <button 
                      onClick={handleBulkIngestSubmit}
                      disabled={bulkIngestList.length === 0}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                    >
                      Commit Ingestion ({bulkIngestList.length})
                    </button>
                  ) : (
                    <button 
                      onClick={handleLinkCommit}
                      disabled={linkPairs.filter(p => p.status === 'valid').length === 0}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 disabled:opacity-50"
                    >
                      Commit Relationships ({linkPairs.filter(p => p.status === 'valid').length})
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Toolbar & Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Input 
              placeholder="Filter devices..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm h-9"
            />
          </div>
          
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Select 
              value={statusFilter || "all"}
              onValueChange={(val) => setStatusFilter(val === "all" ? "" : val)}
            >
              <SelectTrigger className="w-[140px] text-xs h-9 bg-card">
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
              <SelectTrigger className="w-[160px] text-xs h-9 bg-card">
                <SelectValue placeholder="All Models" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {models.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Columns Dropdown */}
            <div className="relative" ref={columnsDropdownRef}>
              <button
                type="button"
                onClick={() => setIsColumnsDropdownOpen(!isColumnsDropdownOpen)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors border border-input bg-card shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-1.5"
              >
                Columns <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              {isColumnsDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md z-40 space-y-1 font-sans">
                  <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wider">Toggle Columns</div>
                  {Object.entries(visibleColumns).map(([colKey, isVisible]) => {
                    const label = colKey === 'identifier' ? 'Identifier' :
                                  colKey === 'type' ? 'Type' :
                                  colKey === 'modelName' ? 'Model Template' :
                                  colKey === 'status' ? 'Status' :
                                  colKey === 'metadata' ? 'Device Attributes' :
                                  colKey === 'linked' ? 'Polymorphic Components' :
                                  'Actions';
                    return (
                      <label key={colKey} className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/80 rounded cursor-pointer text-xs">
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

        {/* Data Region: High Density Table */}
        <div className="border border-border rounded-md bg-card overflow-visible">
          {/* Selection Alert Banner */}
          {(() => {
            const pageIds = paginatedDevices.map(d => d.id);
            const isAllPageSelected = pageIds.length > 0 && pageIds.every(id => selectedDeviceIds.includes(id));
            
            if (!isAllPageSelected && !isAllSelectedGlobally) return null;
            
            return (
              <div className="bg-primary/5 border-b border-border py-2.5 px-4 text-xs flex justify-between items-center text-foreground animate-in slide-in-from-top duration-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <Info className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    {isAllSelectedGlobally ? (
                      <>All <strong>{devices.length}</strong> devices in inventory are selected.</>
                    ) : (
                      <>All <strong>{selectedDeviceIds.length}</strong> devices on this page are selected.</>
                    )}
                  </span>
                  {!isAllSelectedGlobally && devices.length > paginatedDevices.length && (
                    <button
                      type="button"
                      onClick={() => setIsAllSelectedGlobally(true)}
                      className="text-primary hover:underline font-semibold ml-2 text-left"
                    >
                      Select all {devices.length} devices in inventory
                    </button>
                  )}
                  {isAllSelectedGlobally && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsAllSelectedGlobally(false);
                        setSelectedDeviceIds([]);
                      }}
                      className="text-muted-foreground hover:underline ml-2 text-left"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const idsToDelete = isAllSelectedGlobally ? devices.map(d => d.id) : selectedDeviceIds;
                      if (!confirm(`Are you sure you want to bulk delete the ${idsToDelete.length} selected devices? This action will unlink and delete them permanently.`)) return;
                      
                      try {
                        const res = await fetch('http://localhost:3002/api/devices/bulk-delete', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ ids: idsToDelete })
                        });
                        const data = await res.json();
                        if (data.success) {
                          playSuccessBeep();
                          setSelectedDeviceIds([]);
                          setIsAllSelectedGlobally(false);
                          fetchDevices();
                        } else {
                          playErrorBuzz();
                          alert(data.errors?.[0] || 'Bulk delete failed.');
                        }
                      } catch (e) {
                        playErrorBuzz();
                        alert('Network error executing bulk delete.');
                      }
                    }}
                    className="inline-flex items-center gap-1 bg-destructive/15 text-destructive border border-destructive/20 hover:bg-destructive/25 text-xs px-2.5 py-1 rounded font-semibold transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Bulk Delete ({isAllSelectedGlobally ? devices.length : selectedDeviceIds.length})
                  </button>
                </div>
              </div>
            );
          })()}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] px-4">
                  <Checkbox 
                    checked={isAllSelectedGlobally || (paginatedDevices.length > 0 && paginatedDevices.every(d => selectedDeviceIds.includes(d.id)))}
                    onCheckedChange={togglePageSelection}
                  />
                </TableHead>
                {visibleColumns.identifier && (
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort('identifier')}
                      className="inline-flex items-center gap-1 hover:text-foreground text-left font-medium text-muted-foreground"
                    >
                      Identifier (ISN) <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.type && (
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort('type')}
                      className="inline-flex items-center gap-1 hover:text-foreground text-left font-medium text-muted-foreground"
                    >
                      Type <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.modelName && (
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort('modelName')}
                      className="inline-flex items-center gap-1 hover:text-foreground text-left font-medium text-muted-foreground"
                    >
                      Model Template <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.status && (
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => handleSort('status')}
                      className="inline-flex items-center gap-1 hover:text-foreground text-left font-medium text-muted-foreground"
                    >
                      Status <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                    </button>
                  </TableHead>
                )}
                {visibleColumns.metadata && <TableHead>Device Attributes</TableHead>}
                {visibleColumns.linked && <TableHead className="text-right">Polymorphic Components</TableHead>}
                {visibleColumns.actions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index} className="animate-pulse">
                    <TableCell className="w-[40px] px-4"><Skeleton className="h-4 w-4" /></TableCell>
                    {visibleColumns.identifier && <TableCell><Skeleton className="h-4 w-28" /></TableCell>}
                    {visibleColumns.type && <TableCell><Skeleton className="h-5 w-16 rounded" /></TableCell>}
                    {visibleColumns.modelName && <TableCell><Skeleton className="h-4 w-24" /></TableCell>}
                    {visibleColumns.status && (
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-2 w-2 rounded-full" />
                          <Skeleton className="h-3.5 w-16" />
                        </div>
                      </TableCell>
                    )}
                    {visibleColumns.metadata && <TableCell><Skeleton className="h-4 w-32" /></TableCell>}
                    {visibleColumns.linked && <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>}
                    {visibleColumns.actions && <TableCell className="text-right"><Skeleton className="h-4 w-4 ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : paginatedDevices.length > 0 ? (
                paginatedDevices.map((device) => (
                  <TableRow key={device.id} className="group hover:bg-muted/30 transition-colors">
                    <TableCell className="w-[40px] px-4">
                      <Checkbox 
                        checked={isAllSelectedGlobally || selectedDeviceIds.includes(device.id)}
                        onCheckedChange={() => toggleDeviceSelection(device.id)}
                      />
                    </TableCell>
                    {visibleColumns.identifier && <TableCell className="font-medium tracking-mono">{device.identifier}</TableCell>}
                    {visibleColumns.type && (
                      <TableCell>
                        <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground">
                          {device.type}
                        </span>
                      </TableCell>
                    )}
                    {visibleColumns.modelName && <TableCell className="text-muted-foreground">{device.modelName}</TableCell>}
                    {visibleColumns.status && (
                      <TableCell className="text-xs font-semibold">
                        {device.status === 'IN_STOCK' && <span className="text-emerald-600 dark:text-emerald-500 font-semibold">🟢 In Stock</span>}
                        {device.status === 'DISPATCHED' && <span className="text-blue-600 dark:text-blue-400 font-semibold font-sans">🔵 Dispatched</span>}
                        {device.status === 'TESTING' && <span className="text-amber-500 font-semibold">🟡 Testing</span>}
                        {device.status === 'DAMAGED' && <span className="text-red-500 font-semibold">🔴 Damaged</span>}
                        {device.status === 'RMA' && <span className="text-amber-600 font-semibold">🟠 RMA Swap</span>}
                        {!['IN_STOCK', 'DISPATCHED', 'TESTING', 'DAMAGED', 'RMA'].includes(device.status) && (
                          <span className="text-muted-foreground font-semibold">{device.status.replace('_', ' ')}</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.metadata && (
                      <TableCell className="text-xs">
                        {device.metadata && Object.keys(device.metadata).length > 0 ? (
                          <div className="flex flex-col gap-0.5 text-muted-foreground max-w-xs truncate font-sans">
                            {device.type === 'SIM' && (
                              <>
                                <span className="font-semibold text-foreground">Phone: {device.metadata.phoneNumber || '-'}</span>
                                <span>Carrier: {device.metadata.carrier || '-'}</span>
                              </>
                            )}
                            {device.type === 'SD_CARD' && (
                              <>
                                <span className="font-semibold text-foreground">Capacity: {device.metadata.capacity || '-'}</span>
                                <span>Speed: {device.metadata.speedClass || '-'}</span>
                              </>
                            )}
                            {device.type === 'TRACKER' && (
                              <>
                                <span className="font-semibold text-foreground">Firmware: {device.metadata.firmware || '-'}</span>
                                <span>Revision: {device.metadata.hwRevision || '-'}</span>
                              </>
                            )}
                            {device.type === 'PANIC_BUTTON' && (
                              <>
                                <span className="font-semibold text-foreground">Freq: {device.metadata.rfFrequency || '-'}</span>
                                <span>Color: {device.metadata.buttonColor || '-'}</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.linked && (
                      <TableCell className="text-right text-muted-foreground font-medium">
                        {device.linked > 0 ? (
                          <span className="text-foreground inline-flex items-center gap-1.5 bg-primary/5 px-2 py-1 rounded text-xs border border-primary/10">
                            <Cpu className="h-3 w-3" /> {device.linked} linked
                          </span>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    {visibleColumns.actions && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              className="text-muted-foreground hover:text-foreground p-1 hover:bg-muted rounded transition-colors"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem 
                              onClick={() => setViewModalDevice(device)}
                              className="text-xs font-semibold cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 mr-2 text-primary" />
                              View Asset Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => {
                                setLinkModalDevice(device);
                                setLinkModalError('');
                                setStagedLinks([]);
                                setLinkSearch('');
                                fetchRelationships();
                              }}
                              className="text-xs font-semibold cursor-pointer"
                            >
                              <LinkIcon className="h-3.5 w-3.5 mr-2" />
                              Manage Relationships
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleOpenEditModal(device)}
                              className="text-xs font-semibold cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                              Edit Properties
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(device.id)}
                              className="text-xs font-semibold text-destructive focus:text-destructive cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Decommission Unit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={8} className="p-8">
                    <EmptyState
                      icon={Search}
                      title="No devices found"
                      description="No matching devices in inventory database. Try modifying your filters or search query."
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {devices.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-border bg-transparent">
              <div className="text-sm text-muted-foreground flex-1">
                {isAllSelectedGlobally ? (
                  `All ${devices.length} of ${devices.length} row(s) selected.`
                ) : (
                  `${selectedDeviceIds.length} of ${devices.length} row(s) selected.`
                )}
              </div>
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                  }}
                  disabled={currentPage === 1}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors border border-border bg-background shadow-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none h-8 px-3"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  }}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors border border-border bg-background shadow-sm hover:bg-accent disabled:opacity-50 disabled:pointer-events-none h-8 px-3"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* DIALOG MODAL: View Device Details */}
        {viewModalDevice && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewModalDevice(null)}
          >
            <div 
              className="border border-border p-6 rounded-lg bg-card shadow-lg max-w-lg w-full relative space-y-4 animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                onClick={() => setViewModalDevice(null)} 
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div>
                <h3 className="text-lg font-semibold tracking-tight">Device Inventory Profile</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Comprehensive view of inventory entry details.</p>
              </div>

              <div className="flex border-b border-border pb-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeviceDetailTab('info')}
                  className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${deviceDetailTab === 'info' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Information
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceDetailTab('activity')}
                  className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${deviceDetailTab === 'activity' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  Activity History
                </button>
              </div>

              {deviceDetailTab === 'info' ? (
                <div className="space-y-4 text-xs text-left">
                  {/* High Density Grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 border border-border/60 rounded-md bg-muted/20 p-3">
                    <div className="flex flex-col justify-center py-1 border-b border-border/30">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Identifier</span>
                      <span className="font-mono font-semibold text-foreground tracking-mono text-xs truncate">{viewModalDevice.identifier}</span>
                    </div>
                    <div className="flex flex-col justify-center py-1 border-b border-border/30">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Asset Class</span>
                      <span>
                        <span className="inline-flex items-center rounded-md border px-1.5 py-0.25 text-[10px] font-bold bg-secondary text-secondary-foreground border-border">
                          {viewModalDevice.type}
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-col justify-center py-1 border-b border-border/30">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Template Model</span>
                      <span className="font-medium text-foreground text-xs truncate">{viewModalDevice.modelName}</span>
                    </div>
                    <div className="flex flex-col justify-center py-1 border-b border-border/30">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Current Status</span>
                      <span className="inline-flex items-center gap-1.5">
                        {viewModalDevice.status === 'IN_STOCK' && <span className="text-emerald-600 dark:text-emerald-500 font-semibold text-xs">🟢 In Stock</span>}
                        {viewModalDevice.status === 'DISPATCHED' && <span className="text-blue-600 dark:text-blue-400 font-semibold text-xs">🔵 Dispatched</span>}
                        {viewModalDevice.status === 'TESTING' && <span className="text-amber-500 font-semibold text-xs">🟡 Testing</span>}
                        {viewModalDevice.status === 'DAMAGED' && <span className="text-red-500 font-semibold text-xs">🔴 Damaged</span>}
                        {viewModalDevice.status === 'RMA' && <span className="text-amber-600 font-semibold text-xs">🟠 RMA Swap</span>}
                        {!['IN_STOCK', 'DISPATCHED', 'TESTING', 'DAMAGED', 'RMA'].includes(viewModalDevice.status) && (
                          <span className="text-muted-foreground font-semibold text-xs">{viewModalDevice.status.replace('_', ' ')}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col justify-center py-1 border-b border-border/30 col-span-2 last:border-0 font-sans">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Paired Linkages</span>
                      <span className="font-medium text-foreground text-xs">
                        {viewModalDevice.linked > 0 ? `${viewModalDevice.linked} active links` : 'Stand-alone'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 font-sans">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Device Attributes</span>
                    {viewModalDevice.metadata && Object.keys(viewModalDevice.metadata).length > 0 ? (
                      <div className="bg-muted/40 border border-border/60 rounded-md p-3 text-xs grid grid-cols-2 gap-x-6 gap-y-2">
                        {Object.entries(viewModalDevice.metadata).map(([k, v]) => (
                          <div key={k} className="flex flex-col justify-center py-1 border-b border-border/20 last:border-0">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">{k.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-mono text-foreground font-semibold text-xs truncate">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">No custom attributes populated.</p>
                    )}
                  </div>
                </div>
              ) : (
                <ScrollArea className="max-h-[350px] pr-2 py-2">
                  {isAuditLogsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="py-4">
                      <EmptyState
                        icon={History}
                        title="No activity history"
                        description="No activity logs found for this device."
                      />
                    </div>
                  ) : (
                    <div className="relative border-l border-border pl-6 ml-3 space-y-6 text-left">
                      {auditLogs.map((log) => {
                        let dotColor = 'bg-zinc-400 border-zinc-500';
                        if (log.actionType === 'INGEST') dotColor = 'bg-emerald-500 border-emerald-600';
                        else if (log.actionType === 'STATUS_CHANGE') dotColor = 'bg-blue-500 border-blue-600';
                        else if (log.actionType === 'TELEMETRY_CHECK') dotColor = 'bg-emerald-500 border-emerald-600';
                        else if (log.actionType === 'DELETE') dotColor = 'bg-red-500 border-red-600';
                        else if (log.actionType === 'SWAP') dotColor = 'bg-amber-500 border-amber-600';
                        else if (log.actionType === 'LINK') dotColor = 'bg-blue-500 border-blue-600';
                        else if (log.actionType === 'UNLINK') dotColor = 'bg-zinc-500 border-zinc-600';

                        return (
                          <div key={log.id} className="relative">
                            <span className={`absolute -left-[30px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card ${dotColor} shadow`} />
                            <div className="flex flex-col gap-1 text-left">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold uppercase bg-muted px-1.5 py-0.5 rounded text-muted-foreground border border-border">
                                  {log.actionType}
                                </span>
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  {new Date(log.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-xs text-foreground/90 font-sans">{log.details}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              )}

              <div className="flex justify-end pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setViewModalDevice(null)}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DIALOG MODAL: Manual Single Link */}
        {linkModalDevice && (() => {
          // Frontend cycle check helper
          const isAncestor = (possibleAncestorId: string, currentDeviceId: string): boolean => {
            const rel = relationships.find(r => r.linkedDeviceId === currentDeviceId);
            let parentId = rel?.primaryDeviceId;
            
            if (!parentId) {
              const staged = stagedLinks.find(s => s.childId === currentDeviceId);
              parentId = staged?.primaryId;
            }
            
            if (!parentId) return false;
            if (parentId === possibleAncestorId) return true;
            return isAncestor(possibleAncestorId, parentId);
          };

          const parentRel = relationships.find(r => r.linkedDeviceId === linkModalDevice.id);
          const parentDev = parentRel ? devices.find(d => d.id === parentRel.primaryDeviceId) : null;
          const stagedParent = stagedLinks.find(s => s.childId === linkModalDevice.id);

          return (
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setLinkModalDevice(null)}
            >
              <div 
                className="border border-border p-6 rounded-lg bg-card shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto relative space-y-6 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  type="button"
                  onClick={() => setLinkModalDevice(null)} 
                  className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>

                <div>
                  <h3 className="text-lg font-semibold tracking-tight">Manage Hardware Links</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Establish or edit custom device relationship mappings.</p>
                </div>

                {linkModalError && (
                  <div className="bg-destructive/10 text-destructive text-xs p-2.5 rounded border border-destructive/20 font-medium">
                    {linkModalError}
                  </div>
                )}

                <div className="space-y-6 text-left">
                  <div className="text-xs border border-border p-3 rounded-lg bg-muted/20 space-y-1">
                    <div className="font-semibold text-foreground">Selected Device:</div>
                    <div className="font-mono text-foreground font-semibold">{linkModalDevice.identifier}</div>
                    <div className="text-muted-foreground">{linkModalDevice.modelName} ({linkModalDevice.type}) — Status: {linkModalDevice.status}</div>
                  </div>

                  {/* Section 1: Parent Device Connection */}
                  <div className="space-y-2 border-t border-border pt-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Parent Connection</h4>
                    
                    {parentDev ? (
                      <div className="border border-border rounded-lg bg-card overflow-hidden p-2.5 px-3 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-foreground font-mono">{parentDev.identifier}</div>
                          <div className="text-muted-foreground text-[10px]">{parentDev.modelName} ({parentDev.type})</div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const res = await fetch('http://localhost:3002/api/device-links/unlink', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  links: [{ primaryISN: parentDev.identifier, childISN: linkModalDevice.identifier }]
                                })
                              });
                              const data = await res.json();
                              if (data.success) {
                                playSuccessBeep();
                                fetchRelationships();
                                fetchDevices();
                              } else {
                                setLinkModalError(data.errors?.[0] || 'Unlinking parent failed.');
                                playErrorBuzz();
                              }
                            } catch (e) {
                              setLinkModalError('Network error during unlinking.');
                              playErrorBuzz();
                            }
                          }}
                          className="text-xs text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                          title="Unlink from parent"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : stagedParent ? (
                      <div className="border border-primary/25 rounded-lg bg-primary/5 p-2.5 px-3 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-semibold text-foreground font-mono flex items-center gap-1.5">
                            <span className="text-primary text-[10px] font-semibold bg-primary/10 px-1.5 py-0.5 rounded">Staged Parent</span>
                            {stagedParent.primaryISN}
                          </div>
                          <div className="text-muted-foreground text-[10px]">{stagedParent.primaryModelName}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setStagedLinks(stagedLinks.filter(s => s.childId !== linkModalDevice.id));
                          }}
                          className="text-xs text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                          title="Remove staged parent link"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      // Display search input to link parent
                      (() => {
                        const parentCandidates = devices.filter(d => {
                          if (d.status !== 'IN_STOCK') return false;
                          if (d.id === linkModalDevice.id) return false;
                          const m = models.find(x => x.id === d.modelId);
                          if (!m) return false;
                          
                          // Model allowedChildren must contain linkModalDevice.type
                          let allowed: string[] = [];
                          if (m.allowedChildren) {
                            try {
                              allowed = Array.isArray(m.allowedChildren)
                                ? m.allowedChildren
                                : JSON.parse(m.allowedChildren as string);
                            } catch (e) {
                              console.error(e);
                            }
                          }
                          if (!allowed.includes(linkModalDevice.type)) return false;

                          // Cycle check: current device is not ancestor of possible parent
                          if (isAncestor(linkModalDevice.id, d.id)) return false;

                          return true;
                        });

                        if (parentCandidates.length === 0) {
                          return (
                            <EmptyState
                              icon={Cpu}
                              title="No parents available"
                              description="No compatible in-stock parent hardware available."
                              className="p-4"
                            />
                          );
                        }

                        const filteredParentCandidates = parentCandidates.filter(d => 
                          linkParentSearch.trim() === '' ||
                          d.identifier.toLowerCase().includes(linkParentSearch.toLowerCase()) ||
                          d.modelName.toLowerCase().includes(linkParentSearch.toLowerCase()) ||
                          d.type.toLowerCase().includes(linkParentSearch.toLowerCase())
                        );

                        return (
                          <div className="space-y-2">
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Search className="h-3.5 w-3.5" />
                              </div>
                              <input
                                type="text"
                                placeholder="Search compatible parent devices..."
                                value={linkParentSearch}
                                onChange={(e) => setLinkParentSearch(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-sans"
                              />
                            </div>

                            <ScrollArea className="border border-border rounded-lg max-h-32 bg-card">
                              <div className="divide-y divide-border">
                              {filteredParentCandidates.length > 0 ? (
                                filteredParentCandidates.map(d => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => {
                                      // Staged link: parent is primary (d.id), child is linkModalDevice.id
                                      const exists = stagedLinks.some(s => s.primaryId === d.id && s.childId === linkModalDevice.id);
                                      if (exists) {
                                        setLinkModalError('This parent link is already staged.');
                                        return;
                                      }

                                      setStagedLinks([...stagedLinks, {
                                        primaryISN: d.identifier,
                                        childISN: linkModalDevice.identifier,
                                        primaryId: d.id,
                                        childId: linkModalDevice.id,
                                        primaryModelName: d.modelName,
                                        childModelName: linkModalDevice.modelName,
                                        childType: linkModalDevice.type
                                      }]);
                                      setLinkParentSearch('');
                                      setLinkModalError('');
                                      playSuccessBeep();
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-muted/80 transition-colors font-medium flex flex-col gap-0.5"
                                  >
                                    <div className="font-semibold text-foreground font-mono text-xs">{d.identifier}</div>
                                    <div className="text-muted-foreground text-[10px]">{d.modelName} ({d.type})</div>
                                  </button>
                                ))
                              ) : (
                                <EmptyState
                                  icon={Search}
                                  title="No parents found"
                                  description="No matching compatible parent devices."
                                  className="p-4 border-none bg-transparent animate-none"
                                />
                              )}
                              </div>
                            </ScrollArea>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Section 2: Child Components (Accessories) */}
                  {(() => {
                    const model = models.find(m => m.id === linkModalDevice.modelId);
                    let allowedChildTypes: string[] = [];
                    if (model?.allowedChildren) {
                      try {
                        allowedChildTypes = Array.isArray(model.allowedChildren)
                          ? model.allowedChildren
                          : JSON.parse(model.allowedChildren as string);
                      } catch (e) {
                        console.error(e);
                      }
                    }

                    if (allowedChildTypes.length === 0) return null;

                    const childRels = relationships.filter(r => r.primaryDeviceId === linkModalDevice.id);
                    const stagedChildren = stagedLinks.filter(s => s.primaryId === linkModalDevice.id);

                    // A child candidate: IN_STOCK, compatible type, no parent in DB or staged, no cycle
                    const childCandidates = devices.filter(d => {
                      if (d.status !== 'IN_STOCK') return false;
                      if (d.id === linkModalDevice.id) return false;
                      if (!allowedChildTypes.includes(d.type)) return false;

                      // Single parent constraint: must not have an active parent
                      const hasParentDb = relationships.some(r => r.linkedDeviceId === d.id);
                      const hasParentStaged = stagedLinks.some(s => s.childId === d.id);
                      if (hasParentDb || hasParentStaged) return false;

                      // Cycle check: candidate child must not be ancestor of current device
                      if (isAncestor(d.id, linkModalDevice.id)) return false;

                      return true;
                    });

                    const filteredChildCandidates = childCandidates.filter(d => 
                      linkSearch.trim() === '' ||
                      d.identifier.toLowerCase().includes(linkSearch.toLowerCase()) ||
                      d.modelName.toLowerCase().includes(linkSearch.toLowerCase()) ||
                      d.type.toLowerCase().includes(linkSearch.toLowerCase())
                    );

                    return (
                      <div className="space-y-2 border-t border-border pt-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Child Components (Accessories)</h4>
                        
                        {/* Current Active & Staged Children */}
                        {(childRels.length > 0 || stagedChildren.length > 0) ? (
                          <div className="border border-border rounded-lg bg-card overflow-hidden divide-y divide-border mb-3">
                            {childRels.map(rel => {
                              const childDev = devices.find(d => d.id === rel.linkedDeviceId);
                              if (!childDev) return null;
                              return (
                                <div key={rel.id} className="p-2.5 px-3 flex justify-between items-center text-xs">
                                  <div>
                                    <div className="font-semibold text-foreground font-mono">{childDev.identifier}</div>
                                    <div className="text-muted-foreground text-[10px]">{childDev.modelName} ({childDev.type})</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      try {
                                        const res = await fetch('http://localhost:3002/api/device-links/unlink', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            links: [{ primaryISN: linkModalDevice.identifier, childISN: childDev.identifier }]
                                          })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                          playSuccessBeep();
                                          fetchRelationships();
                                          fetchDevices();
                                        } else {
                                          setLinkModalError(data.errors?.[0] || 'Unlinking child failed.');
                                          playErrorBuzz();
                                        }
                                      } catch (e) {
                                        setLinkModalError('Network error during unlinking.');
                                        playErrorBuzz();
                                      }
                                    }}
                                    className="text-xs text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                                    title="Unlink child component"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                            
                            {stagedChildren.map((staged, idx) => (
                              <div key={`staged-${idx}`} className="p-2.5 px-3 bg-primary/5 flex justify-between items-center text-xs">
                                <div>
                                  <div className="font-semibold text-foreground font-mono flex items-center gap-1.5">
                                    <span className="text-primary text-[10px] font-semibold bg-primary/10 px-1.5 py-0.5 rounded">Staged Child</span>
                                    {staged.childISN}
                                  </div>
                                  <div className="text-muted-foreground text-[10px]">{staged.childModelName} ({staged.childType})</div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStagedLinks(stagedLinks.filter(s => s.childId !== staged.childId));
                                  }}
                                  className="text-xs text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                  title="Remove staged child link"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Search Input for Child Candidates */}
                        {childCandidates.length > 0 ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                                <Search className="h-3.5 w-3.5" />
                              </div>
                              <input
                                type="text"
                                placeholder="Search compatible child components..."
                                value={linkSearch}
                                onChange={(e) => setLinkSearch(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-sans"
                              />
                            </div>

                            <ScrollArea className="border border-border rounded-lg max-h-32 bg-card">
                              <div className="divide-y divide-border">
                              {filteredChildCandidates.length > 0 ? (
                                filteredChildCandidates.map(d => (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => {
                                      const exists = stagedLinks.some(s => s.primaryId === linkModalDevice.id && s.childId === d.id);
                                      if (exists) {
                                        setLinkModalError('This child link is already staged.');
                                        return;
                                      }

                                      setStagedLinks([...stagedLinks, {
                                        primaryISN: linkModalDevice.identifier,
                                        childISN: d.identifier,
                                        primaryId: linkModalDevice.id,
                                        childId: d.id,
                                        primaryModelName: linkModalDevice.modelName,
                                        childModelName: d.modelName,
                                        childType: d.type
                                      }]);
                                      setLinkSearch('');
                                      setLinkModalError('');
                                      playSuccessBeep();
                                    }}
                                    className="w-full text-left px-3 py-2 hover:bg-muted/80 transition-colors font-medium flex flex-col gap-0.5"
                                  >
                                    <div className="font-semibold text-foreground font-mono text-xs">{d.identifier}</div>
                                    <div className="text-muted-foreground text-[10px]">{d.modelName} ({d.type})</div>
                                  </button>
                                ))
                              ) : (
                                <EmptyState
                                  icon={Search}
                                  title="No children found"
                                  description="No matching compatible child components."
                                  className="p-4 border-none bg-transparent animate-none"
                                />
                              )}
                              </div>
                            </ScrollArea>
                          </div>
                        ) : (
                          <EmptyState
                            icon={Cpu}
                            title="No children available"
                            description="No compatible in-stock child components available."
                            className="p-4"
                          />
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex gap-2 justify-end pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setLinkModalDevice(null)}
                      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 flex-1"
                    >
                      Cancel
                    </button>
                    {stagedLinks.length > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch('http://localhost:3002/api/device-links/commit', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                links: stagedLinks.map(s => ({
                                  primaryISN: s.primaryISN,
                                  childISN: s.childISN
                                }))
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              playSuccessBeep();
                              setStagedLinks([]);
                              setLinkModalDevice(null);
                              fetchRelationships();
                              fetchDevices();
                            } else {
                              setLinkModalError(data.errors?.[0] || 'Bulk committing links failed.');
                              playErrorBuzz();
                            }
                          } catch (e) {
                            setLinkModalError('Network error committing relationship links.');
                            playErrorBuzz();
                          }
                        }}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 flex-1"
                      >
                        Commit ({stagedLinks.length}) Links
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>
    </AppShell>
  );
};
