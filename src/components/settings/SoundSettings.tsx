import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Volume2,
  VolumeX,
  Bell,
  Trophy,
  Users,
  Briefcase,
  MousePointer,
  Radio,
  Play,
  Sparkles,
} from 'lucide-react';
import { useQuantumSound } from '@/hooks/useQuantumSound';
import type { SoundCategory } from '@/lib/sounds/SoundScheduler';
import type { SoundPreset } from '@/lib/sounds/QuantumSoundEngine';

const STORAGE_KEY = 'sound-effects-enabled';

const CATEGORY_CONFIG: Array<{
  key: SoundCategory;
  labelKey: string;
  fallback: string;
  descKey: string;
  descFallback: string;
  icon: React.ElementType;
  previewSound: string;
}> = [
  {
    key: 'notification',
    labelKey: 'sound.category.notifications',
    fallback: 'Notifications',
    descKey: 'sound.category.notificationsDesc',
    descFallback: 'Messages, mentions, meeting reminders',
    icon: Bell,
    previewSound: 'notification.message_received',
  },
  {
    key: 'achievement',
    labelKey: 'sound.category.achievements',
    fallback: 'Achievements',
    descKey: 'sound.category.achievementsDesc',
    descFallback: 'Unlocks, XP, streaks, level ups',
    icon: Trophy,
    previewSound: 'achievement.rare',
  },
  {
    key: 'social',
    labelKey: 'sound.category.social',
    fallback: 'Social',
    descKey: 'sound.category.socialDesc',
    descFallback: 'Reactions, connections, profile views',
    icon: Users,
    previewSound: 'social.connection_accepted',
  },
  {
    key: 'pipeline',
    labelKey: 'sound.category.pipeline',
    fallback: 'Pipeline',
    descKey: 'sound.category.pipelineDesc',
    descFallback: 'Stage changes, applications, placements',
    icon: Briefcase,
    previewSound: 'pipeline.stage_advanced',
  },
  {
    key: 'micro',
    labelKey: 'sound.category.micro',
    fallback: 'Micro-interactions',
    descKey: 'sound.category.microDesc',
    descFallback: 'Clicks, toggles, form feedback',
    icon: MousePointer,
    previewSound: 'micro.form_success',
  },
  {
    key: 'ambient',
    labelKey: 'sound.category.ambient',
    fallback: 'Ambient',
    descKey: 'sound.category.ambientDesc',
    descFallback: 'AI thinking, platform activity, sync',
    icon: Radio,
    previewSound: 'ambient.ai_ready',
  },
];

const PRESETS: Array<{
  key: SoundPreset;
  labelKey: string;
  fallback: string;
  descKey: string;
  descFallback: string;
}> = [
  {
    key: 'minimal',
    labelKey: 'sound.preset.minimal',
    fallback: 'Minimal',
    descKey: 'sound.preset.minimalDesc',
    descFallback: 'Only clicks and critical alerts',
  },
  {
    key: 'balanced',
    labelKey: 'sound.preset.balanced',
    fallback: 'Balanced',
    descKey: 'sound.preset.balancedDesc',
    descFallback: 'Notifications, achievements, pipeline',
  },
  {
    key: 'immersive',
    labelKey: 'sound.preset.immersive',
    fallback: 'Immersive',
    descKey: 'sound.preset.immersiveDesc',
    descFallback: 'Everything including social and ambient',
  },
];

export function SoundSettings() {
  const { t } = useTranslation('settings');
  const {
    preferences,
    preview,
    setMasterVolume,
    setCategoryEnabled,
    setCategoryVolume,
    setPreset,
    updatePreferences,
  } = useQuantumSound();

  // Master mute from localStorage
  const isMasterEnabled = (() => {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val === null || val === 'true'; // default ON
    } catch {
      return true;
    }
  })();

  const toggleMasterMute = () => {
    const newVal = !isMasterEnabled;
    localStorage.setItem(STORAGE_KEY, String(newVal));
    // Force re-render
    window.dispatchEvent(new Event('storage'));
    // Play a subtle regret sound when muting
    if (!newVal) {
      preview('micro.error');
    } else {
      preview('micro.form_success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Master Volume */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {t('sound.title', 'Quantum Sound')}
                </CardTitle>
                <CardDescription>
                  {t('sound.description', 'F# Lydian probability chimes — never the same sound twice')}
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMasterMute}
              className="h-10 w-10"
            >
              {isMasterEnabled ? (
                <Volume2 className="h-5 w-5" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master Volume Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('sound.masterVolume', 'Master Volume')}</Label>
              <span className="text-sm text-muted-foreground">
                {Math.round(preferences.masterVolume * 100)}%
              </span>
            </div>
            <Slider
              value={[preferences.masterVolume * 100]}
              onValueChange={([val]) => setMasterVolume(val / 100)}
              max={100}
              step={1}
              disabled={!isMasterEnabled}
            />
          </div>

          {/* Sound Personality Presets */}
          <div className="space-y-3">
            <Label>{t('sound.preset.label', 'Sound Experience')}</Label>
            <div className="grid grid-cols-3 gap-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => setPreset(preset.key)}
                  disabled={!isMasterEnabled}
                  className={`
                    p-3 rounded-xl border text-left transition-all
                    ${preferences.preset === preset.key
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="font-medium text-sm">
                    {t(preset.labelKey, preset.fallback)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t(preset.descKey, preset.descFallback)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-Category Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('sound.categories', 'Sound Categories')}
          </CardTitle>
          <CardDescription>
            {t('sound.categoriesDesc', 'Fine-tune which sounds you hear')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {CATEGORY_CONFIG.map((cat) => {
            const catPrefs = preferences.categories[cat.key];
            const Icon = cat.icon;

            return (
              <div
                key={cat.key}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {t(cat.labelKey, cat.fallback)}
                    </span>
                    {catPrefs.enabled && (
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(catPrefs.volume * 100)}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {t(cat.descKey, cat.descFallback)}
                  </p>
                </div>

                {/* Volume slider (shown when enabled) */}
                {catPrefs.enabled && (
                  <div className="w-24 hidden sm:block">
                    <Slider
                      value={[catPrefs.volume * 100]}
                      onValueChange={([val]) =>
                        setCategoryVolume(cat.key, val / 100)
                      }
                      max={100}
                      step={5}
                      disabled={!isMasterEnabled}
                    />
                  </div>
                )}

                {/* Preview button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => preview(cat.previewSound)}
                  disabled={!isMasterEnabled || !catPrefs.enabled}
                >
                  <Play className="h-3.5 w-3.5" />
                </Button>

                {/* Toggle */}
                <Switch
                  checked={catPrefs.enabled}
                  onCheckedChange={(checked) =>
                    setCategoryEnabled(cat.key, checked)
                  }
                  disabled={!isMasterEnabled}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Radio Ducking */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('sound.radioDucking', 'Radio Ducking')}
          </CardTitle>
          <CardDescription>
            {t('sound.radioDuckingDesc', 'Lower radio volume during notification sounds')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t('sound.enableDucking', 'Auto-duck radio')}</Label>
            <Switch
              checked={preferences.radioDucking}
              onCheckedChange={(checked) =>
                updatePreferences({ radioDucking: checked })
              }
              disabled={!isMasterEnabled}
            />
          </div>

          {preferences.radioDucking && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">
                  {t('sound.duckingAmount', 'Ducking amount')}
                </Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(preferences.duckingAmount * 100)}%
                </span>
              </div>
              <Slider
                value={[preferences.duckingAmount * 100]}
                onValueChange={([val]) =>
                  updatePreferences({ duckingAmount: val / 100 })
                }
                min={20}
                max={90}
                step={5}
                disabled={!isMasterEnabled}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quiet Hours Link */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Bell className="h-4 w-4" />
            <span>
              {t(
                'sound.quietHoursNote',
                'Sound notifications respect your quiet hours settings from the Alerts tab.'
              )}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
