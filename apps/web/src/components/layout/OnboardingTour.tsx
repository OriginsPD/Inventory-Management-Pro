import { useEffect, useState } from 'react';

import { useUserPreferences } from '@/lib/hooks/useUserPreferences';
import { PortalButton } from '@/components/ui/portal';

export function OnboardingTour() {
  const { preferences, savePreferences } = useUserPreferences();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!preferences.onboardingComplete) {
      setVisible(true);
    }
  }, [preferences.onboardingComplete]);

  if (!visible) return null;

  const dismiss = async () => {
    await savePreferences({ onboardingComplete: true });
    setVisible(false);
  };

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50 max-w-sm">
      <div className="rounded-[1.25rem] p-1 ring-1 ring-primary/20 shadow-xl">
        <div className="glass-panel rounded-[calc(1.25rem-0.25rem)] p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">Quick start</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Scanner always armed — scan from any page. Press <kbd className="font-mono text-[10px] px-1 border rounded">Ctrl+K</kbd> for commands or <kbd className="font-mono text-[10px] px-1 border rounded">?</kbd> for shortcuts.
          </p>
          <PortalButton size="sm" onClick={dismiss} className="w-full">
            Got it
          </PortalButton>
        </div>
      </div>
    </div>
  );
}
