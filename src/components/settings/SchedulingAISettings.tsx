/**
 * Scheduling AI Settings Component
 * 
 * User preferences for AI-powered scheduling features
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  Shield, 
  AlertTriangle, 
  Mail, 
  Bell,
  Sparkles,
  Save,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface AIPreferences {
  enableNoShowPredictions: boolean;
  noShowInterventionThreshold: number;
  enableFocusDefender: boolean;
  focusProtectionLevel: 'low' | 'medium' | 'high';
  autoGeneratePostMeetingSummaries: boolean;
  sendNoShowAlerts: boolean;
  sendFocusTimeReminders: boolean;
  autoBlockCalendarForTasks: boolean;
}

const defaultPreferences: AIPreferences = {
  enableNoShowPredictions: true,
  noShowInterventionThreshold: 70,
  enableFocusDefender: true,
  focusProtectionLevel: 'medium',
  autoGeneratePostMeetingSummaries: true,
  sendNoShowAlerts: true,
  sendFocusTimeReminders: false,
  autoBlockCalendarForTasks: false,
};

export function SchedulingAISettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<AIPreferences>(defaultPreferences);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user?.id]);

  const loadPreferences = async () => {
    // Load from localStorage for simplicity
    const saved = localStorage.getItem(`scheduling_ai_prefs_${user?.id}`);
    if (saved) {
      try {
        setPreferences({ ...defaultPreferences, ...JSON.parse(saved) });
      } catch (e) {
        console.error('Failed to parse saved preferences');
      }
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    try {
      localStorage.setItem(`scheduling_ai_prefs_${user.id}`, JSON.stringify(preferences));
      toast.success('AI preferences saved');
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save preferences:', err);
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPreferences(defaultPreferences);
    setHasChanges(true);
  };

  const updatePreference = <K extends keyof AIPreferences>(key: K, value: AIPreferences[K]) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* No-Show Prediction Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            No-Show Predictions
          </CardTitle>
          <CardDescription>
            AI-powered prediction of booking no-shows with automated interventions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable No-Show Predictions</Label>
              <p className="text-sm text-muted-foreground">
                Analyze booking patterns to predict potential no-shows
              </p>
            </div>
            <Switch
              checked={preferences.enableNoShowPredictions}
              onCheckedChange={(v) => updatePreference('enableNoShowPredictions', v)}
            />
          </div>

          {preferences.enableNoShowPredictions && (
            <>
              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Intervention Threshold</Label>
                  <Badge variant="outline">{preferences.noShowInterventionThreshold}%</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Trigger automated reminders when risk score exceeds this threshold
                </p>
                <Slider
                  value={[preferences.noShowInterventionThreshold]}
                  onValueChange={([v]) => updatePreference('noShowInterventionThreshold', v)}
                  min={30}
                  max={90}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>30% (More interventions)</span>
                  <span>90% (Fewer interventions)</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Send No-Show Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about high-risk bookings
                  </p>
                </div>
                <Switch
                  checked={preferences.sendNoShowAlerts}
                  onCheckedChange={(v) => updatePreference('sendNoShowAlerts', v)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Focus Time Defender Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Focus Time Defender
          </CardTitle>
          <CardDescription>
            Protect your deep work time from meeting requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Focus Defender</Label>
              <p className="text-sm text-muted-foreground">
                Block meeting requests during protected focus blocks
              </p>
            </div>
            <Switch
              checked={preferences.enableFocusDefender}
              onCheckedChange={(v) => updatePreference('enableFocusDefender', v)}
            />
          </div>

          {preferences.enableFocusDefender && (
            <>
              <Separator />

              <div className="space-y-3">
                <Label>Protection Level</Label>
                <Select
                  value={preferences.focusProtectionLevel}
                  onValueChange={(v) => updatePreference('focusProtectionLevel', v as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex flex-col">
                        <span>Low - Allow with warning</span>
                        <span className="text-xs text-muted-foreground">
                          Shows warning but allows booking
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex flex-col">
                        <span>Medium - Require confirmation</span>
                        <span className="text-xs text-muted-foreground">
                          Asks for approval before allowing
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex flex-col">
                        <span>High - Block completely</span>
                        <span className="text-xs text-muted-foreground">
                          No meetings allowed during focus time
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Focus Time Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get reminded before focus blocks start
                  </p>
                </div>
                <Switch
                  checked={preferences.sendFocusTimeReminders}
                  onCheckedChange={(v) => updatePreference('sendFocusTimeReminders', v)}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Post-Meeting Automation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Post-Meeting Automation
          </CardTitle>
          <CardDescription>
            Automate follow-ups and summaries after meetings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Generate Summaries</Label>
              <p className="text-sm text-muted-foreground">
                Automatically create meeting summaries and action items
              </p>
            </div>
            <Switch
              checked={preferences.autoGeneratePostMeetingSummaries}
              onCheckedChange={(v) => updatePreference('autoGeneratePostMeetingSummaries', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Block Calendar for Tasks</Label>
              <p className="text-sm text-muted-foreground">
                Automatically block time for action items from meetings
              </p>
            </div>
            <Switch
              checked={preferences.autoBlockCalendarForTasks}
              onCheckedChange={(v) => updatePreference('autoBlockCalendarForTasks', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={isSaving}
          className="gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
}
