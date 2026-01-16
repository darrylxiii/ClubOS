import { useState, useEffect, useCallback } from 'react';

export interface MeetingFeatureSettings {
  // Audio features
  noiseCancellation: {
    enabled: boolean;
    level: 'low' | 'medium' | 'high';
  };
  spatialAudio: {
    enabled: boolean;
  };
  audioNormalization: {
    enabled: boolean;
    targetLevel: number;
  };
  echoCancellation: {
    enabled: boolean;
  };

  // Video features
  lowLightEnhancement: {
    enabled: boolean;
    mode: 'auto' | 'manual';
    intensity: number;
  };
  virtualBackground: {
    enabled: boolean;
    type: 'none' | 'blur' | 'image';
    imageUrl?: string;
    blurRadius: number;
  };
  svc: {
    enabled: boolean;
    codec: 'vp9' | 'av1' | 'h264';
  };
  hdScreenShare: {
    enabled: boolean;
    maxFps: number;
    contentType: 'screen' | 'window' | 'tab';
  };

  // AI features
  transcription: {
    enabled: boolean;
    language: string;
    showSpeakerLabels: boolean;
  };
  gestureRecognition: {
    enabled: boolean;
    showReactions: boolean;
  };
  autoHighlight: {
    enabled: boolean;
    categories: ('action_item' | 'decision' | 'question')[];
  };

  // Network features
  adaptiveQuality: {
    enabled: boolean;
    minQuality: 'audio-only' | 'low' | 'medium';
    maxQuality: 'medium' | 'high' | 'hd';
  };
  networkResilience: {
    enabled: boolean;
    autoReconnect: boolean;
  };

  // Performance features
  performanceMonitoring: {
    enabled: boolean;
    showDashboard: boolean;
  };
  resourceOptimization: {
    enabled: boolean;
    batterySaver: boolean;
  };
}

const DEFAULT_SETTINGS: MeetingFeatureSettings = {
  noiseCancellation: { enabled: true, level: 'medium' },
  spatialAudio: { enabled: false },
  audioNormalization: { enabled: true, targetLevel: -20 },
  echoCancellation: { enabled: true },

  lowLightEnhancement: { enabled: false, mode: 'auto', intensity: 50 },
  virtualBackground: { enabled: false, type: 'none', blurRadius: 10 },
  svc: { enabled: true, codec: 'vp9' },
  hdScreenShare: { enabled: true, maxFps: 30, contentType: 'screen' },

  transcription: { enabled: false, language: 'en-US', showSpeakerLabels: true },
  gestureRecognition: { enabled: false, showReactions: true },
  autoHighlight: { enabled: false, categories: ['action_item', 'decision'] },

  adaptiveQuality: { enabled: true, minQuality: 'low', maxQuality: 'high' },
  networkResilience: { enabled: true, autoReconnect: true },

  performanceMonitoring: { enabled: true, showDashboard: false },
  resourceOptimization: { enabled: true, batterySaver: false },
};

const STORAGE_KEY = 'meeting_feature_settings';

interface UseMeetingFeatureSettingsReturn {
  settings: MeetingFeatureSettings;
  updateSetting: <K extends keyof MeetingFeatureSettings>(
    category: K,
    updates: Partial<MeetingFeatureSettings[K]>
  ) => void;
  toggleFeature: (category: keyof MeetingFeatureSettings, enabled: boolean) => void;
  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
  isFeatureEnabled: (category: keyof MeetingFeatureSettings) => boolean;
}

export function useMeetingFeatureSettings(): UseMeetingFeatureSettingsReturn {
  const [settings, setSettings] = useState<MeetingFeatureSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (_e) {
      console.warn('Failed to load feature settings:', _e);
    }
    return DEFAULT_SETTINGS;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_e) {
      console.warn('Failed to save feature settings:', _e);
    }
  }, [settings]);

  const updateSetting = useCallback(<K extends keyof MeetingFeatureSettings>(
    category: K,
    updates: Partial<MeetingFeatureSettings[K]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], ...updates },
    }));
  }, []);

  const toggleFeature = useCallback((category: keyof MeetingFeatureSettings, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], enabled },
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportSettings = useCallback(() => {
    return JSON.stringify(settings, null, 2);
  }, [settings]);

  const importSettings = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      return true;
    } catch {
      return false;
    }
  }, []);

  const isFeatureEnabled = useCallback((category: keyof MeetingFeatureSettings): boolean => {
    const setting = settings[category];
    return 'enabled' in setting ? setting.enabled : false;
  }, [settings]);

  return {
    settings,
    updateSetting,
    toggleFeature,
    resetToDefaults,
    exportSettings,
    importSettings,
    isFeatureEnabled,
  };
}
