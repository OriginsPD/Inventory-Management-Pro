import { useState } from 'react';
import { AppShell } from '../layout/AppShell';
import { Sun, Moon, Laptop, Volume2, Shield } from 'lucide-react';
import { useTheme } from 'next-themes';

export const SettingsScreen = () => {
  const { theme, setTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">System Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure your warehouse terminal, sound indicators, and theme preferences.</p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* Card: Theme Settings */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div>
              <h3 className="font-semibold text-sm">Theme Preference</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Toggle the visual style of the application workspace.</p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              {/* Option: Light */}
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-between p-4 rounded-lg border text-center transition-all ${
                  theme === 'light'
                    ? 'border-primary bg-primary/5 ring-1 ring-ring text-foreground'
                    : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <Sun className="h-5 w-5 mb-2 shrink-0" />
                <span className="text-xs font-semibold">Light Mode</span>
              </button>

              {/* Option: Dark */}
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-between p-4 rounded-lg border text-center transition-all ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/5 ring-1 ring-ring text-foreground'
                    : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <Moon className="h-5 w-5 mb-2 shrink-0" />
                <span className="text-xs font-semibold">Dark Mode</span>
              </button>

              {/* Option: System */}
              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center justify-between p-4 rounded-lg border text-center transition-all ${
                  theme === 'system'
                    ? 'border-primary bg-primary/5 ring-1 ring-ring text-foreground'
                    : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                }`}
              >
                <Laptop className="h-5 w-5 mb-2 shrink-0" />
                <span className="text-xs font-semibold">System Default</span>
              </button>
            </div>
          </div>

          {/* Card: Audio/Haptic Warnings */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-sm">Audio & Haptic Feedback</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Toggle sound signals during hardware scanning sequences.</p>
              </div>
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="space-y-0.5">
                <label className="text-xs font-semibold text-foreground">Acoustic Gun Indicators</label>
                <p className="text-[10px] text-muted-foreground">Play tone beeps for successful scans and low buzzes for errors.</p>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-2 ${
                  soundEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Card: System / Version Details */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-4 w-4" />
              <h3 className="font-semibold text-xs uppercase tracking-wider">Workspace Verification</h3>
            </div>
            <div className="text-xs text-muted-foreground space-y-1 font-mono">
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span>Client Engine:</span>
                <span className="text-foreground font-semibold">Vite React v19</span>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1">
                <span>Database Syncer:</span>
                <span className="text-foreground font-semibold">Neon Serverless PostgreSQL</span>
              </div>
              <div className="flex justify-between">
                <span>API Gateway:</span>
                <span className="text-foreground font-semibold">ElysiaJS v2.3</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
};
