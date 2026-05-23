import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
}

interface FeedbackContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextType | null>(null);

// Audio Synthesizer functions
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
    console.warn("AudioContext failed to play tone", e);
  }
};

const playSuccessBeep = () => {
  if (localStorage.getItem('ims_sound_enabled') === 'false') return;
  playAudioTone(850, 0.08, 'sine');
  setTimeout(() => playAudioTone(1250, 0.1, 'sine'), 70);
};

const playErrorBuzz = () => {
  if (localStorage.getItem('ims_sound_enabled') === 'false') return;
  playAudioTone(170, 0.25, 'triangle');
};

const playChirp = () => {
  if (localStorage.getItem('ims_sound_enabled') === 'false') return;
  playAudioTone(950, 0.05, 'sine');
};

export const FeedbackProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmData, setConfirmData] = useState<{
    title: string;
    message: string;
    resolve: (val: boolean) => void;
  } | null>(null);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    
    if (type === 'success') playSuccessBeep();
    else if (type === 'error') playErrorBuzz();
    else playChirp();

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toast = {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg),
  };

  const confirm = (options: ConfirmOptions) => {
    playChirp();
    return new Promise<boolean>((resolve) => {
      setConfirmData({
        title: options.title,
        message: options.message,
        resolve: (val: boolean) => {
          resolve(val);
          setConfirmData(null);
        },
      });
    });
  };

  // Keyboard Escape listener to dismiss confirm dialog
  useEffect(() => {
    if (!confirmData) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        confirmData.resolve(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmData]);

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      
      {/* Toast Overlay Container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto glass-panel p-3.5 rounded-xl border-l-4 shadow-lg flex items-start gap-2.5 animate-in slide-in-from-right duration-200"
            style={{
              borderLeftColor:
                t.type === 'success'
                  ? 'var(--color-emerald-500, #10b981)'
                  : t.type === 'error'
                  ? 'var(--color-red-500, #ef4444)'
                  : 'var(--color-sky-500, #0ea5e9)',
            }}
          >
            <span
              className="material-symbols-outlined text-lg select-none"
              style={{
                color:
                  t.type === 'success'
                    ? 'var(--color-emerald-400, #34d399)'
                    : t.type === 'error'
                    ? 'var(--color-red-400, #f87171)'
                    : 'var(--color-sky-400, #38bdf8)',
              }}
            >
              {t.type === 'success' ? 'check_circle' : t.type === 'error' ? 'error' : 'info'}
            </span>
            <div className="flex-grow min-w-0">
              <p className="text-xs font-semibold text-[#d8e2fd] break-words">{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-muted-foreground hover:text-foreground cursor-pointer flex-shrink-0 flex items-center justify-center p-0.5 rounded hover:bg-primary/5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm select-none">close</span>
            </button>
          </div>
        ))}
      </div>

      {/* Confirm Dialog Overlay Modal */}
      <Dialog open={!!confirmData} onOpenChange={(open) => { if (!open && confirmData) confirmData.resolve(false); }}>
        <DialogContent className="glass-panel p-6 rounded-2xl max-w-sm w-full space-y-4 glow-accent border-0" showCloseButton={false}>
          <DialogHeader className="flex flex-row items-center gap-2 space-y-0 text-left">
            <span className="material-symbols-outlined text-primary text-xl select-none">help_outline</span>
            <DialogTitle className="text-sm font-bold text-[#d8e2fd] p-0">{confirmData?.title}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-xs text-[#cbd5e1] leading-relaxed break-words">
            {confirmData?.message}
          </DialogDescription>
          <div className="flex items-center gap-3 justify-end pt-2">
            <button
              onClick={() => confirmData?.resolve(false)}
              className="h-8.5 px-4 rounded-lg text-xs font-semibold border border-primary/10 bg-primary/5 text-[#d8e2fd] hover:bg-primary/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => confirmData?.resolve(true)}
              className="h-8.5 px-4 rounded-lg text-xs font-bold bg-primary text-[#081326] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              Confirm
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};
