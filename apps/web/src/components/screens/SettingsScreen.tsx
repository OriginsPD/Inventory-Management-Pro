import { useState, useEffect } from 'react';
import { useFeedback } from '@/components/ui/feedback-provider';
import { useSearchParams } from "@/lib/hooks/useSearchParams";
import { readLocalStorage, writeLocalStorage } from '@/lib/client-storage';
import { PortalSectionShell } from '@/components/layout/PortalSectionShell';
import { SettingsVisualPanel } from '@/components/screens/settings/SettingsVisualPanel';
import { SettingsDensityPanel } from '@/components/screens/settings/SettingsDensityPanel';
import { SettingsSoundPanel } from '@/components/screens/settings/SettingsSoundPanel';

type SettingsTab = 'visual' | 'density' | 'sound';

const SETTINGS_TABS = [
  { id: 'visual', label: 'Visual Aesthetics', icon: 'palette' },
  { id: 'density', label: 'Density Spacing', icon: 'grid_view' },
  { id: 'sound', label: 'Sound Feedback', icon: 'volume_up' },
] as const;

export const SettingsScreen = () => {
  const { toast } = useFeedback();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = searchParams.get('tab') || 'visual';
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    (initialTab === 'visual' || initialTab === 'density' || initialTab === 'sound') ? initialTab : 'visual',
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'visual' || tab === 'density' || tab === 'sound')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    const next = tab as SettingsTab;
    setActiveTab(next);
    searchParams.set('tab', next);
    setSearchParams(searchParams);
  };

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [accentColor, setAccentColor] = useState('brand');
  const [density, setDensity] = useState('default');

  useEffect(() => {
    const storedSound = readLocalStorage('ims_sound_enabled');
    setSoundEnabled(storedSound !== null ? storedSound === 'true' : true);
    setAccentColor(readLocalStorage('ims_theme_accent') || 'brand');
    setDensity(readLocalStorage('ims_layout_density') || 'default');
  }, []);

  const handleSelectAccent = (color: string) => {
    setAccentColor(color);
    writeLocalStorage('ims_theme_accent', color);
    if (color !== 'brand') {
      document.documentElement.setAttribute('data-accent', color);
    } else {
      document.documentElement.removeAttribute('data-accent');
    }
    toast.success(`Terminal highlight updated to: ${color.toUpperCase()}`);
  };

  const handleSelectDensity = (mode: string) => {
    setDensity(mode);
    writeLocalStorage('ims_layout_density', mode);
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
    writeLocalStorage('ims_sound_enabled', String(nextVal));
    toast.success(`Audio notifications ${nextVal ? 'enabled' : 'disabled'}`);
  };

  return (
    <PortalSectionShell
      title="System"
      accentWord="Settings"
      subtitle="Personalize terminal workspace appearance, layout density, and audit sound feedback"
      tabs={[...SETTINGS_TABS]}
      activeTab={activeTab}
      onTabChange={handleTabChange}
    >
      {activeTab === 'visual' && (
        <SettingsVisualPanel accentColor={accentColor} onSelectAccent={handleSelectAccent} />
      )}
      {activeTab === 'density' && (
        <SettingsDensityPanel density={density} onSelectDensity={handleSelectDensity} />
      )}
      {activeTab === 'sound' && (
        <SettingsSoundPanel soundEnabled={soundEnabled} onToggleSound={handleToggleSound} />
      )}
    </PortalSectionShell>
  );
};
