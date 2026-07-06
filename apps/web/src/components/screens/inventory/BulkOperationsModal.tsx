import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@ims_pro/ui/components/dialog';
import { ScrollArea } from '@ims_pro/ui/components/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@ims_pro/ui/components/select';
import {
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@ims_pro/ui/components/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Device, DeviceModel, IngestItem, ParsedLink } from '../../../lib/types/domain';
import { apiClient } from '../../../lib/api-client';
import { useFeedback } from '@/components/ui/feedback-provider';
import { playSuccessBeep, playErrorBuzz, playChirp } from '../../../lib/audio';
import { MotionDialogBody } from '@/components/ui/motion';
import ExcelJS from 'exceljs';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  models: DeviceModel[];
  onSuccess: () => void;
  isOnline: boolean;
  bufferPendingSync: (payload: BulkIngestPayload[]) => void;
  devices: Device[];
  initialScannedIdentifier?: string | null;
  onInitialScanConsumed?: () => void;
}

interface BulkIngestPayload {
  identifier: string;
  modelId: string;
  status: 'IN_STOCK';
  metadata: IngestItem['metadata'];
  type: string;
}

interface MutationResponse {
  success: boolean;
  error?: string;
  errors?: string[];
}

interface ParsedTabularFile {
  headers: string[];
  rows: string[][];
  headerRowNumber: number;
}

function cleanCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && 'text' in value) {
    return cleanCell((value as { text?: unknown }).text);
  }
  if (typeof value === 'object' && 'result' in value) {
    return cleanCell((value as { result?: unknown }).result);
  }
  if (typeof value === 'object' && 'richText' in value) {
    const richText = (value as { richText?: Array<{ text?: string }> }).richText;
    return richText?.map(part => part.text ?? '').join('').trim() ?? '';
  }
  return String(value).trim().replace(/^\uFEFF/, '').replace(/^["']|["']$/g, '');
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cleanCell(cell));
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cleanCell(cell));
      if (row.some(value => value.length > 0)) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cleanCell(cell));
  if (row.some(value => value.length > 0)) rows.push(row);
  return rows;
}

function normalizeRows(rows: string[][]): string[][] {
  return rows
    .map(row => row.map(cleanCell))
    .filter(row => row.some(cell => cell.length > 0));
}

function scoreHeaderRow(row: string[], nextRow?: string[]): number {
  const cells = row.map(cell => cell.toLowerCase());
  const joined = cells.join(' ');
  let score = 0;

  if (row.length >= 2) score += 2;
  if (/(identifier|serial|isn|imei|iccid|device|asset|tracker|sim)/i.test(joined)) score += 6;
  if (/(metadata|phone|carrier|firmware|revision|capacity|speed|color|frequency)/i.test(joined)) score += 2;
  if (cells.some(cell => cell.length > 30)) score -= 3;
  if (cells.some(cell => /(instruction|metadata|template|import|how to|notes?)/i.test(cell))) score -= 3;

  const nonEmptyCells = row.filter(cell => cell.length > 0).length;
  const uniqueCells = new Set(row.filter(cell => cell.length > 0).map(cell => cell.toLowerCase())).size;
  if (uniqueCells === nonEmptyCells) score += 1;

  if (nextRow && nextRow.some(cell => cell.length > 0)) score += 1;
  return score;
}

function makeUniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const fallback = `Column ${index + 1}`;
    const base = header.trim() || fallback;
    const count = seen.get(base.toLowerCase()) ?? 0;
    seen.set(base.toLowerCase(), count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

function extractTabularData(rawRows: string[][]): ParsedTabularFile {
  const rows = normalizeRows(rawRows);
  if (rows.length === 0) {
    throw new Error('The selected file is empty.');
  }

  let headerIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;
  rows.slice(0, 25).forEach((row, index) => {
    const score = scoreHeaderRow(row, rows[index + 1]);
    if (score > bestScore) {
      bestScore = score;
      headerIndex = index;
    }
  });

  const headers = makeUniqueHeaders(rows[headerIndex]);
  const dataRows = rows
    .slice(headerIndex + 1)
    .map(row => headers.map((_, index) => row[index] ?? ''))
    .filter(row => row.some(cell => cell.length > 0));

  if (headers.length === 0 || headers.every(header => header.length === 0)) {
    throw new Error('No column headers were found in the selected file.');
  }
  if (dataRows.length === 0) {
    throw new Error('No data rows were found after the detected header row.');
  }

  return {
    headers,
    rows: dataRows,
    headerRowNumber: headerIndex + 1,
  };
}

function isZipOrXlsx(buffer: ArrayBuffer, file: File): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 4));
  return (
    file.name.toLowerCase().endsWith('.xlsx') ||
    (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04)
  );
}

async function parseImportFile(file: File): Promise<ParsedTabularFile> {
  const buffer = await file.arrayBuffer();

  if (isZipOrXlsx(buffer, file)) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet) throw new Error('The Excel workbook does not contain any worksheets.');

    const rows: string[][] = [];
    worksheet.eachRow({ includeEmpty: false }, row => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      rows.push(values.map(cleanCell));
    });
    return extractTabularData(rows);
  }

  if (!file.name.toLowerCase().endsWith('.csv') && file.type && !file.type.includes('csv') && !file.type.includes('text')) {
    throw new Error('Unsupported file type. Upload a CSV or XLSX file.');
  }

  const text = new TextDecoder('utf-8').decode(buffer);
  return extractTabularData(parseCsv(text));
}

export const BulkOperationsModal: React.FC<BulkOperationsModalProps> = ({
  isOpen,
  onClose,
  models,
  onSuccess,
  isOnline,
  bufferPendingSync,
  devices,
  initialScannedIdentifier,
  onInitialScanConsumed,
}) => {
  const { toast } = useFeedback();
  const [bulkSubTab, setBulkSubTab] = useState<'ingest' | 'link'>('ingest');
  
  // Bulk Ingestion state
  const [bulkSelectedModelId, setBulkSelectedModelId] = useState('');
  const [bulkIngestList, setBulkIngestList] = useState<IngestItem[]>([]);
  const [scanInputText, setScanInputText] = useState('');
  const [bulkIngestError, setBulkIngestError] = useState('');
  const [duplicateCountAlert, setDuplicateCountAlert] = useState<number>(0);
  const [patternCountAlert, setPatternCountAlert] = useState<number>(0);

  // CSV Mapping state
  const [isCsvMapping, setIsCsvMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [csvHeaderRowNumber, setCsvHeaderRowNumber] = useState<number | null>(null);
  const [csvMappings, setCsvMappings] = useState({
    identifier: '',
    meta1: '',
    meta2: ''
  });

  // Bulk Linking state
  const [linkPairs, setLinkPairs] = useState<ParsedLink[]>([]);
  const [primaryScan, setPrimaryScan] = useState('');
  const [childScan, setChildScan] = useState('');
  const [linkError, setLinkError] = useState('');
  const [autoCreateDevices, setAutoCreateDevices] = useState(false);

  const scanIngestInputRef = useRef<HTMLInputElement>(null);
  const scanLinkPrimaryRef = useRef<HTMLInputElement>(null);
  const scanLinkChildRef = useRef<HTMLInputElement>(null);

  const [lastOpen, setLastOpen] = useState(false);
  const hasSelectedModel = bulkSelectedModelId.trim().length > 0;

  if (isOpen && !lastOpen) {
    setLastOpen(true);
    setBulkIngestList([]);
    setLinkPairs([]);
    setBulkIngestError('');
    setLinkError('');
    setDuplicateCountAlert(0);
    setPatternCountAlert(0);
    setIsCsvMapping(false);
    setAutoCreateDevices(false);
    setBulkSelectedModelId('');
  } else if (!isOpen && lastOpen) {
    setLastOpen(false);
  }

  // Revalidate relationships when autoCreateDevices toggle changes
  useEffect(() => {
    if (isOpen && linkPairs.length > 0) {
      const revalidate = async () => {
        const links = linkPairs.map(p => ({ primaryISN: p.primaryISN, childISN: p.childISN }));
        try {
          const data = await apiClient.post<ParsedLink[]>('/api/device-links/preview', { links, autoCreate: autoCreateDevices });
          setLinkPairs(data);
          if (data.some((d) => d.status === 'invalid')) playErrorBuzz();
          else playSuccessBeep();
        } catch {
          setLinkError('Failed to revalidate relationship pairings.');
          playErrorBuzz();
        }
      };
      revalidate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreateDevices]);

  const getSelectedModelType = (id: string) => {
    const m = models.find(x => x.id === id);
    return m ? m.assetType : 'TRACKER';
  };

  const bulkAssetType = getSelectedModelType(bulkSelectedModelId);

  // -- INGESTION LOGIC --

  const processIngestionList = useCallback((list: IngestItem[]) => {
    const selectedModel = models.find(m => m.id === bulkSelectedModelId);
    let invalidPatternCount = 0;
    let patternMatchedList = list;

    if (selectedModel && selectedModel.identifierPattern) {
      try {
        const regex = new RegExp(selectedModel.identifierPattern, 'i');
        patternMatchedList = list.filter(item => {
          const isValid = regex.test(item.identifier);
          if (!isValid) invalidPatternCount++;
          return isValid;
        });
      } catch {
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
  }, [bulkIngestList, bulkSelectedModelId, devices, models]);

  useEffect(() => {
    if (!isOpen || !initialScannedIdentifier) return;
    if (!bulkSelectedModelId) return;

    const timer = window.setTimeout(() => {
      processIngestionList([{ identifier: initialScannedIdentifier, metadata: {} }]);
      setBulkSubTab('ingest');
      onInitialScanConsumed?.();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, initialScannedIdentifier, bulkSelectedModelId, models, onInitialScanConsumed, processIngestionList]);

  const handleIngestCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    if (!hasSelectedModel) {
      setBulkIngestError('Select a target template model before uploading files.');
      playErrorBuzz();
      e.target.value = '';
      return;
    }
    const file = e.target.files[0];
    setDuplicateCountAlert(0);
    setPatternCountAlert(0);
    setBulkIngestError('');
    try {
      const { headers, rows, headerRowNumber } = await parseImportFile(file);
      setCsvHeaders(headers);
      setCsvRows(rows);
      setCsvHeaderRowNumber(headerRowNumber);
      setIsCsvMapping(true);
      playChirp();

      setCsvMappings({
        identifier: headers[0] || '',
        meta1: headers[1] || '__none__',
        meta2: headers[2] || '__none__'
      });
    } catch (error) {
      setBulkIngestError(error instanceof Error ? error.message : 'Failed to parse import file.');
      setIsCsvMapping(false);
      setCsvHeaders([]);
      setCsvRows([]);
      setCsvHeaderRowNumber(null);
      playErrorBuzz();
    }
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

      const metadata: IngestItem['metadata'] = {};
      if (serial) {
        metadata.field1 = meta1;
        metadata.field2 = meta2;

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
    setIsCsvMapping(false);
    setCsvHeaders([]);
    setCsvRows([]);
    setCsvHeaderRowNumber(null);
    playSuccessBeep();
  };



  const handleBulkIngestSubmit = async () => {
    if (!hasSelectedModel || bulkIngestList.length === 0 || !bulkSelectedModelId) {
      setBulkIngestError('Please scan devices or upload a CSV first.');
      playErrorBuzz();
      return;
    }

    const payload: BulkIngestPayload[] = bulkIngestList.map(item => ({
      identifier: item.identifier,
      modelId: bulkSelectedModelId,
      status: 'IN_STOCK',
      metadata: item.metadata,
      type: bulkAssetType
    }));

    if (!isOnline) {
      bufferPendingSync(payload);
      toast.info('Offline mode: Bulk ingestion cached to local sync buffer.');
      setBulkIngestList([]);
      onClose();
      return;
    }

    try {
      const data = await apiClient.post<MutationResponse>('/api/devices/bulk', { devices: payload });
      if (data.success) {
        toast.success(`Successfully ingested ${payload.length} devices.`);
        setBulkIngestList([]);
        onSuccess();
        onClose();
        playSuccessBeep();
      } else {
        bufferPendingSync(payload);
        toast.info('Bulk ingestion cached to local sync buffer due to server validation failure.');
        setBulkIngestList([]);
        onClose();
      }
    } catch {
      bufferPendingSync(payload);
      toast.info('Bulk ingestion cached to local sync buffer due to connection error.');
      setBulkIngestList([]);
      onClose();
    }
  };

  const handleUpdateItemMeta = (index: number, key: string, value: string) => {
    setBulkIngestList(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        metadata: { ...copy[index].metadata, [key]: value }
      };
      return copy;
    });
  };

  // -- LINKING LOGIC --

  const handleLinkCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setLinkError('');
    try {
      const { rows } = await parseImportFile(file);
      const links = rows.map(row => ({
        primaryISN: row[0] || '',
        childISN: row[1] || ''
      })).filter(pair => pair.primaryISN && pair.childISN);

      if (links.length === 0) {
        setLinkError('No valid relationship rows were found in the selected file.');
        playErrorBuzz();
        return;
      }

      const data = await apiClient.post<ParsedLink[]>('/api/device-links/preview', { links, autoCreate: autoCreateDevices });
      setLinkPairs(data);
      if (data.some((d) => d.status === 'invalid')) playErrorBuzz();
      else playSuccessBeep();
    } catch (error) {
      setLinkError(error instanceof Error ? error.message : 'Failed to preview imported relationships.');
      playErrorBuzz();
    } finally {
      e.target.value = '';
    }
  };

  const triggerManualLinkScan = async () => {
    if (!primaryScan || !childScan) return;
    setLinkError('');
    try {
      const data = await apiClient.post<ParsedLink[]>('/api/device-links/preview', {
        links: [{ primaryISN: primaryScan, childISN: childScan }],
        autoCreate: autoCreateDevices
      });
      if (data && data[0]) {
        setLinkPairs(prev => [data[0], ...prev]);
        setPrimaryScan('');
        setChildScan('');
        if (data[0].status === 'invalid') {
          playErrorBuzz();
          toast.error(`Invalid link: ${data[0].message || 'validation failed'}`);
        } else {
          playSuccessBeep();
          toast.success(`Validated connection preview: ${primaryScan} ── ${childScan}`);
        }
        scanLinkPrimaryRef.current?.focus();
      }
    } catch {
      setLinkError('Failed to validate connection.');
      toast.error('Internal server error occurred while validating device link.');
      playErrorBuzz();
    }
  };

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
      const data = await apiClient.post<MutationResponse>('/api/device-links/commit', {
        links: valid,
        autoCreate: autoCreateDevices
      });
      if (data.success) {
        toast.success(`Successfully committed ${valid.length} linked relationships.`);
        setLinkPairs([]);
        onSuccess();
        onClose();
        playSuccessBeep();
      } else {
        toast.error(data.error || 'Failed to commit linked relationships.');
        playErrorBuzz();
      }
    } catch {
      setLinkError('Failed to commit relationships.');
      toast.error('Internal server error occurred while committing relationships.');
      playErrorBuzz();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="surface-card rounded-2xl sm:max-w-6xl w-full max-h-[90vh] flex flex-col border-0 p-0 overflow-hidden" showCloseButton={true}>
        <MotionDialogBody className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <DialogHeader className="hidden">
          <DialogTitle>Bulk Operations</DialogTitle>
          <DialogDescription>Stage Bulk Ingestions or Polymorphic Link pairings.</DialogDescription>
        </DialogHeader>

          <div className="p-6 pb-0 flex flex-col gap-4">
            <div className="flex border-b border-border pb-2 gap-4">
              <button onClick={() => setBulkSubTab('ingest')} className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors cursor-pointer ${bulkSubTab === 'ingest' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Bulk Ingestion</button>
              <button onClick={() => setBulkSubTab('link')} className={`text-xs font-bold uppercase tracking-wider pb-1 border-b-2 transition-colors cursor-pointer ${bulkSubTab === 'link' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Polymorphic Linking</button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6 pt-4">
            <div className="space-y-6">
            {bulkSubTab === 'ingest' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Mass Inventory Ingestion</h3>
                  <p className="text-[11px] text-muted-foreground">Upload serial numbers or scan barcode tags to register new hardware into inventory.</p>
                </div>

                {bulkIngestError && <div className="bg-red-500/10 text-red-400 text-xs p-2.5 rounded-lg border border-red-500/20 font-medium">{bulkIngestError}</div>}

                {duplicateCountAlert > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs p-2.5 rounded-lg flex items-center justify-between font-medium">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0">info</span>
                      <span>Filtered out {duplicateCountAlert} duplicate entries.</span>
                    </div>
                    <button onClick={() => setDuplicateCountAlert(0)} className="text-[10px] underline hover:no-underline font-semibold ml-4 cursor-pointer">Dismiss</button>
                  </div>
                )}

                {patternCountAlert > 0 && (
                  <div className="bg-red-500/10 border border-red-500/25 text-red-400 text-xs p-2.5 rounded-lg flex items-center justify-between font-medium animate-pulse">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-red-500 shrink-0">error</span>
                      <span>Filtered out {patternCountAlert} barcode(s) due to format mismatch.</span>
                    </div>
                    <button onClick={() => setPatternCountAlert(0)} className="text-[10px] underline hover:no-underline font-semibold ml-4 cursor-pointer">Dismiss</button>
                  </div>
                )}

                {isCsvMapping ? (
                  <div className="space-y-6 border border-border p-5 rounded-xl bg-primary/5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-foreground">CSV Column Import Wizard</h4>
                        <p className="text-xs text-muted-foreground">
                          Map detected column headers to the database schema.
                          {csvHeaderRowNumber !== null ? ` Header row detected at row ${csvHeaderRowNumber}.` : ''}
                        </p>
                      </div>
                      <button onClick={() => setIsCsvMapping(false)} className="text-xs text-primary hover:brightness-110 font-bold underline cursor-pointer">Cancel Mapping</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground block">Identifier / Serial <span className="text-red-400">*</span></label>
                        <Select value={csvMappings.identifier} onValueChange={(val) => setCsvMappings(prev => ({ ...prev, identifier: val }))}>
                          <SelectTrigger className="w-full text-xs h-9 bg-primary/5 border border-border rounded-lg text-foreground"><SelectValue placeholder="Select identifier column" /></SelectTrigger>
                          <SelectContent>{csvHeaders.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground block">Metadata Field 1</label>
                        <Select value={csvMappings.meta1} onValueChange={(val) => setCsvMappings(prev => ({ ...prev, meta1: val }))}>
                          <SelectTrigger className="w-full text-xs h-9 bg-primary/5 border border-border rounded-lg text-foreground"><SelectValue placeholder="Select column" /></SelectTrigger>
                          <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{csvHeaders.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground block">Metadata Field 2</label>
                        <Select value={csvMappings.meta2} onValueChange={(val) => setCsvMappings(prev => ({ ...prev, meta2: val }))}>
                          <SelectTrigger className="w-full text-xs h-9 bg-primary/5 border border-border rounded-lg text-foreground"><SelectValue placeholder="Select column" /></SelectTrigger>
                          <SelectContent><SelectItem value="__none__">-- None --</SelectItem>{csvHeaders.map(h => (<SelectItem key={h} value={h}>{h}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button onClick={handleCommitCsvMapping} disabled={!csvMappings.identifier} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-primary-foreground shadow hover:brightness-110 h-9 px-4 disabled:opacity-50 cursor-pointer">Commit Ingestion</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">Target Template Model</label>
                      <Select
                        value={bulkSelectedModelId}
                        onValueChange={(val) => {
                          if (bulkIngestList.length > 0 && val !== bulkSelectedModelId) {
                            const confirmed = window.confirm('Changing the model will clear the prepared ingestion table. Continue?');
                            if (!confirmed) return;
                            setBulkIngestList([]);
                          }
                          setBulkSelectedModelId(val);
                          setBulkIngestError('');
                        }}
                      >
                        <SelectTrigger className="w-full text-xs h-9 bg-primary/5 border border-border rounded-lg text-foreground"><SelectValue placeholder="Select a model..." /></SelectTrigger>
                        <SelectContent>{models.map(m => (<SelectItem key={m.id} value={m.id}>{m.name} ({m.brand})</SelectItem>))}</SelectContent>
                      </Select>
                      {!hasSelectedModel && (
                        <p className="text-[11px] text-amber-400 mt-1.5">Select a model to enable upload and barcode scanning.</p>
                      )}
                    </div>

                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${!hasSelectedModel ? 'opacity-60' : ''}`}>
                      <div className="border border-border rounded-xl p-4 bg-primary/5 flex flex-col justify-between space-y-4">
                        <div className="text-center">
                          <span className="material-symbols-outlined text-3xl mx-auto text-primary mb-2">table_chart</span>
                          <h4 className="text-xs font-bold text-foreground">Column List Upload</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Upload CSV or XLSX files. Metadata rows above headers are skipped.</p>
                        </div>
                        <label className={`w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold border border-border h-9 transition-all ${hasSelectedModel ? 'bg-card/60 text-muted-foreground hover:text-foreground hover:bg-primary/5 cursor-pointer' : 'bg-muted/30 text-muted-foreground/60 cursor-not-allowed'}`}>
                          Browse Import File
                          <input type="file" className="hidden" disabled={!hasSelectedModel} accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleIngestCSVUpload} />
                        </label>
                      </div>

                      <div className="border border-border rounded-xl p-4 bg-primary/5 space-y-3">
                        <div className="flex items-center gap-1.5 text-primary">
                          <span className="material-symbols-outlined text-sm animate-pulse text-primary">qr_code_scanner</span>
                          <h4 className="text-xs font-bold text-foreground">Rapid Physical Scanner</h4>
                        </div>
                        <input 
                          ref={scanIngestInputRef}
                          type="text"
                          placeholder="Focus & scan barcodes..."
                          value={scanInputText}
                          disabled={!hasSelectedModel}
                          onChange={(e) => setScanInputText(e.target.value)}
                          onKeyDown={(e) => {
                            if (!hasSelectedModel) return;
                            if (e.key === 'Enter' && scanInputText.trim()) {
                              processIngestionList([{ identifier: scanInputText.trim(), metadata: {} }]);
                              setScanInputText('');
                            }
                          }}
                          className="flex h-9 w-full rounded-lg border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="border border-border rounded-xl bg-background overflow-hidden min-h-0">
                      <div className="bg-card/60 p-2.5 px-4 text-xs font-semibold text-muted-foreground flex justify-between items-center border-b border-border sticky top-0 z-10">
                        <span>Prepared Ingestion Table ({bulkIngestList.length})</span>
                        {bulkIngestList.length > 0 && <button onClick={() => setBulkIngestList([])} className="text-[10px] text-red-400 hover:underline font-semibold cursor-pointer">Clear List</button>}
                      </div>
                      <div
                        className="h-[360px] max-h-[42vh] min-h-[220px] overflow-y-scroll overflow-x-auto overscroll-contain scrollbar-custom"
                        tabIndex={0}
                        onWheel={(event) => event.stopPropagation()}
                        onTouchMove={(event) => event.stopPropagation()}
                      >
                        {bulkIngestList.length > 0 ? (
                          <table className="w-full caption-bottom text-sm">
                            <TableHeader className="sticky top-0 z-10 bg-background"><TableRow><TableHead className="px-4 text-[10px]">Serial / ISN</TableHead><TableHead className="px-2 text-[10px]">Meta 1</TableHead><TableHead className="px-2 text-[10px]">Meta 2</TableHead><TableHead className="px-2 text-right text-[10px]">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                              {bulkIngestList.map((item, idx) => (
                                <TableRow key={idx} className="hover:bg-primary/5 border-b border-primary/5 text-xs">
                                  <TableCell className="px-4 font-bold text-primary font-mono">{item.identifier}</TableCell>
                                  <TableCell className="p-1"><input type="text" value={(item.metadata.field1 as string) || ''} onChange={(e) => handleUpdateItemMeta(idx, 'field1', e.target.value)} className="h-7 w-full border border-border rounded bg-background px-2 text-foreground" /></TableCell>
                                  <TableCell className="p-1"><input type="text" value={(item.metadata.field2 as string) || ''} onChange={(e) => handleUpdateItemMeta(idx, 'field2', e.target.value)} className="h-7 w-full border border-border rounded bg-background px-2 text-foreground" /></TableCell>
                                  <TableCell className="px-2 text-right"><button onClick={() => setBulkIngestList(bulkIngestList.filter((_, i) => i !== idx))} className="text-[10px] text-red-400 font-semibold cursor-pointer">Remove</button></TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </table>
                        ) : <EmptyState title="No devices prepared" description="Scan barcodes or drop a CSV file to begin." />}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {bulkSubTab === 'link' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Polymorphic Linking Engine</h3>
                  <p className="text-[11px] text-muted-foreground">Establish links between trackers and secondary assets.</p>
                </div>
                {linkError && <div className="bg-red-500/10 text-red-400 text-xs p-2.5 rounded-lg border border-red-500/20 font-medium">{linkError}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-border rounded-xl p-4 bg-primary/5 flex flex-col justify-between space-y-4">
                    <div className="text-center">
                      <span className="material-symbols-outlined text-3xl mx-auto text-primary mb-2">table_chart</span>
                      <h4 className="text-xs font-bold text-foreground">Relationship Matrix Upload</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Upload CSV or XLSX with parent and child identifier columns.</p>
                    </div>
                    <label className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold border border-border bg-card/60 text-muted-foreground hover:text-foreground hover:bg-primary/5 h-9 cursor-pointer transition-all">
                      Browse Import File
                      <input type="file" className="hidden" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handleLinkCSVUpload} />
                    </label>
                  </div>
                  <div className="border border-border rounded-xl p-4 bg-primary/5 space-y-3">
                    <div className="space-y-2">
                      <input ref={scanLinkPrimaryRef} type="text" placeholder="Scan Primary Tracker..." value={primaryScan} onChange={(e) => setPrimaryScan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && scanLinkChildRef.current?.focus()} className="flex h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-xs text-foreground" />
                      <input ref={scanLinkChildRef} type="text" placeholder="Scan Child Asset..." value={childScan} onChange={(e) => setChildScan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && triggerManualLinkScan()} className="flex h-9 w-full rounded-lg border border-border bg-background px-3 py-1 text-xs text-foreground" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border border-border rounded-xl p-4 bg-primary/5">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground">Auto-Ingestion Option</h4>
                    <p className="text-[10px] text-muted-foreground">Auto-create parent or child assets if they do not exist in inventory.</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={autoCreateDevices} 
                      onChange={(e) => setAutoCreateDevices(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="relative w-8 h-4 bg-zinc-800 rounded-full transition-colors peer-checked:bg-primary/10 border border-border after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-zinc-500 peer-checked:after:bg-primary after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-3.5"></div>
                    <span className="text-xs font-semibold text-foreground">Enable Auto-Create</span>
                  </label>
                </div>

                <div className="border border-border rounded-xl bg-background overflow-hidden">
                  <div className="bg-card/60 p-2.5 px-4 text-xs font-semibold text-muted-foreground flex justify-between items-center border-b border-border sticky top-0 z-10">
                    <span>Prepared Relationships ({linkPairs.length})</span>
                    {linkPairs.length > 0 && <button onClick={() => setLinkPairs([])} className="text-[10px] text-red-400 hover:underline font-semibold cursor-pointer">Clear List</button>}
                  </div>
                  <div className="divide-y divide-primary/5 font-mono text-xs">
                    {linkPairs.length > 0 ? linkPairs.map((pair, idx) => (
                      <div key={idx} className={`p-2.5 px-4 flex flex-col gap-1.5 ${pair.status === 'invalid' ? 'bg-red-500/5' : 'hover:bg-primary/5'}`}>
                        <div className="flex justify-between items-center w-full">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{pair.primaryISN}</span>
                            <span className="text-primary font-bold">→</span>
                            <span className="font-bold text-muted-foreground">{pair.childISN}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {pair.status === 'valid' && (pair.autoCreatePrimary || pair.autoCreateChild) && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                                {pair.autoCreatePrimary && pair.autoCreateChild 
                                  ? 'Auto-create Both' 
                                  : pair.autoCreatePrimary 
                                    ? 'Auto-create Parent' 
                                    : `Auto-create ${pair.childType || 'Child'}`}
                              </span>
                            )}
                            
                            <button onClick={() => setLinkPairs(linkPairs.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-red-400 p-1 rounded transition-colors cursor-pointer">
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </div>
                        
                        {pair.message && (
                          <div className={`text-[10px] leading-tight ${pair.status === 'invalid' ? 'text-red-400 font-semibold' : 'text-emerald-400 font-medium'}`}>
                            {pair.message}
                          </div>
                        )}
                      </div>
                    )) : <EmptyState title="No relationships prepared" description="Scan pairs or upload CSV." />}
                  </div>
                </div>
              </div>
            )}
            </div>
          </ScrollArea>

          {!isCsvMapping && (
            <div className="p-6 pt-4 border-t border-border flex gap-2 justify-end bg-card/90 backdrop-blur-2xl rounded-b-2xl">
              <button type="button" onClick={onClose} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold border border-border bg-card/60 text-muted-foreground h-9 px-4 cursor-pointer">Cancel</button>
              {bulkSubTab === 'ingest' ? (
                <button onClick={handleBulkIngestSubmit} disabled={!hasSelectedModel || bulkIngestList.length === 0} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow h-9 px-4 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">Commit Ingestion ({bulkIngestList.length})</button>
              ) : (
                <button onClick={handleLinkCommit} disabled={linkPairs.filter(p => p.status === 'valid').length === 0} className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold bg-primary text-primary-foreground shadow h-9 px-4 disabled:opacity-50 cursor-pointer">Commit Relationships ({linkPairs.filter(p => p.status === 'valid').length})</button>
              )}
            </div>
          )}
        </MotionDialogBody>
        </DialogContent>
      </Dialog>
  );
};

