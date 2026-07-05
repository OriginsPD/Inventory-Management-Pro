import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '@/lib/api-client';
import { readLocalStorage, writeLocalStorage } from '@/lib/client-storage';

export interface UserPreferences {
  accent?: string;
  density?: string;
  soundEnabled?: boolean;
  sidebarCollapsed?: boolean;
  onboardingComplete?: boolean;
  reportFilters?: Record<string, unknown>;
}

const STORAGE_KEY = 'ims_user_preferences';

export function useUserPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const stored = readLocalStorage(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    return {
      accent: readLocalStorage('ims_theme_accent') || 'brand',
      density: readLocalStorage('ims_layout_density') || 'default',
      soundEnabled: readLocalStorage('ims_sound_enabled') !== 'false',
    };
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.get<UserPreferences>('/api/users/me/preferences', { suppressAuthRedirect: true })
      .then((serverPrefs) => {
        if (serverPrefs && Object.keys(serverPrefs).length > 0) {
          setPreferences((prev) => ({ ...prev, ...serverPrefs }));
          writeLocalStorage(STORAGE_KEY, JSON.stringify({ ...preferences, ...serverPrefs }));
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savePreferences = useCallback(async (patch: Partial<UserPreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    writeLocalStorage(STORAGE_KEY, JSON.stringify(next));

    if (patch.accent !== undefined) {
      writeLocalStorage('ims_theme_accent', patch.accent);
      if (patch.accent !== 'brand') document.documentElement.setAttribute('data-accent', patch.accent);
      else document.documentElement.removeAttribute('data-accent');
    }
    if (patch.density !== undefined) {
      writeLocalStorage('ims_layout_density', patch.density);
      document.documentElement.classList.toggle('density-compact', patch.density === 'compact');
    }
    if (patch.soundEnabled !== undefined) {
      writeLocalStorage('ims_sound_enabled', String(patch.soundEnabled));
    }

    try {
      await apiClient.put('/api/users/me/preferences', { preferences: next });
    } catch {
      // offline fallback already in localStorage
    }
  }, [preferences]);

  return { preferences, savePreferences, isLoading };
}
