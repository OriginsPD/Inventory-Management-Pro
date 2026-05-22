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
  ArrowUpDown 
} from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Skeleton } from '../ui/skeleton';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
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

const playPromptChirp = () => {
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

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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
          handleGlobalBarcodeScanned(accumulatedKeys.trim());
          accumulatedKeys = '';
          e.preventDefault();
        } else {
          accumulatedKeys = '';
        }
        return;
      }

      if (e.key.length > 1) return;

      // Wedge scanner types extremely fast (<30ms). Slow input is from a human typing.
      if (delay > 35 && isInput) {
        accumulatedKeys = '';
        return;
      }

      accumulatedKeys += e.key;
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [bulkSubTab, bulkIngestList, devices, primaryScan, models, bulkSelectedModelId]);

  const handleGlobalBarcodeScanned = (barcode: string) => {
    if (activeModal !== 'bulk') {
      setActiveModal('bulk');
    }

    if (bulkSubTab === 'ingest') {
      processIngestionList([{ identifier: barcode, metadata: {} }]);
    } else {
      // Linking scan sequence logic
      if (!primaryScan) {
        setPrimaryScan(barcode);
        playPromptChirp();
      } else {
        setChildScan(barcode);
        triggerManualLinkScanWithParams(primaryScan, barcode);
      }
    }
  };

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

  // Parse CSV for Ingestion
  const handleIngestCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    setDuplicateCountAlert(0);
    const reader = new FileReader();
    const targetType = getSelectedModelType(bulkSelectedModelId);

    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/[\r\n]+/).map(s => s.trim()).filter(s => s.length > 0);
      
      const parsedItems = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        const serial = parts[0] || '';
        const meta1 = parts[1] || '';
        const meta2 = parts[2] || '';

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
    };
    reader.readAsText(e.target.files[0]);
  };

  // Dedup and add lists of prepared ingestion items
  const processIngestionList = (list: IngestItem[]) => {
    const uniqueIdentifiers = [...new Set(list.map(x => x.identifier))];
    const duplicatesInBatch = list.length - uniqueIdentifiers.length;

    const existingIdentifiers = devices.map(d => d.identifier);
    const currentPreparedIdentifiers = bulkIngestList.map(b => b.identifier);

    const finalUniqueList = list.filter((item, idx, self) => 
      self.findIndex(t => t.identifier === item.identifier) === idx &&
      !existingIdentifiers.includes(item.identifier) &&
      !currentPreparedIdentifiers.includes(item.identifier)
    );

    const duplicatesInDb = list.length - finalUniqueList.length;
    const totalFiltered = duplicatesInBatch + duplicatesInDb;

    if (totalFiltered > 0) {
      setDuplicateCountAlert(prev => prev + totalFiltered);
      playErrorBuzz();
    }

    if (finalUniqueList.length > 0) {
      setBulkIngestList(prev => [...finalUniqueList, ...prev]);
      playSuccessBeep();
    }
  };

  // Execute Bulk Ingestion commit
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
      metadata: item.metadata
    }));

    try {
      const res = await fetch('http://localhost:3002/api/devices/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: payload })
      });
      const data = await res.json();
      if (data.success) {
        setBulkIngestList([]);
        setDuplicateCountAlert(0);
        setActiveModal('none');
        playSuccessBeep();
        fetchDevices();
      } else {
        playErrorBuzz();
      }
    } catch (e) {
      setBulkIngestError('Failed to commit bulk ingestion.');
      playErrorBuzz();
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
    setActiveModal('bulk');
  };

  const singleAssetType = getSelectedModelType(selectedModelId);
  const bulkAssetType = getSelectedModelType(bulkSelectedModelId);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 w-full">
        
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
              className="border border-border p-6 rounded-xl bg-card shadow-lg max-w-md w-full relative space-y-4 animate-in fade-in zoom-in-95 duration-150"
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
              className="border border-border rounded-xl bg-card shadow-lg max-w-4xl w-full max-h-[90vh] flex flex-col relative animate-in fade-in zoom-in-95 duration-150"
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
              <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-6">
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
                        <button onClick={() => setDuplicateCountAlert(0)} className="text-[10px] underline hover:no-underline font-semibold ml-4">
                          Dismiss
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-1">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Template Model</label>
                        <Select 
                          value={bulkSelectedModelId}
                          onValueChange={(val) => {
                            setBulkSelectedModelId(val);
                            setBulkIngestList([]);
                            setDuplicateCountAlert(0);
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
                          <p className="text-[11px] text-muted-foreground mt-0.5">Drop a CSV file. Format: <span className="font-mono">serial, [meta1], [meta2]</span></p>
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
                            onClick={() => { setBulkIngestList([]); setDuplicateCountAlert(0); }}
                            className="text-[10px] text-destructive hover:underline font-semibold"
                          >
                            Clear List
                          </button>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        {bulkIngestList.length > 0 ? (
                          <table className="w-full text-xs text-left">
                            <thead className="bg-muted/30 border-b border-border text-[10px] font-semibold text-muted-foreground uppercase sticky top-0 z-10">
                              <tr className="bg-card">
                                <th className="p-2 px-4">Serial / ISN</th>

                                {/* Dynamic headers depending on asset type */}
                                {bulkAssetType === 'SIM' && (
                                  <>
                                    <th className="p-2">Phone Number (MSISDN)</th>
                                    <th className="p-2">Carrier</th>
                                  </>
                                )}
                                {bulkAssetType === 'TRACKER' && (
                                  <>
                                    <th className="p-2">Firmware</th>
                                    <th className="p-2">HW Revision</th>
                                  </>
                                )}
                                {bulkAssetType === 'SD_CARD' && (
                                  <>
                                    <th className="p-2">Capacity</th>
                                    <th className="p-2">Speed Class</th>
                                  </>
                                )}
                                {bulkAssetType === 'PANIC_BUTTON' && (
                                  <>
                                    <th className="p-2">RF Frequency</th>
                                    <th className="p-2">Color</th>
                                  </>
                                )}

                                <th className="p-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border font-mono">
                              {bulkIngestList.map((item, idx) => (
                                <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                  <td className="p-2 px-4 font-medium tracking-mono">{item.identifier}</td>

                                  {bulkAssetType === 'SIM' && (
                                    <>
                                      <td className="p-1">
                                        <input 
                                          type="text" 
                                          placeholder="Phone number" 
                                          value={item.metadata.phoneNumber || ''} 
                                          onChange={(e) => handleUpdateItemMeta(idx, 'phoneNumber', e.target.value)}
                                          className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                        />
                                      </td>
                                      <td className="p-1">
                                        <input 
                                          type="text" 
                                          placeholder="Carrier" 
                                          value={item.metadata.carrier || ''} 
                                          onChange={(e) => handleUpdateItemMeta(idx, 'carrier', e.target.value)}
                                          className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                        />
                                      </td>
                                    </>
                                  )}

                                  {bulkAssetType === 'TRACKER' && (
                                    <>
                                      <td className="p-1">
                                        <input 
                                          type="text" 
                                          placeholder="e.g. v1.2" 
                                          value={item.metadata.firmware || ''} 
                                          onChange={(e) => handleUpdateItemMeta(idx, 'firmware', e.target.value)}
                                          className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                        />
                                      </td>
                                      <td className="p-1">
                                        <input 
                                          type="text" 
                                          placeholder="e.g. REV_A" 
                                          value={item.metadata.hwRevision || ''} 
                                          onChange={(e) => handleUpdateItemMeta(idx, 'hwRevision', e.target.value)}
                                          className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                        />
                                      </td>
                                    </>
                                  )}

                                  {bulkAssetType === 'SD_CARD' && (
                                    <>
                                      <td className="p-1">
                                        <input 
                                          type="text" 
                                          placeholder="e.g. 64GB" 
                                          value={item.metadata.capacity || ''} 
                                          onChange={(e) => handleUpdateItemMeta(idx, 'capacity', e.target.value)}
                                          className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                        />
                                      </td>
                                      <td className="p-1">
                                        <input 
                                          type="text" 
                                          placeholder="e.g. U3" 
                                          value={item.metadata.speedClass || ''} 
                                          onChange={(e) => handleUpdateItemMeta(idx, 'speedClass', e.target.value)}
                                          className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                        />
                                      </td>
                                    </>
                                  )}

                                  {bulkAssetType === 'PANIC_BUTTON' && (
                                    <>
                                      <td className="p-1">
                                        <input 
                                          type="text" 
                                          placeholder="e.g. 433MHz" 
                                          value={item.metadata.rfFrequency || ''} 
                                          onChange={(e) => handleUpdateItemMeta(idx, 'rfFrequency', e.target.value)}
                                          className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                        />
                                      </td>
                                      <td className="p-1">
                                        <input 
                                          type="text" 
                                          placeholder="e.g. Red" 
                                          value={item.metadata.buttonColor || ''} 
                                          onChange={(e) => handleUpdateItemMeta(idx, 'buttonColor', e.target.value)}
                                          className="h-7 w-full border border-input rounded bg-transparent px-2 py-0.5 text-xs focus:ring-1 focus:ring-ring font-sans"
                                        />
                                      </td>
                                    </>
                                  )}

                                  <td className="p-2 text-right">
                                    <button 
                                      onClick={() => setBulkIngestList(bulkIngestList.filter((_, i) => i !== idx))} 
                                      className="text-[10px] text-destructive hover:underline font-sans font-semibold"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="text-center py-8 text-xs text-muted-foreground italic font-sans">
                            No devices prepared yet. Scan barcodes or drop a CSV file to begin.
                          </div>
                        )}
                      </div>
                    </div>
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
                          <div className="text-center py-8 text-xs text-muted-foreground italic font-sans">
                            No linking relationships prepared. Scan pairs or upload CSV schema matrix.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${
                            device.status === 'IN_STOCK' ? 'bg-emerald-500' :
                            device.status === 'DISPATCHED' ? 'bg-blue-500' :
                            device.status === 'TESTING' ? 'bg-amber-500' :
                            'bg-destructive'
                          }`} />
                          <span className="text-xs font-medium text-foreground">{device.status.replace('_', ' ')}</span>
                        </div>
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
                <TableRow>
                  <TableCell colSpan={8} className="text-center p-8 text-sm text-muted-foreground">
                    No matching devices in inventory database.
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
              className="border border-border p-6 rounded-xl bg-card shadow-lg max-w-md w-full relative space-y-4 animate-in fade-in zoom-in-95 duration-150"
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

              <div className="space-y-3.5 text-sm text-left">
                <div className="grid grid-cols-3 py-1 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Identifier</span>
                  <span className="col-span-2 font-mono font-semibold text-foreground tracking-mono">{viewModalDevice.identifier}</span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Asset Class</span>
                  <span className="col-span-2">
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground border-border">
                      {viewModalDevice.type}
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Template Model</span>
                  <span className="col-span-2 font-medium text-foreground">{viewModalDevice.modelName}</span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Current Status</span>
                  <span className="col-span-2 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${
                        viewModalDevice.status === 'IN_STOCK' ? 'bg-emerald-500' :
                        viewModalDevice.status === 'DISPATCHED' ? 'bg-blue-500' :
                        viewModalDevice.status === 'TESTING' ? 'bg-amber-500' :
                        'bg-destructive'
                      }`} />
                      <span className="text-xs font-semibold">{viewModalDevice.status.replace('_', ' ')}</span>
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-3 py-1 border-b border-border/40">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Paired Linkages</span>
                  <span className="col-span-2 font-medium text-foreground">
                    {viewModalDevice.linked > 0 ? `${viewModalDevice.linked} active links` : 'Stand-alone'}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">Device Attributes</span>
                  {viewModalDevice.metadata && Object.keys(viewModalDevice.metadata).length > 0 ? (
                    <div className="bg-muted/40 border border-border/80 rounded-lg p-3 text-xs space-y-2">
                      {Object.entries(viewModalDevice.metadata).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-0.5 border-b border-border/30 last:border-0">
                          <span className="font-semibold text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                          <span className="font-mono text-foreground font-semibold">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No custom attributes populated.</p>
                  )}
                </div>
              </div>

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
          const activeLinksForThisDevice = relationships.filter(r => 
            r.primaryDeviceId === linkModalDevice.id || 
            r.linkedDeviceId === linkModalDevice.id
          );

          return (
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setLinkModalDevice(null)}
            >
              <div 
                className="border border-border p-6 rounded-xl bg-card shadow-lg max-w-md w-full relative space-y-4 animate-in fade-in zoom-in-95 duration-150"
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

                <div className="space-y-4 text-left">
                  <div className="text-xs border border-border p-3 rounded-lg bg-muted/20 space-y-1">
                    <div className="font-semibold text-foreground">Selected Device:</div>
                    <div className="font-mono text-foreground font-semibold">{linkModalDevice.identifier}</div>
                    <div className="text-muted-foreground">{linkModalDevice.modelName} ({linkModalDevice.type}) — Status: {linkModalDevice.status}</div>
                  </div>

                  {/* Active Relationships list */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Links</h4>
                    {activeLinksForThisDevice.length > 0 ? (
                      <div className="border border-border rounded-lg bg-card overflow-hidden divide-y divide-border">
                        {activeLinksForThisDevice.map((link) => {
                          const isPrimary = linkModalDevice.id === link.primaryDeviceId;
                          const otherId = isPrimary ? link.linkedDeviceId : link.primaryDeviceId;
                          const otherDev = devices.find(d => d.id === otherId);
                          
                          if (!otherDev) return null;
                          
                          return (
                            <div key={link.id} className="p-2.5 px-3 flex justify-between items-center text-xs">
                              <div>
                                <div className="font-semibold text-foreground font-mono">{otherDev.identifier}</div>
                                <div className="text-muted-foreground text-[10px]">{otherDev.modelName} ({otherDev.type})</div>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  const primaryISN = isPrimary ? linkModalDevice.identifier : otherDev.identifier;
                                  const childISN = isPrimary ? otherDev.identifier : linkModalDevice.identifier;
                                  try {
                                    const res = await fetch('http://localhost:3002/api/device-links/unlink', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        links: [{ primaryISN, childISN }]
                                      })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                      playSuccessBeep();
                                      fetchRelationships();
                                      fetchDevices();
                                    } else {
                                      setLinkModalError(data.errors?.[0] || 'Unlinking failed.');
                                      playErrorBuzz();
                                    }
                                  } catch (e) {
                                    setLinkModalError('Network error during unlinking.');
                                    playErrorBuzz();
                                  }
                                }}
                                className="text-xs text-destructive hover:bg-destructive/10 p-1.5 rounded transition-colors"
                                title="Unlink relationship"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic p-2 border border-dashed border-border rounded-lg text-center">
                        No active links established.
                      </div>
                    )}
                  </div>

                  {/* Staged Links (Pending Commit) */}
                  {stagedLinks.length > 0 && (
                    <div className="space-y-2 animate-in fade-in duration-150">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Staged Links (Pending Commit)</h4>
                      <div className="border border-primary/20 rounded-lg bg-primary/5 overflow-hidden divide-y divide-primary/10">
                        {stagedLinks.map((staged, idx) => (
                          <div key={idx} className="p-2.5 px-3 flex justify-between items-center text-xs">
                            <div>
                              <div className="font-semibold text-foreground font-mono flex items-center gap-1.5">
                                <span className="text-muted-foreground text-[10px]">Link:</span> 
                                {staged.primaryISN} ↔ {staged.childISN}
                              </div>
                              <div className="text-muted-foreground text-[10px]">
                                {staged.childModelName} ({staged.childType})
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setStagedLinks(stagedLinks.filter((_, i) => i !== idx));
                              }}
                              className="text-xs text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              title="Remove staged link"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create New Link Section */}
                  {(() => {
                    // If it is a child device (not a tracker) and is already linked OR has a staged link, prevent another link
                    if (linkModalDevice.type !== 'TRACKER' && (activeLinksForThisDevice.length > 0 || stagedLinks.length > 0)) {
                      return (
                        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border italic text-center">
                          {stagedLinks.length > 0 
                            ? "A pending link is already staged for this component." 
                            : "This component is already linked. Unlink it above to re-pair it."}
                        </div>
                      );
                    }

                    let allowedTypes: string[] = [];
                    if (linkModalDevice.type === 'TRACKER') {
                      const primaryModel = models.find(m => m.id === linkModalDevice.modelId);
                      if (primaryModel?.allowedChildren) {
                        try {
                          allowedTypes = Array.isArray(primaryModel.allowedChildren)
                            ? primaryModel.allowedChildren
                            : JSON.parse(primaryModel.allowedChildren as string);
                        } catch (e) {
                          console.error(e);
                        }
                      }
                      if (allowedTypes.length === 0) {
                        allowedTypes = ['SIM', 'SD_CARD', 'PERIPHERAL', 'PANIC_BUTTON'];
                      }
                    } else {
                      allowedTypes = ['TRACKER'];
                    }

                    // Find types already linked to filter out from option list (for trackers)
                    const linkedTypes = activeLinksForThisDevice.map(link => {
                      const isPrimary = linkModalDevice.id === link.primaryDeviceId;
                      const otherId = isPrimary ? link.linkedDeviceId : link.primaryDeviceId;
                      const otherDev = devices.find(d => d.id === otherId);
                      return otherDev ? otherDev.type : '';
                    }).filter(Boolean);

                    const stagedChildIds = stagedLinks.map(s => s.childId);
                    const stagedPrimaryIds = stagedLinks.map(s => s.primaryId);

                    const linkableDevices = devices.filter(d => 
                      d.status === 'IN_STOCK' && 
                      d.id !== linkModalDevice.id &&
                      allowedTypes.includes(d.type) &&
                      (linkModalDevice.type === 'TRACKER' 
                        ? (!linkedTypes.includes(d.type) && !stagedChildIds.includes(d.id))
                        : (!stagedPrimaryIds.includes(d.id))
                      )
                    );

                    if (linkableDevices.length === 0) {
                      return (
                        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/5 p-3 rounded border border-amber-500/10 font-medium">
                          No compatible in-stock devices available to link.<br />
                          Allowed: {allowedTypes.filter(t => !linkedTypes.includes(t)).join(', ') || 'None (All slots filled)'}
                        </div>
                      );
                    }

                    const filteredCandidates = linkableDevices.filter(d => 
                      linkSearch.trim() === '' ||
                      d.identifier.toLowerCase().includes(linkSearch.toLowerCase()) ||
                      d.modelName.toLowerCase().includes(linkSearch.toLowerCase()) ||
                      d.type.toLowerCase().includes(linkSearch.toLowerCase())
                    );

                    return (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                          Search & Stage Compatible Device
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                            <Search className="h-3.5 w-3.5" />
                          </div>
                          <input
                            type="text"
                            placeholder="Type to filter compatible devices..."
                            value={linkSearch}
                            onChange={(e) => setLinkSearch(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-card pl-9 pr-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-sans"
                          />
                        </div>

                        {/* List of candidates */}
                        <div className="border border-border rounded-lg max-h-40 overflow-y-auto bg-card divide-y divide-border">
                          {filteredCandidates.length > 0 ? (
                            filteredCandidates.map(d => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  const isPrimary = linkModalDevice.type === 'TRACKER';
                                  const primaryDevice = isPrimary ? linkModalDevice : d;
                                  const childDevice = isPrimary ? d : linkModalDevice;

                                  // Prevent duplicates in staged list
                                  const exists = stagedLinks.some(s => s.primaryISN === primaryDevice.identifier && s.childISN === childDevice.identifier);
                                  if (exists) {
                                    setLinkModalError('This link is already staged.');
                                    return;
                                  }

                                  setStagedLinks([...stagedLinks, {
                                    primaryISN: primaryDevice.identifier,
                                    childISN: childDevice.identifier,
                                    primaryId: primaryDevice.id,
                                    childId: childDevice.id,
                                    primaryModelName: primaryDevice.modelName,
                                    childModelName: childDevice.modelName,
                                    childType: childDevice.type
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
                            <div className="p-3 text-center text-muted-foreground italic text-xs">
                              No matching compatible devices found.
                            </div>
                          )}
                        </div>
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
