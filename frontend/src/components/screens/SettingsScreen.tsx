import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useFeedback } from '../ui/feedback-provider';

export const SettingsScreen = () => {
  const { toast, confirm } = useFeedback();
  const { theme, setTheme } = useTheme();
  
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const stored = localStorage.getItem('ims_sound_enabled');
    return stored !== null ? stored === 'true' : true;
  });

  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('ims_theme_accent') || 'amber';
  });

  const [density, setDensity] = useState(() => {
    return localStorage.getItem('ims_layout_density') || 'default';
  });

  const [activeSection, setActiveSection] = useState<'general' | 'appearance' | 'polymorphic' | 'system'>('general');

  const initDefaultOptions = () => {
    const defaultOptions = ['SIM', 'SD_CARD', 'PANIC_BUTTON', 'KEYFOB'];
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(defaultOptions));
    return defaultOptions;
  };

  // Polymorphic Links Config CRUD States
  const [polymorphicOptions, setPolymorphicOptions] = useState<string[]>(() => {
    const stored = localStorage.getItem('ims_polymorphic_link_options');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return initDefaultOptions();
      }
    }
    return initDefaultOptions();
  });
  const [newOption, setNewOption] = useState('');
  const [editingOptionIdx, setEditingOptionIdx] = useState<number | null>(null);
  const [editingOptionVal, setEditingOptionVal] = useState('');

  const handleSelectAccent = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('ims_theme_accent', color);
    if (color !== 'amber') {
      document.documentElement.setAttribute('data-accent', color);
    } else {
      document.documentElement.removeAttribute('data-accent');
    }
  };

  const handleSelectDensity = (mode: string) => {
    setDensity(mode);
    localStorage.setItem('ims_layout_density', mode);
    if (mode === 'compact') {
      document.documentElement.classList.add('density-compact');
    } else {
      document.documentElement.classList.remove('density-compact');
    }
  };

  const handleToggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    localStorage.setItem('ims_sound_enabled', String(nextVal));
  };

  const handleAddOption = () => {
    const trimmed = newOption.trim().toUpperCase().replace(/\s+/g, '_');
    if (!trimmed) return;
    if (polymorphicOptions.includes(trimmed)) {
      toast.error('Option already exists.');
      return;
    }
    const updated = [...polymorphicOptions, trimmed];
    setPolymorphicOptions(updated);
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(updated));
    setNewOption('');
    toast.success('Polymorphic link option added successfully');
  };


  const handleStartEdit = (idx: number, val: string) => {
    setEditingOptionIdx(idx);
    setEditingOptionVal(val);
  };

  const handleSaveEdit = (idx: number) => {
    const trimmed = editingOptionVal.trim().toUpperCase().replace(/\s+/g, '_');
    if (!trimmed) return;
    if (polymorphicOptions.includes(trimmed) && polymorphicOptions[idx] !== trimmed) {
      toast.error('Option already exists.');
      return;
    }
    const updated = [...polymorphicOptions];
    updated[idx] = trimmed;
    setPolymorphicOptions(updated);
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(updated));
    setEditingOptionIdx(null);
    toast.success('Option updated successfully');
  };

  const handleDeleteOption = async (idx: number) => {
    const isConfirmed = await confirm({
      title: 'Delete Polymorphic Option?',
      message: 'Are you sure you want to delete this option? Device models currently referencing this allowed component type will retain it, but it will be removed from future templates configuration options.'
    });
    if (!isConfirmed) return;
    const updated = polymorphicOptions.filter((_, i) => i !== idx);
    setPolymorphicOptions(updated);
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(updated));
    toast.success('Polymorphic link option deleted');
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      <style>{`
        @keyframes soundwave {
          0%, 100% { height: 4px; }
          50% { height: 24px; }
        }
        .sound-bar {
          animation: soundwave 1.2s ease-in-out infinite;
        }
        .accent-glow-orange { box-shadow: 0 0 15px rgba(255, 105, 0, 0.4); }
        .accent-glow-amber { box-shadow: 0 0 15px rgba(255, 138, 31, 0.4); }
        .accent-glow-emerald { box-shadow: 0 0 15px rgb(16, 185, 129, 0.4); }
        .accent-glow-indigo { box-shadow: 0 0 15px rgb(99, 102, 241, 0.4); }
      `}</style>

      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
          System <span className="text-primary">Settings</span>
        </h1>
        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
          Configure terminal station nodes, layout spacing grids, and polymorphic model rules
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start mt-4">
        {/* Modern Sidebar Navigation Card */}
        <div className="w-full md:w-64 shrink-0 glass-panel p-2.5 space-y-1">
          <p className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border/40 mb-2">
            Workspace Panels
          </p>
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {[
              { id: 'general', name: 'General Settings', icon: 'tune' },
              { id: 'appearance', name: 'Appearance Specs', icon: 'palette' },
              { id: 'polymorphic', name: 'Link Templates', icon: 'hub' },
              { id: 'system', name: 'System Diagnostics', icon: 'terminal' },
            ].map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`w-full text-left px-3.5 py-3 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-between shrink-0 md:shrink border-b border-transparent ${
                    isActive
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[18px]">{section.icon}</span>
                    <span>{section.name}</span>
                  </div>
                  {isActive && <span className="material-symbols-outlined text-[14px] hidden md:block">chevron_right</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Settings Panel Content Area */}
        <div className="flex-1 w-full max-w-2xl">
          {activeSection === 'general' && (
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
                    {/* Visual Card Mockup */}
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
                    {/* Visual Card Mockup */}
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
                    {/* Split Visual Card Mockup */}
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

              {/* Audio/Haptic Warnings with Interactive Wave */}
              <div className="glass-panel p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border/40">
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Audio Operations Hub</h3>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-0.5">
                      Synthesized signals for physical hardware scanning
                    </p>
                  </div>
                  
                  {/* Bouncing Audio Bars */}
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
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-6">
              {/* Accent Color Section */}
              <div className="glass-panel p-6 space-y-5">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Terminal Tint Spec</h3>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                    Calibrate color highlights for buttons, borders, and state changes
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                  {[
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
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
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

              {/* Slider Pill Density Section */}
              <div className="glass-panel p-6 space-y-5">
                <div>
                  <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Workspace Spacing Grid</h3>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                    Optimize layout spacing index to toggle dashboard breathing room vs data rows density
                  </p>
                </div>

                <div className="relative flex bg-muted/65 p-1 border border-border w-full rounded-xl select-none">
                  {/* Sliding Indicator Pill */}
                  <div
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-card border border-border shadow-sm rounded-lg transition-all duration-300 ease-out ${
                      density === 'compact' ? 'left-[calc(50%+2px)]' : 'left-1'
                    }`}
                  />
                  
                  <button
                    onClick={() => handleSelectDensity('default')}
                    className={`flex-1 text-center py-2.5 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors duration-200 ${
                      density === 'default' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Standard Breathing Grid
                  </button>
                  <button
                    onClick={() => handleSelectDensity('compact')}
                    className={`flex-1 text-center py-2.5 text-[10px] font-bold uppercase tracking-wider relative z-10 transition-colors duration-200 ${
                      density === 'compact' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Compact (High Data Density)
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'polymorphic' && (
            <div className="glass-panel p-6 space-y-5">
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Polymorphic Relationship Rules</h3>
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-1">
                  Manage allowable sub-component types linking parent hardware nodes
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. OBD_DONGLE"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddOption(); }}
                  className="flex h-10 flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-primary placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <button
                  onClick={handleAddOption}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-[10px] font-black uppercase tracking-widest transition-all bg-primary text-primary-foreground shadow hover:bg-primary/95 h-10 px-5 gap-2"
                >
                  <span className="material-symbols-outlined text-sm font-black">add</span> Add Class
                </button>
              </div>

              {/* Terminal List Container */}
              <div className="border border-border/80 rounded-xl bg-black/10 overflow-hidden font-mono">
                <div className="bg-muted px-4 py-2 border-b border-border/80 flex items-center justify-between text-[9px] text-muted-foreground uppercase tracking-wider">
                  <span>Registered Template Types</span>
                  <span>System Action Registry</span>
                </div>
                <div className="divide-y divide-border/40">
                  {polymorphicOptions.length > 0 ? (
                    polymorphicOptions.map((opt, idx) => (
                      <div key={opt} className="flex items-center justify-between px-4 py-3 text-[11px] group hover:bg-card/40 transition-colors">
                        {editingOptionIdx === idx ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editingOptionVal}
                              onChange={(e) => setEditingOptionVal(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(idx); }}
                              className="flex h-8 flex-1 rounded-md border border-primary/30 bg-background px-2.5 py-0.5 text-xs font-mono uppercase tracking-wider text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(idx)}
                              className="px-3 py-1 text-[9px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold uppercase tracking-wider rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingOptionIdx(null)}
                              className="px-3 py-1 text-[9px] bg-background border border-border hover:bg-muted text-muted-foreground font-semibold uppercase tracking-wider rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                              <span className="font-bold tracking-wider text-foreground uppercase">{opt}</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEdit(idx, opt)}
                                className="px-2.5 py-1 text-[9px] bg-card hover:bg-muted border border-border hover:border-primary/20 text-muted-foreground hover:text-foreground uppercase tracking-widest rounded transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteOption(idx)}
                                className="px-2.5 py-1 text-[9px] bg-red-500/10 hover:bg-red-500 border border-red-500/10 hover:border-red-600 text-red-400 hover:text-white uppercase tracking-widest rounded transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-[10px] text-muted-foreground uppercase tracking-widest">
                      No polymorphic link options defined. Add one above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'system' && (
            <div className="glass-panel p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-border/40 pb-3">
                <div className="flex items-center gap-2.5 text-primary">
                  <span className="material-symbols-outlined text-[18px]">verified_user</span>
                  <h3 className="font-black text-xs uppercase tracking-wider text-foreground">Operator Station Diagnostics</h3>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-500 font-mono text-[9px] uppercase tracking-wider font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Link Nominal
                </div>
              </div>

              {/* Console Diagnostic Grid */}
              <div className="text-[10px] text-muted-foreground space-y-1 font-mono bg-black/15 border border-border/80 rounded-xl p-4 divide-y divide-border/30">
                <div className="flex justify-between py-2.5">
                  <span className="uppercase text-muted-foreground">Gateway Core Engine:</span>
                  <span className="text-foreground font-bold">Vite React client v19.0.0</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="uppercase text-muted-foreground">Relational Schema Syncer:</span>
                  <span className="text-foreground font-bold">Neon Serverless SQL Gateway</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="uppercase text-muted-foreground">Active Server Engine:</span>
                  <span className="text-foreground font-bold">ElysiaJS Core v2.3.2</span>
                </div>
                <div className="flex justify-between py-2.5">
                  <span className="uppercase text-muted-foreground">Active Node Station:</span>
                  <span className="text-primary font-bold">NODE_ALPHA_TERMINAL</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
