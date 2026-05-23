import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useFeedback } from '../ui/feedback-provider';

export const SettingsScreen = () => {
  const { toast, confirm } = useFeedback();
  const { theme, setTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeSection, setActiveSection] = useState<'general' | 'appearance' | 'polymorphic' | 'system'>('general');
  const [accentColor, setAccentColor] = useState('zinc');
  const [density, setDensity] = useState('default');

  // Polymorphic Links Config CRUD States
  const [polymorphicOptions, setPolymorphicOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');
  const [editingOptionIdx, setEditingOptionIdx] = useState<number | null>(null);
  const [editingOptionVal, setEditingOptionVal] = useState('');

  // Sync sound settings with localStorage
  useEffect(() => {
    const storedSound = localStorage.getItem('ims_sound_enabled');
    if (storedSound !== null) {
      setSoundEnabled(storedSound === 'true');
    }

    const savedAccent = localStorage.getItem('ims_theme_accent') || 'zinc';
    setAccentColor(savedAccent);
    
    const savedDensity = localStorage.getItem('ims_layout_density') || 'default';
    setDensity(savedDensity);
  }, []);

  const handleSelectAccent = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('ims_theme_accent', color);
    if (color !== 'zinc') {
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

  // Sync Polymorphic Link Options
  useEffect(() => {
    const stored = localStorage.getItem('ims_polymorphic_link_options');
    if (stored) {
      try {
        setPolymorphicOptions(JSON.parse(stored));
      } catch (e) {
        initDefaultOptions();
      }
    } else {
      initDefaultOptions();
    }
  }, []);

  const initDefaultOptions = () => {
    const defaultOptions = ['SIM', 'SD_CARD', 'PANIC_BUTTON', 'KEYFOB'];
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(defaultOptions));
    setPolymorphicOptions(defaultOptions);
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#d8e2fd]">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure your warehouse terminal, system preferences, and allowed asset relationship link templates.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Side Navigation Menu Bar */}
          <div className="w-full md:w-60 shrink-0 bg-primary/5 rounded-2xl border border-primary/10 p-2 space-y-1">
            {/* Desktop Navigation */}
            <div className="hidden md:flex flex-col gap-0.5">
              <button
                onClick={() => setActiveSection('general')}
                className={`w-full text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2.5 ${
                  activeSection === 'general'
                    ? 'bg-primary/20 text-primary border-r-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5 border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">settings</span>
                General Settings
              </button>
              <button
                onClick={() => setActiveSection('appearance')}
                className={`w-full text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2.5 ${
                  activeSection === 'appearance'
                    ? 'bg-primary/20 text-primary border-r-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5 border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">palette</span>
                Appearance Settings
              </button>
              <button
                onClick={() => setActiveSection('polymorphic')}
                className={`w-full text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2.5 ${
                  activeSection === 'polymorphic'
                    ? 'bg-primary/20 text-primary border-r-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5 border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">link</span>
                Polymorphic Links
              </button>
              <button
                onClick={() => setActiveSection('system')}
                className={`w-full text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2.5 ${
                  activeSection === 'system'
                    ? 'bg-primary/20 text-primary border-r-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/5 border border-transparent'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">monitor</span>
                System Information
              </button>
            </div>

            {/* Mobile Navigation */}
            <div className="flex md:hidden gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveSection('general')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeSection === 'general'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">settings</span>
                General
              </button>
              <button
                onClick={() => setActiveSection('appearance')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeSection === 'appearance'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">palette</span>
                Appearance
              </button>
              <button
                onClick={() => setActiveSection('polymorphic')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeSection === 'polymorphic'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">link</span>
                Polymorphic
              </button>
              <button
                onClick={() => setActiveSection('system')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeSection === 'system'
                    ? 'bg-primary/20 text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">monitor</span>
                System
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 w-full max-w-2xl">
            {activeSection === 'general' && (
              <div className="space-y-6">
                {/* Theme Settings */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <div>
                    <h3 className="font-bold text-sm">Theme Preference</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Toggle the visual style of the application workspace.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {/* Option: Light */}
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center justify-between p-4 rounded-lg border text-center transition-all ${
                        theme === 'light'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary text-[#d8e2fd]'
                          : 'border-primary/10 bg-transparent text-muted-foreground hover:text-foreground hover:bg-primary/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl mb-2 text-amber-400">light_mode</span>
                      <span className="text-xs font-semibold">Light Mode</span>
                    </button>

                    {/* Option: Dark */}
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center justify-between p-4 rounded-lg border text-center transition-all ${
                        theme === 'dark'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary text-[#d8e2fd]'
                          : 'border-primary/10 bg-transparent text-muted-foreground hover:text-foreground hover:bg-primary/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl mb-2 text-primary">dark_mode</span>
                      <span className="text-xs font-semibold">Dark Mode</span>
                    </button>

                    {/* Option: System */}
                    <button
                      onClick={() => setTheme('system')}
                      className={`flex flex-col items-center justify-between p-4 rounded-lg border text-center transition-all ${
                        theme === 'system'
                          ? 'border-primary bg-primary/10 ring-1 ring-primary text-[#d8e2fd]'
                          : 'border-primary/10 bg-transparent text-muted-foreground hover:text-foreground hover:bg-primary/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl mb-2 text-zinc-400">computer</span>
                      <span className="text-xs font-semibold">System Default</span>
                    </button>
                  </div>
                </div>

                {/* Audio/Haptic Warnings */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm">Audio & Haptic Feedback</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Toggle sound signals during hardware scanning sequences.</p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-xl">volume_up</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-primary/10 pt-4">
                    <div className="space-y-0.5">
                      <label className="text-xs font-semibold text-[#d8e2fd]">Acoustic Gun Indicators</label>
                      <p className="text-[10px] text-muted-foreground">Play tone beeps for successful scans and low buzzes for errors.</p>
                    </div>
                    <button
                      onClick={handleToggleSound}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary ${
                        soundEnabled ? 'bg-primary' : 'bg-primary/10 border-primary/20'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-[#081326] shadow ring-0 transition duration-200 ease-in-out ${
                          soundEnabled ? 'translate-x-4' : 'translate-x-0'
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
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <div>
                    <h3 className="font-bold text-sm">Theme Accent Color</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Select a custom accent color theme for buttons, active items, and alerts.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    {[
                      { name: 'Default (Zinc)', value: 'zinc', bg: 'bg-zinc-500' },
                      { name: 'Orange', value: 'orange', bg: 'bg-orange-500' },
                      { name: 'Amber', value: 'amber', bg: 'bg-amber-500' },
                      { name: 'Emerald', value: 'emerald', bg: 'bg-emerald-500' },
                      { name: 'Indigo', value: 'indigo', bg: 'bg-indigo-500' }
                    ].map((accent) => {
                      const isSelected = accentColor === accent.value;
                      return (
                        <button
                          key={accent.value}
                          onClick={() => handleSelectAccent(accent.value)}
                          className={`flex flex-col items-center justify-between p-3.5 rounded-lg border text-center transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary text-[#d8e2fd]'
                              : 'border-primary/10 bg-transparent text-muted-foreground hover:text-[#d8e2fd] hover:bg-primary/5'
                          }`}
                        >
                          <span className={`h-4 w-4 rounded-full ${accent.bg} mb-2 shrink-0 flex items-center justify-center`}>
                            {isSelected && <span className="material-symbols-outlined text-[10px] text-[#081326] font-bold">check</span>}
                          </span>
                          <span className="text-[10px] font-semibold">{accent.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Density Section */}
                <div className="glass-panel p-6 rounded-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm">Workspace Spacing & Density</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Adjust density layout for optimized data-density vs visual breathing room.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-primary/5 p-1 rounded-xl border border-primary/10">
                    <button
                      onClick={() => handleSelectDensity('default')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        density === 'default'
                          ? 'bg-primary/20 text-primary shadow-sm'
                          : 'text-[#bec8ce] hover:text-[#d8e2fd]'
                      }`}
                    >
                      Standard Layout
                    </button>
                    <button
                      onClick={() => handleSelectDensity('compact')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                        density === 'compact'
                          ? 'bg-primary/20 text-primary shadow-sm'
                          : 'text-[#bec8ce] hover:text-[#d8e2fd]'
                      }`}
                    >
                      High Density (Compact)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'polymorphic' && (
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div>
                  <h3 className="font-bold text-sm">Polymorphic Link Templates</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage custom secondary asset component types that can be selected in Device Models relationship rules.</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. OBD_DONGLE"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddOption(); }}
                    className="flex h-10 flex-1 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/35 focus:ring-1 focus:ring-primary focus:outline-none font-mono uppercase text-primary"
                  />
                  <button
                    onClick={handleAddOption}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all bg-primary text-[#081326] shadow hover:bg-primary/95 h-10 px-4 gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">add</span> Add Type
                  </button>
                </div>

                <div className="border border-primary/10 rounded-xl bg-primary/5 divide-y divide-primary/10 overflow-hidden">
                  {polymorphicOptions.length > 0 ? (
                    polymorphicOptions.map((opt, idx) => (
                      <div key={opt} className="flex items-center justify-between p-3.5 text-xs">
                        {editingOptionIdx === idx ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <input
                              type="text"
                              value={editingOptionVal}
                              onChange={(e) => setEditingOptionVal(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(idx); }}
                              className="flex h-8 flex-1 rounded-lg border border-primary/20 bg-[#081326] px-2 py-0.5 text-xs font-mono uppercase text-primary"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(idx)}
                              className="px-3 py-1 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-[#081326] rounded-md font-bold transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingOptionIdx(null)}
                              className="px-3 py-1 text-[10px] bg-[#081326] hover:bg-primary/5 text-[#bec8ce] border border-primary/10 rounded-md font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-mono font-bold tracking-wider text-primary">{opt}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStartEdit(idx, opt)}
                                className="px-2.5 py-1 text-[10px] bg-[#081326] border border-primary/10 hover:bg-primary/5 text-primary rounded-md font-bold transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteOption(idx)}
                                className="px-2.5 py-1 text-[10px] bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-[#081326] rounded-md font-bold transition-all border border-red-500/20"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No polymorphic link options defined. Add one above.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'system' && (
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 text-primary">
                  <span className="material-symbols-outlined text-sm">security</span>
                  <h3 className="font-bold text-xs uppercase tracking-wider">Workspace Verification</h3>
                </div>
                <div className="text-xs text-[#bec8ce] space-y-2.5 font-mono">
                  <div className="flex justify-between border-b border-primary/5 pb-2">
                    <span>Client Engine:</span>
                    <span className="text-primary font-bold">Vite React v19</span>
                  </div>
                  <div className="flex justify-between border-b border-primary/5 pb-2">
                    <span>Database Syncer:</span>
                    <span className="text-primary font-bold">Neon Serverless PostgreSQL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>API Gateway:</span>
                    <span className="text-primary font-bold">ElysiaJS v2.3</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
};

