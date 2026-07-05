import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouterState } from '@tanstack/react-router';

import { useHotScanner } from '@/lib/hooks/useHotScanner';
import { playChirp, playErrorBuzz } from '@/lib/audio';

type ScanHandler = (barcode: string, pathname: string) => void | boolean;

interface GlobalScannerContextValue {
  lastScan: string | null;
  registerHandler: (handler: ScanHandler) => () => void;
  pushHandler: (handler: ScanHandler) => void;
  popHandler: () => void;
}

const GlobalScannerContext = createContext<GlobalScannerContextValue | null>(null);

export function GlobalScannerProvider({ children }: { children: ReactNode }) {
  const [lastScan, setLastScan] = useState<string | null>(null);
  const handlersRef = useRef<ScanHandler[]>([]);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const registerHandler = useCallback((handler: ScanHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const pushHandler = useCallback((handler: ScanHandler) => {
    handlersRef.current.push(handler);
  }, []);

  const popHandler = useCallback(() => {
    handlersRef.current.pop();
  }, []);

  useHotScanner((barcode) => {
    const trimmed = barcode.trim();
    if (!trimmed) return;

    setLastScan(trimmed);
    playChirp();

    const stack = [...handlersRef.current].reverse();
    for (const handler of stack) {
      const handled = handler(trimmed, pathname);
      if (handled === true) return;
    }
    playErrorBuzz();
  });

  const value = useMemo(
    () => ({ lastScan, registerHandler, pushHandler, popHandler }),
    [lastScan, registerHandler, pushHandler, popHandler],
  );

  return (
    <GlobalScannerContext.Provider value={value}>
      {children}
    </GlobalScannerContext.Provider>
  );
}

export function useGlobalScanner() {
  const ctx = useContext(GlobalScannerContext);
  if (!ctx) {
    throw new Error('useGlobalScanner must be used within GlobalScannerProvider');
  }
  return ctx;
}

export function useGlobalScanHandler(handler: ScanHandler, enabled = true) {
  const { registerHandler } = useGlobalScanner();

  useEffect(() => {
    if (!enabled) return;
    return registerHandler(handler);
  }, [enabled, handler, registerHandler]);
}
