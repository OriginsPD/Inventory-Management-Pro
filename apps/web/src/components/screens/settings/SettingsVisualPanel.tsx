import { useTheme } from 'next-themes';

interface SettingsVisualPanelProps {
  accentColor: string;
  onSelectAccent: (color: string) => void;
}

export function SettingsVisualPanel({ accentColor, onSelectAccent }: SettingsVisualPanelProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 space-y-5">
        <div>
          <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Theme Visual System</h3>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
            Select default layout rendering mode for active operator node
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <button
            onClick={() => setTheme('light')}
            className={`group relative flex flex-col p-2.5 rounded-xl border text-left transition-all overflow-hidden bg-white text-zinc-900 ${
              theme === 'light'
                ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/5'
                : 'border-border hover:border-zinc-300'
            }`}
          >
            <div className="h-16 w-full bg-zinc-50 border border-zinc-100 rounded-md p-1.5 flex gap-1 mb-3">
              <div className="w-4 h-full bg-zinc-200 border border-zinc-300 rounded-[2px]" />
              <div className="flex-1 flex flex-col gap-1">
                <div className="h-3 w-full bg-zinc-200 border border-zinc-300 rounded-[2px]" />
                <div className="flex-1 bg-white border border-zinc-200 rounded-[2px] p-0.5 flex gap-0.5">
                  <div className="w-full h-1 bg-zinc-100 rounded-[1px]" />
                  <div className="w-full h-1 bg-zinc-100 rounded-[1px]" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Light Theme</span>
              {theme === 'light' && (
                <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
              )}
            </div>
          </button>

          <button
            onClick={() => setTheme('dark')}
            className={`group relative flex flex-col p-2.5 rounded-xl border text-left transition-all overflow-hidden bg-zinc-950 text-zinc-100 ${
              theme === 'dark'
                ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/5'
                : 'border-zinc-800 hover:border-zinc-700'
            }`}
          >
            <div className="h-16 w-full bg-zinc-900 border border-zinc-800 rounded-md p-1.5 flex gap-1 mb-3">
              <div className="w-4 h-full bg-zinc-800 border border-zinc-700 rounded-[2px]" />
              <div className="flex-1 flex flex-col gap-1">
                <div className="h-3 w-full bg-zinc-800 border border-zinc-700 rounded-[2px]" />
                <div className="flex-1 bg-zinc-950 border border-zinc-900 rounded-[2px] p-0.5 flex gap-0.5">
                  <div className="w-full h-1 bg-zinc-800 rounded-[1px]" />
                  <div className="w-full h-1 bg-zinc-800 rounded-[1px]" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Dark Theme</span>
              {theme === 'dark' && (
                <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
              )}
            </div>
          </button>

          <button
            onClick={() => setTheme('system')}
            className={`group relative flex flex-col p-2.5 rounded-xl border text-left transition-all overflow-hidden bg-zinc-900 text-zinc-100 ${
              theme === 'system'
                ? 'border-primary ring-1 ring-primary shadow-lg shadow-primary/5'
                : 'border-border/30 hover:border-zinc-600'
            }`}
          >
            <div className="h-16 w-full rounded-md overflow-hidden relative border border-zinc-800 flex mb-3">
              <div className="w-1/2 h-full bg-zinc-50 border-r border-zinc-200 flex gap-1 p-1.5">
                <div className="w-2.5 h-full bg-zinc-200 rounded-[2px]" />
                <div className="flex-1 h-3 bg-zinc-200 rounded-[2px]" />
              </div>
              <div className="w-1/2 h-full bg-zinc-900 flex gap-1 p-1.5">
                <div className="w-2.5 h-full bg-zinc-850 rounded-[2px]" />
                <div className="flex-1 h-3 bg-zinc-800 rounded-[2px]" />
              </div>
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider">System Link</span>
              {theme === 'system' && (
                <span className="material-symbols-outlined text-[16px] text-primary">check_circle</span>
              )}
            </div>
          </button>
        </div>
      </div>

      <div className="glass-panel p-6 space-y-5">
        <div>
          <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Terminal Tint Spec</h3>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
            Calibrate color highlights for buttons, borders, and state changes
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-2">
          {[
            { name: 'IMS Brand', value: 'brand', bg: 'bg-orange-600', glow: 'accent-glow-brand' },
            { name: 'Orange Alert', value: 'orange', bg: 'bg-orange-500', glow: 'accent-glow-orange' },
            { name: 'Amber Core', value: 'amber', bg: 'bg-amber-500', glow: 'accent-glow-amber' },
            { name: 'Emerald Pass', value: 'emerald', bg: 'bg-emerald-500', glow: 'accent-glow-emerald' },
            { name: 'Indigo Net', value: 'indigo', bg: 'bg-indigo-500', glow: 'accent-glow-indigo' },
          ].map((accent) => {
            const isSelected = accentColor === accent.value;
            return (
              <button
                key={accent.value}
                onClick={() => onSelectAccent(accent.value)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all cursor-pointer ${
                  isSelected
                    ? `border-primary bg-primary/5 ${accent.glow} text-foreground font-black`
                    : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`h-6 w-6 rounded-full ${accent.bg} mb-3 flex items-center justify-center relative`}>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[14px] text-white font-black">check</span>
                  )}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider">{accent.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
