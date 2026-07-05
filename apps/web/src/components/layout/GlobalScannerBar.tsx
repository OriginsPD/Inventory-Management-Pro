import { useGlobalScanner } from '@/components/layout/GlobalScannerProvider';

export function GlobalScannerBar() {
  const { lastScan } = useGlobalScanner();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="rounded-full p-0.5 ring-1 ring-primary/20 shadow-lg shadow-primary/10">
        <div className="glass-panel rounded-full px-4 py-2 flex items-center gap-2.5 min-w-[200px] max-w-[min(90vw,420px)]">
          <span className="material-symbols-outlined text-primary text-[18px] animate-pulse">barcode_scanner</span>
          <div className="min-w-0 text-left">
            <p className="text-[8px] font-mono uppercase tracking-[0.2em] text-muted-foreground leading-none">
              Scanner armed
            </p>
            <p className="text-[10px] font-mono font-black text-foreground truncate mt-0.5">
              {lastScan ?? 'Awaiting scan…'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
