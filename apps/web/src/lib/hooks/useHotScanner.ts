import { useEffect, useRef } from 'react';

export const useHotScanner = (onScan: (barcode: string) => void) => {
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    let accumulatedKeys = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      const now = Date.now();
      const delay = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (accumulatedKeys.length >= 3) {
          onScanRef.current(accumulatedKeys.trim());
          accumulatedKeys = '';
          e.preventDefault();
        } else {
          accumulatedKeys = '';
        }
        return;
      }

      if (e.key.length > 1) return;

      if (delay > 35 && isInput) {
        accumulatedKeys = '';
        return;
      }

      accumulatedKeys += e.key;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
