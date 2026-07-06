interface SettingsSoundPanelProps {
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function SettingsSoundPanel({ soundEnabled, onToggleSound }: SettingsSoundPanelProps) {
  return (
    <div className="surface-card p-6 space-y-4">
      <div className="flex justify-between items-center pb-2 border-b border-border">
        <div>
          <h3 className="font-medium text-sm text-foreground">Scanner audio</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Beep feedback when barcodes are verified
          </p>
        </div>

        <div className="flex items-end gap-0.5 h-8 w-12 px-2 border border-border rounded-md bg-muted justify-center">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-[3px] rounded-t-sm transition-all duration-300 ${
                soundEnabled ? 'bg-foreground sound-bar' : 'bg-muted-foreground/30 h-1'
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
          <label className="text-sm font-medium text-foreground">Acoustic indicators</label>
          <p className="text-xs text-muted-foreground">Play sound on successful scan</p>
        </div>
        <button
          type="button"
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
