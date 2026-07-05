interface SettingsDensityPanelProps {
  density: string;
  onSelectDensity: (mode: string) => void;
}

export function SettingsDensityPanel({ density, onSelectDensity }: SettingsDensityPanelProps) {
  return (
    <div className="glass-panel p-6 space-y-5">
      <div>
        <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Workspace Spacing Grid</h3>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
          Optimize layout spacing index to toggle dashboard breathing room vs data rows density
        </p>
      </div>

      <div className="relative flex bg-muted/65 p-1 border border-border w-full rounded-xl select-none">
        <div
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-card border border-border shadow-sm rounded-lg transition-all duration-300 ease-out ${
            density === 'compact' ? 'left-[calc(50%+2px)]' : 'left-1'
          }`}
        />

        <button
          onClick={() => onSelectDensity('default')}
          className={`flex-1 text-center py-2.5 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors duration-200 cursor-pointer ${
            density === 'default' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Standard Breathing Grid
        </button>
        <button
          onClick={() => onSelectDensity('compact')}
          className={`flex-1 text-center py-2.5 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors duration-200 cursor-pointer ${
            density === 'compact' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Compact (High Data Density)
        </button>
      </div>
    </div>
  );
}
