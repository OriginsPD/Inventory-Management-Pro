import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useFeedback } from '@/components/ui/feedback-provider';
import { useSearchParams } from "@/lib/hooks/useSearchParams";

export const SettingsScreen = () => {
  const { toast } = useFeedback();
  const { theme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'visual';
  const [activeTab, setActiveTab] = useState<'visual' | 'density' | 'sound'>(
    (initialTab === 'visual' || initialTab === 'density' || initialTab === 'sound') ? (initialTab as any) : 'visual'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'visual' || tab === 'density' || tab === 'sound')) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'visual' | 'density' | 'sound') => {
    setActiveTab(tab);
    searchParams.set('tab', tab);
    setSearchParams(searchParams);
  };

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('ims_sound_enabled');
    return stored !== null ? stored === 'true' : true;
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('ims_theme_accent') || 'brand';
  });

  const [density, setDensity] = useState(() => {
    return localStorage.getItem('ims_layout_density') || 'default';
  });

  const handleSelectAccent = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('ims_theme_accent', color);
    if (color !== 'brand') {
      document.documentElement.setAttribute('data-accent', color);
    } else {
      document.documentElement.removeAttribute('data-accent');
    }
    toast.success(`Terminal highlight updated to: ${color.toUpperCase()}`);
  };

  const handleSelectDensity = (mode: string) => {
    setDensity(mode);
    localStorage.setItem('ims_layout_density', mode);
    if (mode === 'compact') {
      document.documentElement.classList.add('density-compact');
    } else {
      document.documentElement.classList.remove('density-compact');
    }
    toast.success(`Density spacing set to: ${mode.toUpperCase()}`);
  };

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('ims_sound_enabled', String(nextVal));
    toast.success(`Audio notifications ${nextVal ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
      <style>{`
        @keyframes soundwave {
          0%, 100% { height: 4px; }
          50% { height: 24px; }
        }
        .sound-bar {
          animation: soundwave 1.2s ease-in-out infinite;
        }
        .accent-glow-brand { box-shadow: 0 0 15px rgba(235, 90, 0, 0.4); }
        .accent-glow-orange { box-shadow: 0 0 15px rgba(255, 105, 0, 0.4); }
        .accent-glow-amber { box-shadow: 0 0 15px rgba(255, 138, 31, 0.4); }
        .accent-glow-emerald { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
        .accent-glow-indigo { box-shadow: 0 0 15px rgba(99, 102, 241, 0.4); }
      `}</style>

      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic flex items-center gap-2">
          System <span className="text-primary">Settings</span>
        </h1>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
          Personalize terminal workspace appearance, layout density, and audit sound feedback
        </p>
      </div>

      {/* Horizontal Navigation Tab Bar */}
      <div className="flex border-b border-primary/10 select-none">
        {[
          { id: 'visual', name: 'Visual Aesthetics', icon: 'palette' },
          { id: 'density', name: 'Density Spacing', icon: 'grid_view' },
          { id: 'sound', name: 'Sound Feedback', icon: 'volume_up' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`px-5 py-3 text-[10px] font-bold uppercase tracking-wider cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
                isActive
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Settings Sections */}
      <div className="w-full mt-2">
        {activeTab === 'visual' && (
          <div className="space-y-6">
            {/* Theme Preference Cards */}
            <div className="glass-panel p-6 space-y-5">
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Theme Visual System</h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                  Select default layout rendering mode for active operator node
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Card: Light */}
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

                {/* Card: Dark */}
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

                {/* Card: System Default */}
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

            {/* Accent Color Section */}
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
                  { name: 'Indigo Net', value: 'indigo', bg: 'bg-indigo-500', glow: 'accent-glow-indigo' }
                ].map((accent) => {
                  const isSelected = accentColor === accent.value;
                  return (
                    <button
                      key={accent.value}
                      onClick={() => handleSelectAccent(accent.value)}
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
        )}

        {activeTab === 'density' && (
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
                onClick={() => handleSelectDensity('default')}
                className={`flex-1 text-center py-2.5 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors duration-200 cursor-pointer ${
                  density === 'default' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Standard Breathing Grid
              </button>
              <button
                onClick={() => handleSelectDensity('compact')}
                className={`flex-1 text-center py-2.5 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors duration-200 cursor-pointer ${
                  density === 'compact' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Compact (High Data Density)
              </button>
            </div>
          </div>
        )}

        {activeTab === 'sound' && (
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
                            animationDuration: '0.8s'
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
                onClick={handleToggleSound}
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
        )}
      </div>
    </div>
  );
};
