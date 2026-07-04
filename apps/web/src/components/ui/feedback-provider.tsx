import React, { createContext, useContext, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@ims_pro/ui/components/dialog";
import { ToastContainer, toast as rToast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";
import { playSuccessBeep, playErrorBuzz, playChirp } from '@/lib/audio';

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
        position="bottom-right"
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
            <DialogTitle className="text-sm font-bold text-foreground p-0">{confirmData?.title}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-xs text-muted leading-relaxed break-words">
            {confirmData?.message}
          </DialogDescription>
          <div className="flex items-center gap-3 justify-end pt-2">
            <button
              onClick={() => confirmData?.resolve(false)}
              className="h-8.5 px-4 rounded-lg text-xs font-semibold border border-primary/10 bg-primary/5 text-foreground hover:bg-primary/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => confirmData?.resolve(true)}
              className="h-8.5 px-4 rounded-lg text-xs font-bold bg-primary text-primary-foreground hover:brightness-110 active:scale-95 transition-all cursor-pointer"
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

