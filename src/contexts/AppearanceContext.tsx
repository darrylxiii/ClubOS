import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthPrefetch } from '@/hooks/useAuthPrefetch';
import { supabase } from '@/integrations/supabase/client';
import { notify } from '@/lib/notify';

interface AppearanceSettings {
  backgroundEnabled: boolean;
  backgroundType: 'preset' | 'custom' | 'ai_generated' | 'video';
  backgroundValue: string | null;
  blurEnabled: boolean;
  blurIntensity: number;
  overlayColor: string;
  overlayOpacity: number;
  applyToAllPages: boolean;
  accentColor: string | null;
}

interface AppearanceContextType {
  settings: AppearanceSettings;
  updateSettings: (partial: Partial<AppearanceSettings>) => Promise<void>;
  loading: boolean;
}

const defaultSettings: AppearanceSettings = {
  backgroundEnabled: false,
  backgroundType: 'video',
  backgroundValue: '/videos/surreal-background.mp4',
  blurEnabled: true,
  blurIntensity: 24,
  overlayColor: 'hsl(var(--background))',
  overlayOpacity: 60,
  applyToAllPages: true,
  accentColor: null,
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: prefetch } = useAuthPrefetch();
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Read from prefetch cache instead of separate DB fetch
  useEffect(() => {
    if (!user) {
      setSettings(defaultSettings);
      setLoading(false);
      setInitialized(false);
      return;
    }

    if (!prefetch || initialized) return;

    const data = prefetch.preferences;
    if (data) {
      const bgType = data.background_type as 'preset' | 'custom' | 'ai_generated' | 'video';
      setSettings({
        backgroundEnabled: data.background_enabled ?? defaultSettings.backgroundEnabled,
        backgroundType: bgType ?? defaultSettings.backgroundType,
        backgroundValue: data.background_value ?? defaultSettings.backgroundValue,
        blurEnabled: data.background_blur_enabled ?? defaultSettings.blurEnabled,
        blurIntensity: data.background_blur_intensity ?? defaultSettings.blurIntensity,
        overlayColor: data.overlay_color ?? defaultSettings.overlayColor,
        overlayOpacity: data.overlay_opacity ?? defaultSettings.overlayOpacity,
        applyToAllPages: data.apply_to_all_pages ?? defaultSettings.applyToAllPages,
        accentColor: data.accent_color ?? defaultSettings.accentColor,
      });
    }

    setLoading(false);
    setInitialized(true);
  }, [user, prefetch, initialized]);

  const updateSettings = async (partial: Partial<AppearanceSettings>) => {
    if (!user) return;

    const newSettings = { ...settings, ...partial };
    setSettings(newSettings);

    try {
      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        background_enabled: newSettings.backgroundEnabled,
        background_type: newSettings.backgroundType,
        background_value: newSettings.backgroundValue,
        background_blur_enabled: newSettings.blurEnabled,
        background_blur_intensity: newSettings.blurIntensity,
        overlay_color: newSettings.overlayColor,
        overlay_opacity: newSettings.overlayOpacity,
        apply_to_all_pages: newSettings.applyToAllPages,
        accent_color: newSettings.accentColor,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating appearance settings:', error);
      notify.error('Failed to save appearance settings');
    }
  };

  return (
    <AppearanceContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within AppearanceProvider');
  }
  return context;
}
