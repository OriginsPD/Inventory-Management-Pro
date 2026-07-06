import { useGlobalScanner } from '@/components/layout/GlobalScannerProvider';

export function GlobalScannerBar() {
  const { lastScan } = useGlobalScanner();

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none lg:bottom-6">
      <div className="surface-card px-4 py-2 flex items-center gap-2.5 min-w-[200px] max-w-[min(90vw,420px)] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <span className="material-symbols-outlined text-foreground text-[18px]">barcode_scanner</span>
        <div className="min-w-0 text-left">
          <p className="text-[10px] text-muted-foreground leading-none">
            Scanner ready
          </p>
          <p className="text-xs font-mono text-foreground truncate mt-0.5">
            {lastScan ?? 'Awaiting scan…'}
          </p>
        </div>
      </div>
    </div>
  );
}
