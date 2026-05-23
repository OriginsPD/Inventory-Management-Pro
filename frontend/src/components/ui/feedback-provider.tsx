import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './dialog';
import { ToastContainer, toast as rToast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  const [confirmData, setConfirmData] = useState<{
    title: string;
    message: string;
    resolve: (val: boolean) => void;
  } | null>(null);

  const toast = {
    success: (msg: string) => {
      rToast.success(msg);
      playSuccessBeep();
    },
    error: (msg: string) => {
      rToast.error(msg);
      playErrorBuzz();
    },
    info: (msg: string) => {
      rToast.info(msg);
      playChirp();
    },
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
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

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
