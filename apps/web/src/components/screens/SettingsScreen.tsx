import { useState, useEffect } from 'react';
import { useFeedback } from '@/components/ui/feedback-provider';
import { useSearchParams } from "@/lib/hooks/useSearchParams";
import { PortalSectionShell } from '@/components/layout/PortalSectionShell';
import { SettingsVisualPanel } from '@/components/screens/settings/SettingsVisualPanel';
import { SettingsDensityPanel } from '@/components/screens/settings/SettingsDensityPanel';
import { SettingsSoundPanel } from '@/components/screens/settings/SettingsSoundPanel';
import { useUserPreferences } from '@/lib/hooks/useUserPreferences';

type SettingsTab = 'visual' | 'density' | 'sound';

const SETTINGS_TABS = [
  { id: 'visual', label: 'Visual Aesthetics', icon: 'palette' },
  { id: 'density', label: 'Density Spacing', icon: 'grid_view' },
  { id: 'sound', label: 'Sound Feedback', icon: 'volume_up' },
] as const;

export const SettingsScreen = () => {
  const { toast } = useFeedback();
  const { preferences, savePreferences } = useUserPreferences();
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

  const accentColor = preferences.accent ?? 'brand';
  const density = preferences.density ?? 'default';
  const soundEnabled = preferences.soundEnabled ?? true;

  const handleSelectAccent = async (color: string) => {
    await savePreferences({ accent: color });
    toast.success(`Terminal highlight updated to: ${color.toUpperCase()}`);
  };

  const handleSelectDensity = async (mode: string) => {
    await savePreferences({ density: mode });
    toast.success(`Density spacing set to: ${mode.toUpperCase()}`);
  };

  const handleToggleSound = async () => {
    const nextVal = !soundEnabled;
    await savePreferences({ soundEnabled: nextVal });
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
