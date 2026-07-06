interface SettingsDensityPanelProps {
  density: string;
  onSelectDensity: (mode: string) => void;
}

export function SettingsDensityPanel({ density, onSelectDensity }: SettingsDensityPanelProps) {
  return (
    <div className="surface-card p-6 space-y-5">
      <div>
        <h3 className="font-medium text-sm text-foreground">Layout density</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Standard spacing for readability, or compact mode for more rows per screen.
        </p>
      </div>

      <div className="relative flex bg-muted/65 p-1 border border-border w-full rounded-lg select-none">
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-card border border-border rounded-md transition-all duration-300 ease-out ${
            density === 'compact' ? 'left-[calc(50%+2px)]' : 'left-1'
          }`}
        />

        <button
          type="button"
          onClick={() => onSelectDensity('default')}
          className={`flex-1 text-center py-2.5 text-sm font-medium relative z-10 transition-colors duration-200 cursor-pointer ${
            density === 'default' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Standard
        </button>
        <button
          type="button"
          onClick={() => onSelectDensity('compact')}
          className={`flex-1 text-center py-2.5 text-sm font-medium relative z-10 transition-colors duration-200 cursor-pointer ${
            density === 'compact' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Compact
        </button>
      </div>
    </div>
  );
}
