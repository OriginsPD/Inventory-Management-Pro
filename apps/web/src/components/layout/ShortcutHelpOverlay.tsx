import { useEffect, useState } from 'react';

const SHORTCUTS = [
  { keys: 'Ctrl + K', action: 'Open command palette' },
  { keys: '?', action: 'Show this help overlay' },
  { keys: 'G then D', action: 'Go to Dashboard' },
  { keys: 'G then I', action: 'Go to Inventory' },
  { keys: 'G then Q', action: 'Go to QC Bench' },
  { keys: 'G then P', action: 'Go to Dispatch' },
  { keys: '/', action: 'Focus search on list screens' },
  { keys: 'Enter', action: 'Confirm scan (barcode scanner)' },
];

export function ShortcutHelpOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="rounded-[2rem] p-1.5 ring-1 border border-border w-full max-w-md">
        <div className="surface-card rounded-[calc(2rem-0.375rem)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Keyboard Shortcuts</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <ul className="space-y-2">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="text-muted-foreground">{s.action}</span>
                <kbd className="font-mono text-[9px] px-2 py-1 rounded-lg border border-border bg-muted/50 shrink-0">
                  {s.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
