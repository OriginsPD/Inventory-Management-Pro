import { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  FileSpreadsheet, 
  Download, 
  Loader2, 
  Calendar, 
  Info, 
  Users, 
  Database, 
  FileText,
  TrendingUp
} from 'lucide-react';
import { AppShell } from '../layout/AppShell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { EmptyState } from '../ui/empty-state';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import * as XLSX from 'xlsx';

// Types representing fetched backend resources
interface Device {
  id: string;
  identifier: string;
  modelId: string;
  status: string;
  customerId: string | null;
  customerName: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  modelName: string;
  type: string;
  linked: number;
}

interface Customer {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  email: string | null;
  taxId: string | null;
}

interface AuditLog {
  id: string;
  deviceId: string | null;
  deviceIdentifier: string | null;
  actionType: string;
  details: string;
  createdAt: string;
}

interface StockAlert {
  id: string;
  brand: string;
  name: string;
  assetType: string;
  inStock: number;
  maxStock: number;
  level: 'HEALTHY' | 'WARNING' | 'LOW';
}

// Browser Audio Synthesizer Beeps
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

type ReportType = 'inventory' | 'stock' | 'customer' | 'audit';

export const ReportsScreen = () => {
  const [activeReport, setActiveReport] = useState<ReportType>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'inventory' || tab === 'stock' || tab === 'customer' || tab === 'audit') {
        return tab;
      }
    }
    return 'inventory';
  });

  // Keep state in sync with history navigation
  useEffect(() => {
    const syncTabFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'inventory' || tab === 'stock' || tab === 'customer' || tab === 'audit') {
        setActiveReport(tab);
      }
    };
    window.addEventListener('popstate', syncTabFromUrl);
    return () => window.removeEventListener('popstate', syncTabFromUrl);
  }, []);
  
  // Data States
  const [devices, setDevices] = useState<Device[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  
  // UX States
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [healthFilter, setHealthFilter] = useState<string>('ALL');
  const [custTypeFilter, setCustTypeFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Fetch all required data matrices on mount
  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setIsLoading(true);
        const [devicesRes, modelsRes, customersRes, logsRes, alertsRes] = await Promise.all([
          fetch('http://localhost:3002/api/devices'),
          fetch('http://localhost:3002/api/device-models'),
          fetch('http://localhost:3002/api/customers'),
          fetch('http://localhost:3002/api/audit-logs'),
          fetch('http://localhost:3002/api/stock-alerts')
        ]);
        
        if (devicesRes.ok) setDevices(await devicesRes.json());
        if (modelsRes.ok) await modelsRes.json();
        if (customersRes.ok) setCustomers(await customersRes.json());
        if (logsRes.ok) setAuditLogs(await logsRes.json());
        if (alertsRes.ok) setStockAlerts(await alertsRes.json());
      } catch (err) {
        console.error("Failed to load reports metrics data", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportData();
  }, []);

  // O(N + M) calculation mapping devices counts to customers
  const customerReportData = useMemo(() => {
    const countsMap = new Map<string, number>();
    devices.forEach(d => {
      if (d.customerId) {
        countsMap.set(d.customerId, (countsMap.get(d.customerId) || 0) + 1);
      }
    });
    return customers.map(c => ({
      ...c,
      dispatchCount: countsMap.get(c.id) || 0
    }));
  }, [customers, devices]);

  // Report Specific Memos with Filters & Search Queries Applied
  const filteredInventory = useMemo(() => {
    let list = [...devices];
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      list = list.filter(d => 
        d.identifier.toLowerCase().includes(q) ||
        (d.modelName || '').toLowerCase().includes(q) ||
        (d.type || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'ALL') {
      list = list.filter(d => d.status === statusFilter);
    }
    if (typeFilter !== 'ALL') {
      list = list.filter(d => d.type === typeFilter);
    }
    if (customerFilter !== 'ALL') {
      list = list.filter(d => d.customerId === customerFilter);
    }
    return list;
  }, [devices, search, statusFilter, typeFilter, customerFilter]);

  const filteredStock = useMemo(() => {
    let list = [...stockAlerts];
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      list = list.filter(s => 
        (s.brand || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.assetType || '').toLowerCase().includes(q)
      );
    }
    if (typeFilter !== 'ALL') {
      list = list.filter(s => s.assetType === typeFilter);
    }
    if (healthFilter !== 'ALL') {
      list = list.filter(s => s.level === healthFilter);
    }
    return list;
  }, [stockAlerts, search, typeFilter, healthFilter]);

  const filteredCustomers = useMemo(() => {
    let list = [...customerReportData];
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      list = list.filter(c => 
        (c.name || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
      );
    }
    if (custTypeFilter !== 'ALL') {
      list = list.filter(c => c.type === custTypeFilter);
    }
    return list;
  }, [customerReportData, search, custTypeFilter]);

  const filteredLogs = useMemo(() => {
    let list = [...auditLogs];
    if (search.trim() !== '') {
      const q = search.toLowerCase();
      list = list.filter(l => 
        (l.deviceIdentifier || '').toLowerCase().includes(q) ||
        (l.details || '').toLowerCase().includes(q)
      );
    }
    if (actionFilter !== 'ALL') {
      list = list.filter(l => l.actionType === actionFilter);
    }
    return list;
  }, [auditLogs, search, actionFilter]);

  // Compute active preview data and columns based on report type selection
  const activeReportDetails = useMemo(() => {
    switch (activeReport) {
      case 'inventory':
        return {
          title: "Active Inventory Breakdown",
          description: "Granular status and assignments of physical equipment inside warehouses.",
          headers: ["Identifier", "Brand/Model", "Asset Type", "Status", "Assigned Customer", "Staged Links"],
          data: filteredInventory,
          total: devices.length
        };
      case 'stock':
        return {
          title: "Model Stock Health & Alerts",
          description: "Model template configurations compared with real-time stock levels.",
          headers: ["Model Template", "Asset Type", "In Stock", "Max Capacity Limit", "Health Status", "% Utilized"],
          data: filteredStock,
          total: stockAlerts.length
        };
      case 'customer':
        return {
          title: "Customer Allocation Registry",
          description: "Registered corporate entities and their active dispatched hardware.",
          headers: ["Customer / Enterprise Name", "Type", "Contact Phone", "Contact Email", "Tax Identifier", "Dispatched Units"],
          data: filteredCustomers,
          total: customerReportData.length
        };
      case 'audit':
        return {
          title: "Audit & Lifecycle Trails",
          description: "Append-only registry capturing physical scans and technician operations.",
          headers: ["Operation", "Device Serial", "Details Summary", "Logged At"],
          data: filteredLogs,
          total: auditLogs.length
        };
    }
  }, [activeReport, filteredInventory, filteredStock, filteredCustomers, filteredLogs, devices, stockAlerts, customerReportData, auditLogs]);

  // Client-side Excel Exporter (SheetJS Engine)
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      // Brief aesthetic delay to highlight export progress loader
      await new Promise(resolve => setTimeout(resolve, 500));

      const reportType = activeReport;
      const dataToExport = activeReportDetails.data;
      
      if (dataToExport.length === 0) {
        throw new Error("No data available to export");
      }

      let jsonSheetData: any[] = [];

      if (reportType === 'inventory') {
        jsonSheetData = dataToExport.map((d: any) => ({
          "Device ID": d.id,
          "Serial / IMEI / ISN": d.identifier,
          "Brand": d.brand || d.modelName?.split(' ')[0] || 'Generic',
          "Model Template": d.modelName,
          "Asset Classification": d.type,
          "Inventory Status": d.status,
          "Company / Operator": d.customerName || 'In Stock',
          "Relationships count": d.linked || 0,
          "Date Added": new Date(d.createdAt).toLocaleDateString()
        }));
      } else if (reportType === 'stock') {
        jsonSheetData = dataToExport.map((s: any) => ({
          "Manufacturer": s.brand,
          "Model Name": s.name,
          "Asset Category": s.assetType,
          "Stock In-Stock": s.inStock || 0,
          "Max Target Stock": s.maxStock || 0,
          "Stock Health Tier": s.level || 'HEALTHY',
          "Capacity Percentage": s.maxStock > 0 ? `${Math.round((s.inStock / s.maxStock) * 100)}%` : '0%'
        }));
      } else if (reportType === 'customer') {
        jsonSheetData = dataToExport.map((c: any) => ({
          "Customer Name": c.name,
          "Classification": c.type,
          "Phone": c.phone || 'N/A',
          "Email": c.email || 'N/A',
          "Tax ID": c.taxId || 'N/A',
          "Total Active Dispatches": c.dispatchCount || 0
        }));
      } else if (reportType === 'audit') {
        jsonSheetData = dataToExport.map((l: any) => ({
          "Audit Log ID": l.id,
          "Device ID Reference": l.deviceId || 'N/A',
          "Device Identifier": l.deviceIdentifier || 'N/A',
          "Action Code": l.actionType,
          "Action Details": l.details,
          "Logged Timestamp": new Date(l.createdAt).toLocaleString()
        }));
      }

      const worksheet = XLSX.utils.json_to_sheet(jsonSheetData);

      // Force text format for long numeric identifiers to prevent scientific notation (e.g. 8.69066E+14)
      if (jsonSheetData.length > 0) {
        const headers = Object.keys(jsonSheetData[0] || {});
        const textColumnIndices: number[] = [];
        headers.forEach((header, idx) => {
          const lowerHeader = header.toLowerCase();
          const isTextId = lowerHeader === 'id' || 
                           lowerHeader.split(/[^a-z]/).includes('id') || 
                           lowerHeader.includes('uuid') ||
                           lowerHeader.includes('guid') ||
                           lowerHeader.includes('identifier') ||
                           lowerHeader.includes('serial') ||
                           lowerHeader.includes('imei') ||
                           lowerHeader.includes('isn') ||
                           lowerHeader.includes('phone') ||
                           lowerHeader.includes('tax');
          if (isTextId) {
            textColumnIndices.push(idx);
          }
        });

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          textColumnIndices.forEach(c => {
            const cellAddress = XLSX.utils.encode_cell({ r, c });
            const cell = worksheet[cellAddress];
            if (cell) {
              cell.t = 's'; // Force cell type to String
              cell.v = String(cell.v); // Ensure value is represented as a string
              if (cell.w) delete cell.w; // Delete formatted text cache so Excel parses it raw
            }
          });
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "IMS Report");

      // Auto-fit column width padding for optimal presentation
      const maxColWidths = jsonSheetData.reduce((acc: any, row: any) => {
        Object.keys(row).forEach((key, colIdx) => {
          const contentLen = String(row[key] ?? '').length;
          const labelLen = key.length;
          acc[colIdx] = Math.max(acc[colIdx] || 0, contentLen, labelLen);
        });
        return acc;
      }, []);
      worksheet['!cols'] = maxColWidths.map((w: number) => ({ w: w + 2 }));

      XLSX.writeFile(workbook, `ims_export_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
      playSuccessBeep();
    } catch (err) {
      console.error(err);
      playErrorBuzz();
    } finally {
      setIsExporting(false);
    }
  };

  // CSV Fallback export compiling string with UTF-8 BOM
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      await new Promise(resolve => setTimeout(resolve, 400));

      const reportType = activeReport;
      const dataToExport = activeReportDetails.data;

      if (dataToExport.length === 0) {
        throw new Error("No data available to export");
      }

      let exportRows: any[] = [];

      if (reportType === 'inventory') {
        exportRows = dataToExport.map((d: any) => ({
          "Device_ID": d.id,
          "Identifier": d.identifier,
          "Model": d.modelName,
          "Classification": d.type,
          "Status": d.status,
          "Customer_Name": d.customerName || 'IN_STOCK',
          "Date_Added": new Date(d.createdAt).toISOString()
        }));
      } else if (reportType === 'stock') {
        exportRows = dataToExport.map((s: any) => ({
          "Brand": s.brand,
          "Model_Name": s.name,
          "Asset_Type": s.assetType,
          "In_Stock": s.inStock,
          "Max_Capacity": s.maxStock,
          "Health_Status": s.level
        }));
      } else if (reportType === 'customer') {
        exportRows = dataToExport.map((c: any) => ({
          "Customer_Name": c.name,
          "Type": c.type,
          "Email": c.email || '',
          "Phone": c.phone || '',
          "Tax_ID": c.taxId || '',
          "Dispatch_Count": c.dispatchCount
        }));
      } else if (reportType === 'audit') {
        exportRows = dataToExport.map((l: any) => ({
          "Log_ID": l.id,
          "Identifier": l.deviceIdentifier || '',
          "Action": l.actionType,
          "Details": l.details,
          "Logged_At": l.createdAt
        }));
      }

      const headers = Object.keys(exportRows[0]);
      const csvContent = [
        headers.join(','),
        ...exportRows.map(row => 
          headers.map(header => {
            const val = String(row[header] ?? '');
            const lowerHeader = header.toLowerCase();
            const isTextId = lowerHeader === 'id' || 
                             lowerHeader.split(/[^a-z]/).includes('id') || 
                             lowerHeader.includes('uuid') ||
                             lowerHeader.includes('guid') ||
                             lowerHeader.includes('identifier') ||
                             lowerHeader.includes('serial') ||
                             lowerHeader.includes('imei') ||
                             lowerHeader.includes('isn') ||
                             lowerHeader.includes('phone') ||
                             lowerHeader.includes('tax');
            
            if (isTextId && /^\d+$/.test(val)) {
              // Wrap purely numeric identifiers in formula quotes (="...") to force Excel to render them as text
              return `="` + val.replace(/"/g, '""') + `"`;
            }
            // Escape double quotes and wrap in quotes if spaces/commas exist
            return `"${val.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\r\n');

      // Prep download link
      const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `ims_export_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playSuccessBeep();
    } catch (err) {
      console.error(err);
      playErrorBuzz();
    } finally {
      setIsExporting(false);
    }
  };

  // Quick helper reset filters when switching between tabs
  const handleReportTabChange = (tab: ReportType) => {
    setActiveReport(tab);
    setSearch('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setCustomerFilter('ALL');
    setHealthFilter('ALL');
    setCustTypeFilter('ALL');
    setActionFilter('ALL');
  };

  return (
    <AppShell>
      <div className="space-y-6">
        
        {/* Header Block */}
        <div className="flex flex-col gap-1.5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" /> Reports Console
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Compile lifecycle metrics, inventory counts, and customer allocation details. Export directly to spreadsheets.
            </p>
          </div>
        </div>

        {/* Reports Type Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <button 
            type="button"
            onClick={() => handleReportTabChange('inventory')}
            className={`text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col justify-between h-28 ${
              activeReport === 'inventory' 
                ? 'border-primary/80 bg-primary/5 shadow-sm ring-1 ring-primary/45' 
                : 'border-border bg-card hover:bg-muted/40 hover:border-border-hover'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`p-1.5 rounded-md ${activeReport === 'inventory' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Database className="h-4 w-4" />
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-medium">Inventory</span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-semibold text-foreground">Active Inventory</h3>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">Asset status, metadata and assignments.</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => handleReportTabChange('stock')}
            className={`text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col justify-between h-28 ${
              activeReport === 'stock' 
                ? 'border-primary/80 bg-primary/5 shadow-sm ring-1 ring-primary/45' 
                : 'border-border bg-card hover:bg-muted/40 hover:border-border-hover'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`p-1.5 rounded-md ${activeReport === 'stock' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <TrendingUp className="h-4 w-4" />
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-medium">Capacities</span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-semibold text-foreground">Stock Capacity & Health</h3>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">Capacities vs real-time stock tiers.</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => handleReportTabChange('customer')}
            className={`text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col justify-between h-28 ${
              activeReport === 'customer' 
                ? 'border-primary/80 bg-primary/5 shadow-sm ring-1 ring-primary/45' 
                : 'border-border bg-card hover:bg-muted/40 hover:border-border-hover'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`p-1.5 rounded-md ${activeReport === 'customer' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <Users className="h-4 w-4" />
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-medium">Distributions</span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-semibold text-foreground">Customer Allocations</h3>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">Dispatched device models by client.</p>
            </div>
          </button>

          <button 
            type="button"
            onClick={() => handleReportTabChange('audit')}
            className={`text-left p-4 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col justify-between h-28 ${
              activeReport === 'audit' 
                ? 'border-primary/80 bg-primary/5 shadow-sm ring-1 ring-primary/45' 
                : 'border-border bg-card hover:bg-muted/40 hover:border-border-hover'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className={`p-1.5 rounded-md ${activeReport === 'audit' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                <FileText className="h-4 w-4" />
              </span>
              <span className="text-[10px] text-muted-foreground font-mono font-medium">Logs</span>
            </div>
            <div className="mt-3">
              <h3 className="text-xs font-semibold text-foreground">Lifecycle Audit logs</h3>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">Technician scan operations timeline.</p>
            </div>
          </button>

        </div>

        {/* Filter Panel & Console Area */}
        <div className="border border-border rounded-lg bg-card p-5 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-3 border-b border-border/80">
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-foreground">{activeReportDetails.title}</h2>
              <p className="text-[11px] text-muted-foreground">{activeReportDetails.description}</p>
            </div>
            
            {/* Export buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isLoading || isExporting || activeReportDetails.data.length === 0}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 disabled:opacity-50 cursor-pointer gap-1.5"
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isLoading || isExporting || activeReportDetails.data.length === 0}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-8 px-3 disabled:opacity-50 cursor-pointer gap-1.5 font-semibold"
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Export to Excel
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-muted/10 p-3 rounded-lg border border-border/50">
            
            {/* Search query */}
            <div className="relative col-span-1 sm:col-span-2 md:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Fuzzy search matching terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8.5 w-full rounded-md border border-input bg-card pl-8.5 pr-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-sans"
              />
            </div>

            {/* Inventory Type Filter (Inventory & Stock Health) */}
            {(activeReport === 'inventory' || activeReport === 'stock') && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8.5 text-xs bg-card border-input">
                  <SelectValue placeholder="Filter Asset Type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL" className="text-xs">All Asset Types</SelectItem>
                  <SelectItem value="TRACKER" className="text-xs">Trackers</SelectItem>
                  <SelectItem value="SIM" className="text-xs">SIM Cards</SelectItem>
                  <SelectItem value="SD_CARD" className="text-xs">SD Cards</SelectItem>
                  <SelectItem value="PANIC_BUTTON" className="text-xs">Panic Buttons</SelectItem>
                  <SelectItem value="DASH_CAM" className="text-xs">Dash Cams</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Inventory Status Filter */}
            {activeReport === 'inventory' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8.5 text-xs bg-card border-input">
                  <SelectValue placeholder="Filter Device Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL" className="text-xs">All Statuses</SelectItem>
                  <SelectItem value="IN_STOCK" className="text-xs">In Stock</SelectItem>
                  <SelectItem value="DISPATCHED" className="text-xs">Dispatched</SelectItem>
                  <SelectItem value="TESTING" className="text-xs">Testing</SelectItem>
                  <SelectItem value="DAMAGED" className="text-xs">Damaged</SelectItem>
                  <SelectItem value="RMA" className="text-xs">RMA Swap</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Inventory Customer Filter */}
            {activeReport === 'inventory' && (
              <Select value={customerFilter} onValueChange={setCustomerFilter}>
                <SelectTrigger className="h-8.5 text-xs bg-card border-input">
                  <SelectValue placeholder="Filter Customer" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL" className="text-xs">All Customers</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Stock Health Level Filter */}
            {activeReport === 'stock' && (
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="h-8.5 text-xs bg-card border-input">
                  <SelectValue placeholder="Filter Stock Status" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL" className="text-xs">All Stock Health Levels</SelectItem>
                  <SelectItem value="HEALTHY" className="text-xs">Healthy (60%+)</SelectItem>
                  <SelectItem value="WARNING" className="text-xs">Warning (30-59%)</SelectItem>
                  <SelectItem value="LOW" className="text-xs">Low Stock (&lt;30%)</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Customer Type Filter */}
            {activeReport === 'customer' && (
              <Select value={custTypeFilter} onValueChange={setCustTypeFilter}>
                <SelectTrigger className="h-8.5 text-xs bg-card border-input">
                  <SelectValue placeholder="Filter Client Type" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL" className="text-xs">All Customer Types</SelectItem>
                  <SelectItem value="COMPANY" className="text-xs">Corporations / Fleets</SelectItem>
                  <SelectItem value="PERSON" className="text-xs">Individuals</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Audit Log Action Filter */}
            {activeReport === 'audit' && (
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-8.5 text-xs bg-card border-input">
                  <SelectValue placeholder="Filter Audit Action" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="ALL" className="text-xs">All Operations</SelectItem>
                  <SelectItem value="INGEST" className="text-xs">Ingestion (Bulk/Single)</SelectItem>
                  <SelectItem value="LINK" className="text-xs">Link Creation</SelectItem>
                  <SelectItem value="UNLINK" className="text-xs">Unlink Break</SelectItem>
                  <SelectItem value="STATUS_CHANGE" className="text-xs">Status Transition</SelectItem>
                  <SelectItem value="SWAP" className="text-xs">RMA Swap Replacement</SelectItem>
                  <SelectItem value="DELETE" className="text-xs">Decommission Unit</SelectItem>
                </SelectContent>
              </Select>
            )}

          </div>

          {/* Table Preview Grid */}
          <div className="relative border border-border/80 rounded-lg overflow-hidden bg-card">
            
            {isLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : activeReportDetails.data.length === 0 ? (
              <div className="p-4 bg-muted/5">
                <EmptyState
                  icon={Search}
                  title="No matching records"
                  description="No reports data matches the selected search queries and filter options. Try adjusting filters."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/30">
                    {activeReportDetails.headers.map((h, i) => (
                      <TableHead key={i} className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 py-2.5 px-3">
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Show top 15 rows for live previews */}
                  {activeReportDetails.data.slice(0, 15).map((row: any, idx: number) => {
                    if (activeReport === 'inventory') {
                      return (
                        <TableRow key={row.id || idx} className="hover:bg-muted/30 border-b border-border/50">
                          <TableCell className="font-mono text-[11px] font-semibold text-foreground px-3 py-2">
                            {row.identifier}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground/90 px-3 py-2">
                            {row.modelName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-3 py-2">
                            <span className="bg-muted text-muted-foreground/80 border border-border/40 px-1.5 py-0.5 rounded text-[10px] font-medium font-sans">
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2">
                            {row.status === 'IN_STOCK' && <span className="text-emerald-600 dark:text-emerald-500 font-semibold">🟢 In Stock</span>}
                            {row.status === 'DISPATCHED' && <span className="text-blue-600 dark:text-blue-400 font-semibold font-sans">🔵 Dispatched</span>}
                            {row.status === 'TESTING' && <span className="text-amber-500 font-semibold">🟡 Testing</span>}
                            {row.status === 'DAMAGED' && <span className="text-red-500 font-semibold">🔴 Damaged</span>}
                            {row.status === 'RMA' && <span className="text-amber-600 font-semibold">🟠 RMA Swap</span>}
                          </TableCell>
                          <TableCell className="text-xs text-foreground/80 px-3 py-2 max-w-xs truncate">
                            {row.customerName || <span className="text-muted-foreground/40 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono px-3 py-2">
                            {row.linked > 0 ? (
                              <span className="text-primary font-semibold">{row.linked} link{row.linked > 1 ? 's' : ''}</span>
                            ) : (
                              <span className="text-muted-foreground/30">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    if (activeReport === 'stock') {
                      return (
                        <TableRow key={row.id || idx} className="hover:bg-muted/30 border-b border-border/50">
                          <TableCell className="text-xs font-semibold text-foreground px-3 py-2">
                            {row.brand} {row.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-3 py-2">
                            <span className="bg-muted text-muted-foreground/80 border border-border/40 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {row.assetType}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-foreground px-3 py-2">
                            {row.inStock}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground px-3 py-2">
                            {row.maxStock > 0 ? row.maxStock : <span className="text-muted-foreground/30 italic">No limit</span>}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2">
                            {row.level === 'LOW' && (
                              <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                CRITICAL LOW
                              </span>
                            )}
                            {row.level === 'WARNING' && (
                              <span className="bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                WARNING ALERT
                              </span>
                            )}
                            {row.level === 'HEALTHY' && (
                              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                HEALTHY
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-medium text-foreground px-3 py-2">
                            {row.maxStock > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-12 bg-muted h-1.5 rounded overflow-hidden">
                                  <div 
                                    className={`h-full ${row.level === 'LOW' ? 'bg-red-500' : row.level === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${Math.min((row.inStock / row.maxStock) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[10px]">{Math.round((row.inStock / row.maxStock) * 100)}%</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/30 font-sans italic">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    if (activeReport === 'customer') {
                      return (
                        <TableRow key={row.id || idx} className="hover:bg-muted/30 border-b border-border/50">
                          <TableCell className="text-xs font-semibold text-foreground px-3 py-2">
                            {row.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-3 py-2">
                            <span className="bg-muted text-muted-foreground/80 border border-border/40 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-foreground/80 px-3 py-2 font-mono">
                            {row.phone || <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-foreground/80 px-3 py-2 font-mono">
                            {row.email || <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono px-3 py-2">
                            {row.taxId || <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-primary px-3 py-2">
                            {row.dispatchCount} units
                          </TableCell>
                        </TableRow>
                      );
                    }

                    if (activeReport === 'audit') {
                      return (
                        <TableRow key={row.id || idx} className="hover:bg-muted/30 border-b border-border/50">
                          <TableCell className="text-xs px-3 py-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              row.actionType === 'INGEST' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20' :
                              row.actionType === 'LINK' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' :
                              row.actionType === 'STATUS_CHANGE' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20' :
                              row.actionType === 'SWAP' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20' :
                              row.actionType === 'DELETE' ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' :
                              'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20'
                            }`}>
                              {row.actionType}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] font-semibold text-foreground px-3 py-2">
                            {row.deviceIdentifier || <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-foreground/80 px-3 py-2 max-w-sm truncate" title={row.details}>
                            {row.details}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono px-3 py-2">
                            {new Date(row.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    return null;
                  })}
                </TableBody>
              </Table>
            )}

            {/* Preview limit caption bar */}
            {!isLoading && activeReportDetails.data.length > 15 && (
              <div className="p-2.5 bg-muted/10 border-t border-border flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center">
                <Info className="h-3 w-3" />
                <span>Showing top 15 records in the live preview. Download to export the full breakdown of {activeReportDetails.data.length} records.</span>
              </div>
            )}

          </div>

          {/* Report Metadata Info Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-muted-foreground gap-2 pt-1.5">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-foreground font-mono">{activeReportDetails.data.length}</span>
              <span>of</span>
              <span className="font-semibold text-foreground font-mono">{activeReportDetails.total}</span>
              <span>records match the applied parameters.</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] bg-muted/40 px-2 py-0.5 rounded border border-border/40 font-mono uppercase">
              <Calendar className="h-2.5 w-2.5 mr-0.5 text-muted-foreground" />
              Compiled At {new Date().toLocaleTimeString()}
            </div>
          </div>

        </div>

      </div>
    </AppShell>
  );
};
