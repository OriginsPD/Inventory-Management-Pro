import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@ims_pro/ui/components/table';
import { TableSkeleton } from '@/components/ui/loading';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenLayout, ScreenHeader, Stagger, StaggerItem } from '@/components/ui/motion';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@ims_pro/ui/components/select';
import ExcelJS from 'exceljs';
import { playSuccessBeep, playErrorBuzz } from '@/lib/audio';
import { useDevices, useCustomers } from '@/lib/hooks/useDomain';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Device, Customer, AuditLog } from '@/lib/types/domain';
import { InlineErrorState } from '@/components/ui/inline-error-state';

interface StockAlert {
  id: string;
  brand: string;
  name: string;
  assetType: string;
  inStock: number;
  maxStock: number;
  level: 'HEALTHY' | 'WARNING' | 'LOW';
}

type ReportType = 'inventory' | 'stock' | 'customer' | 'audit';

export const ReportsScreen = () => {
  const [activeReport, setActiveReport] = useState<ReportType>('inventory');

  const {
    data: devices = [],
    isLoading: isLoadingDevices,
    isError: isDevicesError,
    error: devicesError,
    refetch: refetchDevices
  } = useDevices();
  const {
    data: customers = [],
    isLoading: isLoadingCustomers,
    isError: isCustomersError,
    error: customersError,
    refetch: refetchCustomers
  } = useCustomers();
  
  const {
    data: auditLogs = [],
    isLoading: isLoadingLogs,
    isError: isAuditLogsError,
    error: auditLogsError,
    refetch: refetchAuditLogs
  } = useQuery({
    queryKey: ['audit-logs-full'],
    queryFn: () => apiClient.get<AuditLog[]>('/api/audit-logs'),
  });

  const {
    data: stockAlerts = [],
    isLoading: isLoadingAlerts,
    isError: isStockAlertsError,
    error: stockAlertsError,
    refetch: refetchStockAlerts
  } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () => apiClient.get<StockAlert[]>('/api/stock-alerts'),
  });

  const isLoading = isLoadingDevices || isLoadingCustomers || isLoadingLogs || isLoadingAlerts;
  const activeReportError =
    activeReport === 'inventory' ? devicesError :
    activeReport === 'stock' ? stockAlertsError :
    activeReport === 'customer' ? customersError || devicesError :
    auditLogsError;
  const isActiveReportError =
    activeReport === 'inventory' ? isDevicesError :
    activeReport === 'stock' ? isStockAlertsError :
    activeReport === 'customer' ? isCustomersError || isDevicesError :
    isAuditLogsError;

  const retryActiveReport = () => {
    if (activeReport === 'inventory') {
      refetchDevices();
    } else if (activeReport === 'stock') {
      refetchStockAlerts();
    } else if (activeReport === 'customer') {
      refetchCustomers();
      refetchDevices();
    } else {
      refetchAuditLogs();
    }
  };
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');
  
  // Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');
  const [healthFilter, setHealthFilter] = useState<string>('ALL');
  const [custTypeFilter, setCustTypeFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');



  // O(N + M) calculation mapping devices counts to customers
  const customerReportData = useMemo(() => {
    const countsMap = new Map<string, number>();
    devices.forEach((d: Device) => {
      if (d.customerId) {
        countsMap.set(d.customerId, (countsMap.get(d.customerId) || 0) + 1);
      }
    });
    return customers.map((c: Customer) => ({
      ...c,
      dispatchCount: countsMap.get(c.id || '') || 0
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

  // Client-side Excel Exporter
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
        jsonSheetData = dataToExport.map((d: any) => {
          const rowData: any = {
            "Device ID": d.id,
            "Serial / IMEI / ISN": d.identifier,
            "Brand": d.brand || d.modelName?.split(' ')[0] || 'Generic',
            "Model Template": d.modelName,
            "Asset Classification": d.type,
            "Inventory Status": d.status,
            "Company / Operator": d.customerName || 'In Stock',
            "Relationships count": d.linked || 0,
            "Date Added": new Date(d.createdAt).toLocaleDateString()
          };
          if (d.metadata && typeof d.metadata === 'object') {
            Object.entries(d.metadata).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                const label = key
                  .replace(/([A-Z])/g, ' $1')
                  .replace(/^./, str => str.toUpperCase())
                  .trim();
                rowData[label] = typeof value === 'object' ? JSON.stringify(value) : value;
              }
            });
          }
          return rowData;
        });
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

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Amber Connect';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet('IMS Report');
      const headers = Array.from(new Set(jsonSheetData.flatMap(row => Object.keys(row))));
      const isTextIdentifier = (header: string) => {
        const lowerHeader = header.toLowerCase();
        return lowerHeader === 'id' ||
          lowerHeader.split(/[^a-z]/).includes('id') ||
          lowerHeader.includes('uuid') ||
          lowerHeader.includes('guid') ||
          lowerHeader.includes('identifier') ||
          lowerHeader.includes('serial') ||
          lowerHeader.includes('imei') ||
          lowerHeader.includes('isn') ||
          lowerHeader.includes('phone') ||
          lowerHeader.includes('tax');
      };

      worksheet.columns = headers.map(header => ({
        header,
        key: header,
        width: Math.max(
          header.length + 2,
          ...jsonSheetData.map(row => String(row[header] ?? '').length + 2)
        ),
        style: isTextIdentifier(header) ? { numFmt: '@' } : undefined,
      }));

      jsonSheetData.forEach(row => {
        const safeRow = { ...row };
        headers.forEach(header => {
          if (isTextIdentifier(header) && safeRow[header] !== undefined && safeRow[header] !== null) {
            safeRow[header] = String(safeRow[header]);
          }
        });
        worksheet.addRow(safeRow);
      });

      worksheet.getRow(1).font = { bold: true };
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ims_export_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
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
        exportRows = dataToExport.map((d: any) => {
          const rowData: any = {
            "Device_ID": d.id,
            "Identifier": d.identifier,
            "Model": d.modelName,
            "Classification": d.type,
            "Status": d.status,
            "Customer_Name": d.customerName || 'IN_STOCK',
            "Date_Added": new Date(d.createdAt).toISOString()
          };
          if (d.metadata && typeof d.metadata === 'object') {
            Object.entries(d.metadata).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                const label = key
                  .replace(/([A-Z])/g, '_$1')
                  .toUpperCase()
                  .trim();
                rowData[label] = typeof value === 'object' ? JSON.stringify(value) : value;
              }
            });
          }
          return rowData;
        });
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

      const headers = Array.from(new Set(exportRows.flatMap(row => Object.keys(row))));
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
    <ScreenLayout className="space-y-6">
        <ScreenHeader
          title="Reports Console"
          description="Compile lifecycle metrics, inventory counts, and customer allocation details. Export directly to spreadsheets."
        />

        <Stagger className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'inventory', icon: 'database', title: 'Active Inventory', label: 'Inventory', desc: 'Asset status, metadata and assignments.' },
            { id: 'stock', icon: 'trending_up', title: 'Stock Capacity & Health', label: 'Capacities', desc: 'Capacities vs real-time stock tiers.' },
            { id: 'customer', icon: 'group', title: 'Customer Allocations', label: 'Distributions', desc: 'Dispatched device models by client.' },
            { id: 'audit', icon: 'article', title: 'Lifecycle Audit logs', label: 'Logs', desc: 'Technician scan operations timeline.' }
          ].map((tab) => {
            const isActive = activeReport === tab.id;
            return (
              <StaggerItem key={tab.id}>
              <button
                type="button"
                onClick={() => handleReportTabChange(tab.id as ReportType)}
                className={`text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col justify-between h-28 w-full glass-panel glow-accent-hover ${
                  isActive 
                    ? 'border-primary/80 bg-primary/10 shadow-sm glow-accent ring-1 ring-primary/30' 
                    : 'border-primary/10 hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`p-1.5 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary/20 text-primary' : 'bg-primary/5 text-muted-foreground'}`}>
                    <span className="material-symbols-outlined text-base select-none">{tab.icon}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono font-medium tracking-wide uppercase">{tab.label}</span>
                </div>
                <div className="mt-3">
                  <h3 className={`text-xs font-bold transition-colors ${isActive ? 'text-primary' : 'text-foreground'}`}>{tab.title}</h3>
                  <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{tab.desc}</p>
                </div>
              </button>
              </StaggerItem>
            );
          })}
        </Stagger>

        <StaggerItem>
        <div className="glass-panel rounded-2xl p-5 space-y-4 glow-accent">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-4 border-b border-primary/10">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">{activeReportDetails.title}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">{activeReportDetails.description}</p>
            </div>
            
            {/* Export buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isLoading || isExporting || activeReportDetails.data.length === 0}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-semibold transition-all border border-primary/10 bg-primary/5 text-foreground hover:bg-primary/10 h-8.5 px-3.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer gap-1.5"
              >
                <span className="material-symbols-outlined text-sm select-none">download</span> CSV
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isLoading || isExporting || activeReportDetails.data.length === 0}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground hover:bg-primary/90 h-8.5 px-3.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer gap-1.5"
              >
                {isExporting ? (
                  <span className="material-symbols-outlined text-sm animate-spin select-none">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-sm select-none">download</span>
                )}
                Export to Excel
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-primary/5 p-3 rounded-xl border border-primary/10">
            
            {/* Search query */}
            <div className="relative col-span-1 sm:col-span-2 md:col-span-1">
              <span className="absolute left-2.5 top-2.5 material-symbols-outlined text-muted-foreground text-base select-none">search</span>
              <input
                type="text"
                placeholder="Fuzzy search matching terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-primary/10 bg-primary/5 pl-9 pr-3 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/20 focus:border-primary/20 font-sans transition-all"
              />
            </div>

            {/* Inventory Type Filter (Inventory & Stock Health) */}
            {(activeReport === 'inventory' || activeReport === 'stock') && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-xs bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20">
                  <SelectValue placeholder="Filter Asset Type" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-primary/10">
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
                <SelectTrigger className="h-9 text-xs bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20">
                  <SelectValue placeholder="Filter Device Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-primary/10">
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
                <SelectTrigger className="h-9 text-xs bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20">
                  <SelectValue placeholder="Filter Customer" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-primary/10">
                  <SelectItem value="ALL" className="text-xs">All Customers</SelectItem>
                  {customers.map((c: Customer) => (
                    <SelectItem key={c.id || ''} value={c.id || ''} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Stock Health Level Filter */}
            {activeReport === 'stock' && (
              <Select value={healthFilter} onValueChange={setHealthFilter}>
                <SelectTrigger className="h-9 text-xs bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20">
                  <SelectValue placeholder="Filter Stock Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-primary/10">
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
                <SelectTrigger className="h-9 text-xs bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20">
                  <SelectValue placeholder="Filter Client Type" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-primary/10">
                  <SelectItem value="ALL" className="text-xs">All Customer Types</SelectItem>
                  <SelectItem value="COMPANY" className="text-xs">Corporations / Fleets</SelectItem>
                  <SelectItem value="PERSON" className="text-xs">Individuals</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Audit Log Action Filter */}
            {activeReport === 'audit' && (
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="h-9 text-xs bg-primary/5 border border-primary/10 rounded-lg text-foreground focus:ring-primary/20">
                  <SelectValue placeholder="Filter Audit Action" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-primary/10">
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
          <div className="relative border border-primary/10 rounded-xl overflow-hidden bg-primary/5 backdrop-filter backdrop-blur-md">
            
            {isLoading ? (
              <div className="p-8">
                <TableSkeleton rows={5} wrapped={false} />
              </div>
            ) : isActiveReportError ? (
              <div className="p-4 bg-transparent">
                <InlineErrorState
                  title="Report data failed to load"
                  description="The selected report source could not be loaded. Retry the report before exporting."
                  error={activeReportError}
                  onRetry={retryActiveReport}
                />
              </div>
            ) : activeReportDetails.data.length === 0 ? (
              <div className="p-4 bg-transparent">
                <EmptyState
                  icon="search"
                  title="No matching records"
                  description="No reports data matches the selected search queries and filter options. Try adjusting filters."
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-primary/10 border-b border-primary/10">
                    {activeReportDetails.headers.map((h, i) => (
                      <TableHead key={i} className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80 py-3 px-4">
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
                        <TableRow key={row.id || idx} className="hover:bg-primary/5 border-b border-primary/5 transition-all">
                          <TableCell className="font-mono text-[11px] font-semibold text-foreground px-4 py-2.5">
                            {row.identifier}
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-foreground/90 px-4 py-2.5">
                            {row.modelName}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-4 py-2.5">
                            <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[10px] font-medium font-sans">
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs px-4 py-2.5">
                            {row.status === 'IN_STOCK' && <span className="text-emerald-400 font-semibold flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />In Stock</span>}
                            {row.status === 'DISPATCHED' && <span className="text-sky-400 font-semibold flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-sky-400" />Dispatched</span>}
                            {row.status === 'TESTING' && <span className="text-amber-400 font-semibold flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />Testing</span>}
                            {row.status === 'DAMAGED' && <span className="text-red-400 font-semibold flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />Damaged</span>}
                            {row.status === 'RMA' && <span className="text-amber-500 font-semibold flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />RMA Swap</span>}
                          </TableCell>
                          <TableCell className="text-xs text-foreground/80 px-4 py-2.5 max-w-xs truncate">
                            {row.customerName || <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono px-4 py-2.5">
                            {row.linked > 0 ? (
                              <span className="text-primary font-semibold">{row.linked} link{row.linked > 1 ? 's' : ''}</span>
                            ) : (
                              <span className="text-muted-foreground/20">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    if (activeReport === 'stock') {
                      return (
                        <TableRow key={row.id || idx} className="hover:bg-primary/5 border-b border-primary/5 transition-all">
                          <TableCell className="text-xs font-semibold text-foreground px-4 py-2.5">
                            {row.brand} {row.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-4 py-2.5">
                            <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[10px] font-medium">
                              {row.assetType}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-foreground px-4 py-2.5">
                            {row.inStock}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground px-4 py-2.5">
                            {row.maxStock > 0 ? row.maxStock : <span className="text-muted-foreground/30 italic">No limit</span>}
                          </TableCell>
                          <TableCell className="text-xs px-4 py-2.5">
                            {row.level === 'LOW' && (
                              <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                CRITICAL LOW
                              </span>
                            )}
                            {row.level === 'WARNING' && (
                              <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                WARNING ALERT
                              </span>
                            )}
                            {row.level === 'HEALTHY' && (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                HEALTHY
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-medium text-foreground px-4 py-2.5">
                            {row.maxStock > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-12 bg-primary/10 h-1.5 rounded overflow-hidden">
                                  <div 
                                    className={`h-full ${row.level === 'LOW' ? 'bg-red-400' : row.level === 'WARNING' ? 'bg-amber-400' : 'bg-emerald-400'}`} 
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
                        <TableRow key={row.id || idx} className="hover:bg-primary/5 border-b border-primary/5 transition-all">
                          <TableCell className="text-xs font-semibold text-foreground px-4 py-2.5">
                            {row.name}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground px-4 py-2.5">
                            <span className="bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              {row.type}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-foreground/80 px-4 py-2.5 font-mono">
                            {row.phone || <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-foreground/80 px-4 py-2.5 font-mono">
                            {row.email || <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono px-4 py-2.5">
                            {row.taxId || <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs font-mono font-bold text-primary px-4 py-2.5">
                            {row.dispatchCount} units
                          </TableCell>
                        </TableRow>
                      );
                    }

                    if (activeReport === 'audit') {
                      return (
                        <TableRow key={row.id || idx} className="hover:bg-primary/5 border-b border-primary/5 transition-all">
                          <TableCell className="text-xs px-4 py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              row.actionType === 'INGEST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              row.actionType === 'LINK' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                              row.actionType === 'STATUS_CHANGE' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              row.actionType === 'SWAP' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              row.actionType === 'DELETE' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              'bg-muted text-muted border border-border'
                            }`}>
                              {row.actionType}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] font-semibold text-foreground px-4 py-2.5">
                            {row.deviceIdentifier || <span className="text-muted-foreground/30 italic">-</span>}
                          </TableCell>
                          <TableCell className="text-xs text-foreground/80 px-4 py-2.5 max-w-sm truncate" title={row.details}>
                            {row.details}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono px-4 py-2.5">
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
            {!isLoading && !isActiveReportError && activeReportDetails.data.length > 15 && (
              <div className="p-3 bg-primary/10 border-t border-primary/10 flex items-center gap-1.5 text-[10px] text-muted-foreground justify-center">
                <span className="material-symbols-outlined text-xs text-primary select-none">info</span>
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
            <div className="flex items-center gap-1 text-[9px] bg-primary/5 px-2.5 py-1 rounded-lg border border-primary/10 font-mono uppercase tracking-wide">
              <span className="material-symbols-outlined text-[10px] text-muted-foreground mr-1 select-none">calendar_today</span>
              Compiled At {new Date().toLocaleTimeString()}
            </div>
          </div>

        </div>
        </StaggerItem>

      </ScreenLayout>
  );
};


