import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HostSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId: string;
  settings: {
    allowScreenShare: boolean;
    allowReactions: boolean;
    allowMicControl: boolean;
    allowVideoControl: boolean;
    allowChat: boolean;
    accessType: 'open' | 'trusted' | 'restricted';
    requireHostApproval: boolean;
    allowAddActivities: boolean;
    allowThirdPartyAudio: boolean;
  };
}

export function HostSettingsPanel({ open, onOpenChange, meetingId, settings }: HostSettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  const updateSetting = async (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    setSaving(true);
    const { error } = await supabase
      .from('meetings')
      .update({ host_settings: newSettings })
      .eq('id', meetingId);

    setSaving(false);
    
    if (error) {
      console.error('[HostSettings] Failed to update:', error);
      toast.error('Failed to update settings');
    } else {
      toast.success('Settings updated');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Host Options</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Use these host settings to organize your meeting. Only hosts have access to these options.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Meeting Management */}
          <div className="space-y-4">
            <h3 className="font-semibold">Meeting Management</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Host Control</Label>
                <p className="text-sm text-muted-foreground">
                  Control what participants can do, such as turn on Gemini notes and recordings (if available)
                </p>
              </div>
              <Switch
                checked={localSettings.requireHostApproval}
                onCheckedChange={(checked) => updateSetting('requireHostApproval', checked)}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          {/* Participant Permissions */}
          <div className="space-y-4">
            <h3 className="font-semibold">Allow Participants</h3>
            
            <div className="flex items-center justify-between">
              <Label>Share screen</Label>
              <Switch
                checked={localSettings.allowScreenShare}
                onCheckedChange={(checked) => updateSetting('allowScreenShare', checked)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Send reactions</Label>
              <Switch
                checked={localSettings.allowReactions}
                onCheckedChange={(checked) => updateSetting('allowReactions', checked)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Turn on microphone</Label>
                <p className="text-sm text-muted-foreground">
                  If turned on, you may be removing people who use an outdated version of the Meet app or meeting hardware that isn't from Google
                </p>
              </div>
              <Switch
                checked={localSettings.allowMicControl}
                onCheckedChange={(checked) => updateSetting('allowMicControl', checked)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Turn on video</Label>
                <p className="text-sm text-muted-foreground">
                  If turned on, you may be removing people who use an outdated version of the Meet app or meeting hardware that isn't from Google
                </p>
              </div>
              <Switch
                checked={localSettings.allowVideoControl}
                onCheckedChange={(checked) => updateSetting('allowVideoControl', checked)}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          {/* Chat Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow participants to send messages</Label>
                <p className="text-sm text-muted-foreground">
                  If turned on, everyone can send messages in the call
                </p>
              </div>
              <Switch
                checked={localSettings.allowChat}
                onCheckedChange={(checked) => updateSetting('allowChat', checked)}
                disabled={saving}
              />
            </div>
          </div>

          <Separator />

          {/* Access Type */}
          <div className="space-y-4">
            <h3 className="font-semibold">Meeting Access</h3>
            <p className="text-sm text-muted-foreground">
              These settings also apply to future instances of this meeting
            </p>

            <div className="space-y-2">
              <Label>Host must join before others can participate</Label>
              <Switch
                checked={localSettings.requireHostApproval}
                onCheckedChange={(checked) => updateSetting('requireHostApproval', checked)}
                disabled={saving}
              />
            </div>

            <div className="space-y-3">
              <Label>Meeting access type</Label>
              <RadioGroup
                value={localSettings.accessType}
                onValueChange={(value) => updateSetting('accessType', value)}
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="open" id="open" />
                  <div className="space-y-1">
                    <Label htmlFor="open" className="font-normal cursor-pointer">
                      Open
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      No one needs permission to participate. Anyone can join.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="trusted" id="trusted" />
                  <div className="space-y-1">
                    <Label htmlFor="trusted" className="font-normal cursor-pointer">
                      Trusted
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      People can participate without asking for permission if they're part of your organization or invited with their account. Anyone can dial in.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="restricted" id="restricted" />
                  <div className="space-y-1">
                    <Label htmlFor="restricted" className="font-normal cursor-pointer">
                      Restricted
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      People can only participate without asking for permission if they're invited with their account.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>

          <Separator />

          {/* Meeting Activities */}
          <div className="space-y-4">
            <h3 className="font-semibold">Meeting Activities</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow participants to share add-on activities</Label>
                <p className="text-sm text-muted-foreground">
                  If turned on, only activities started by a host can be shared with others
                </p>
              </div>
              <Switch
                checked={localSettings.allowAddActivities}
                onCheckedChange={(checked) => updateSetting('allowAddActivities', checked)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow third-party apps to collect audio and video</Label>
                <p className="text-sm text-muted-foreground">
                  If turned on, third-party apps have no access to Meet call audio and video when users ask about it
                </p>
              </div>
              <Switch
                checked={localSettings.allowThirdPartyAudio}
                onCheckedChange={(checked) => updateSetting('allowThirdPartyAudio', checked)}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
