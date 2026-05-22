import { useState, useEffect } from 'react';
import { AppShell } from '../layout/AppShell';
import { Sun, Moon, Laptop, Volume2, Shield, Plus, Settings, Link2, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';

export const SettingsScreen = () => {
  const { theme, setTheme } = useTheme();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [activeSection, setActiveSection] = useState<'general' | 'polymorphic' | 'system'>('general');

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
  }, []);

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
      alert('Option already exists.');
      return;
    }
    const updated = [...polymorphicOptions, trimmed];
    setPolymorphicOptions(updated);
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(updated));
    setNewOption('');
  };

  const handleStartEdit = (idx: number, val: string) => {
    setEditingOptionIdx(idx);
    setEditingOptionVal(val);
  };

  const handleSaveEdit = (idx: number) => {
    const trimmed = editingOptionVal.trim().toUpperCase().replace(/\s+/g, '_');
    if (!trimmed) return;
    if (polymorphicOptions.includes(trimmed) && polymorphicOptions[idx] !== trimmed) {
      alert('Option already exists.');
      return;
    }
    const updated = [...polymorphicOptions];
    updated[idx] = trimmed;
    setPolymorphicOptions(updated);
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(updated));
    setEditingOptionIdx(null);
  };

  const handleDeleteOption = (idx: number) => {
    if (!confirm('Are you sure you want to delete this option? Device models currently referencing this allowed component type will retain it, but it will be removed from future templates configuration options.')) return;
    const updated = polymorphicOptions.filter((_, i) => i !== idx);
    setPolymorphicOptions(updated);
    localStorage.setItem('ims_polymorphic_link_options', JSON.stringify(updated));
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">System Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure your warehouse terminal, system preferences, and allowed asset relationship link templates.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Side Navigation Menu Bar */}
          <div className="w-full md:w-60 shrink-0 bg-card rounded-lg border border-border p-2 space-y-1">
            {/* Desktop Navigation */}
            <div className="hidden md:flex flex-col gap-0.5">
              <button
                onClick={() => setActiveSection('general')}
                className={`w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${
                  activeSection === 'general'
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                General Settings
              </button>
              <button
                onClick={() => setActiveSection('polymorphic')}
                className={`w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${
                  activeSection === 'polymorphic'
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Polymorphic Links
              </button>
              <button
                onClick={() => setActiveSection('system')}
                className={`w-full text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-md transition-all flex items-center gap-2 ${
                  activeSection === 'system'
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                System Information
              </button>
            </div>

            {/* Mobile Navigation (Horizontal Scrollable) */}
            <div className="flex md:hidden gap-1 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveSection('general')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeSection === 'general'
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground border border-transparent'
                }`}
              >
                <Settings className="h-3.5 w-3.5" />
                General
              </button>
              <button
                onClick={() => setActiveSection('polymorphic')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeSection === 'polymorphic'
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground border border-transparent'
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Polymorphic
              </button>
              <button
                onClick={() => setActiveSection('system')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  activeSection === 'system'
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground border border-transparent'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                System
              </button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 w-full max-w-2xl">
            {activeSection === 'general' && (
              <div className="space-y-6">
                {/* Theme Settings */}
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
                      <Sun className="h-5 w-5 mb-2 shrink-0 text-amber-500" />
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
                      <Moon className="h-5 w-5 mb-2 shrink-0 text-blue-400" />
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
                      <Laptop className="h-5 w-5 mb-2 shrink-0 text-zinc-500" />
                      <span className="text-xs font-semibold">System Default</span>
                    </button>
                  </div>
                </div>

                {/* Audio/Haptic Warnings */}
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
                      onClick={handleToggleSound}
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
              </div>
            )}

            {activeSection === 'polymorphic' && (
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-semibold text-sm">Polymorphic Link Templates</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Manage custom secondary asset component types that can be selected in Device Models relationship rules.</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. OBD_DONGLE"
                    value={newOption}
                    onChange={(e) => setNewOption(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddOption(); }}
                    className="flex h-9 flex-1 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono uppercase"
                  />
                  <button
                    onClick={handleAddOption}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add Type
                  </button>
                </div>

                <div className="border border-border rounded-lg bg-muted/5 divide-y divide-border overflow-hidden">
                  {polymorphicOptions.length > 0 ? (
                    polymorphicOptions.map((opt, idx) => (
                      <div key={opt} className="flex items-center justify-between p-3 text-xs">
                        {editingOptionIdx === idx ? (
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <input
                              type="text"
                              value={editingOptionVal}
                              onChange={(e) => setEditingOptionVal(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(idx); }}
                              className="flex h-7 flex-1 rounded-md border border-input bg-card px-2 py-0.5 text-xs font-mono uppercase"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(idx)}
                              className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingOptionIdx(null)}
                              className="px-2.5 py-1 text-[10px] bg-muted hover:bg-muted/80 text-foreground border border-border rounded font-medium transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="font-mono font-bold tracking-wider text-foreground">{opt}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleStartEdit(idx, opt)}
                                className="px-2 py-1 text-[10px] bg-background border border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded font-semibold transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteOption(idx)}
                                className="px-2 py-1 text-[10px] bg-destructive/10 hover:bg-destructive text-destructive hover:text-destructive-foreground rounded font-semibold transition-all"
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
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
};
