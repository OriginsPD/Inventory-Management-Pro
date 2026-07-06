import { useTheme } from 'next-themes';

interface SettingsVisualPanelProps {
  accentColor: string;
  onSelectAccent: (color: string) => void;
}

const ACCENT_OPTIONS = [
  { name: 'Charcoal', value: 'brand', bg: 'bg-[#111111]' },
  { name: 'Slate', value: 'slate', bg: 'bg-[#2f3437]' },
  { name: 'Stone', value: 'stone', bg: 'bg-[#44403c]' },
  { name: 'Neutral', value: 'neutral', bg: 'bg-[#787774]' },
];

export function SettingsVisualPanel({ accentColor, onSelectAccent }: SettingsVisualPanelProps) {
  const { theme, setTheme } = useTheme();

  const themeCardClass = (active: boolean) =>
    active
      ? 'border-foreground/30 bg-muted ring-1 ring-border'
      : 'border-border hover:border-foreground/20';

  return (
    <div className="space-y-6">
      <div className="surface-card p-6 space-y-5">
        <div>
          <h3 className="font-medium text-sm text-foreground">Appearance</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Choose light, dark, or system theme for the portal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {[
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
            { id: 'system', label: 'System' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              className={`group relative flex flex-col p-3 rounded-lg border text-left transition-all overflow-hidden ${themeCardClass(theme === opt.id)}`}
            >
              <div className="h-14 w-full bg-muted border border-border rounded-md p-1.5 flex gap-1 mb-3">
                <div className="w-4 h-full bg-background border border-border rounded-sm" />
                <div className="flex-1 flex flex-col gap-1">
                  <div className="h-2.5 w-full bg-background border border-border rounded-sm" />
                  <div className="flex-1 bg-card border border-border rounded-sm" />
                </div>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm font-medium">{opt.label}</span>
                {theme === opt.id && (
                  <span className="material-symbols-outlined text-[16px] text-foreground">check_circle</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="surface-card p-6 space-y-5">
        <div>
          <h3 className="font-medium text-sm text-foreground">Button emphasis</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Neutral CTA tones for primary actions. Semantic colors stay on status badges only.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          {ACCENT_OPTIONS.map((accent) => {
            const isSelected = accentColor === accent.value || (accentColor === 'brand' && accent.value === 'brand');
            return (
              <button
                key={accent.value}
                type="button"
                onClick={() => onSelectAccent(accent.value)}
                className={`flex flex-col items-center justify-center p-4 rounded-lg border text-center transition-all cursor-pointer ${
                  isSelected
                    ? 'border-foreground/30 bg-muted text-foreground'
                    : 'border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <span className={`h-6 w-6 rounded-full ${accent.bg} mb-3 flex items-center justify-center`}>
                  {isSelected && (
                    <span className="material-symbols-outlined text-[14px] text-white">check</span>
                  )}
                </span>
                <span className="text-xs font-medium">{accent.name}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[var(--status-success-bg)] text-[var(--status-success-fg)]">
            In stock
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[var(--status-warning-bg)] text-[var(--status-warning-fg)]">
            Low stock
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[var(--status-info-bg)] text-[var(--status-info-fg)]">
            Info
          </span>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]">
            Critical
          </span>
        </div>
      </div>
    </div>
  );
}
