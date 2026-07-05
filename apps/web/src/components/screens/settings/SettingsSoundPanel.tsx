interface SettingsSoundPanelProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function SettingsSoundPanel({ soundEnabled, onToggleSound }: SettingsSoundPanelProps) {
  return (
    <div className="glass-panel p-6 space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-border/40">
        <div>
          <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Audio Operations Hub</h3>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
            Synthesized signals for physical hardware scanning
          </p>
        </div>

        <div className="flex items-end gap-0.5 h-8 w-12 px-2 border border-border/30 rounded-md bg-black/10 justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-[3px] rounded-t-sm transition-all duration-300 ${
                soundEnabled ? 'bg-primary sound-bar' : 'bg-muted-foreground/30 h-1'
              }`}
              style={
                soundEnabled
                  ? {
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.8s',
                    }
                  : {}
              }
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="space-y-0.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-foreground">Acoustic Indicators</label>
          <p className="text-[9px] text-muted-foreground font-mono">BEEP feedback triggers on barcode verification</p>
        </div>
        <button
          onClick={onToggleSound}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            soundEnabled ? 'bg-primary' : 'bg-muted border border-border'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
              soundEnabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
