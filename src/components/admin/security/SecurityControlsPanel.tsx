import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Shield, Plus, Trash2, Save, AlertTriangle } from 'lucide-react';
import { 
  useSecurityConfig, 
  useUpdateSecurityConfig, 
  useIPWhitelist,
  useAddToWhitelist,
  useRemoveFromWhitelist,
  WhitelistedIP
} from '@/hooks/useSecurityConfig';
import { Json } from '@/integrations/supabase/types';

interface ThresholdConfig {
  attempts: number;
  window_minutes: number;
  block_duration_hours: number;
  enabled: boolean;
}

export function SecurityControlsPanel() {
  const { data: config, isLoading } = useSecurityConfig();
  const updateConfig = useUpdateSecurityConfig();
  const whitelist = useIPWhitelist();
  const addToWhitelist = useAddToWhitelist();
  const removeFromWhitelist = useRemoveFromWhitelist();

  const [newIP, setNewIP] = useState('');
  const [newIPReason, setNewIPReason] = useState('');

  // Extract configurations
  const bruteForceConfig = config?.find(c => c.config_key === 'brute_force_threshold');
  const credentialStuffingConfig = config?.find(c => c.config_key === 'credential_stuffing_threshold');
  const enumerationConfig = config?.find(c => c.config_key === 'enumeration_threshold');
  const autoResponseConfig = config?.find(c => c.config_key === 'auto_response_enabled');

  const handleAddIP = () => {
    if (!newIP.trim()) return;
    addToWhitelist.mutate(
      { ip: newIP.trim(), reason: newIPReason.trim() || 'Manual whitelist' },
      { onSuccess: () => { setNewIP(''); setNewIPReason(''); } }
    );
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardContent className="flex items-center justify-center h-96">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Auto-Response Toggle */}
      <Card className="lg:col-span-2 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Auto-Response System
          </CardTitle>
          <CardDescription>
            Automatically block IPs based on threat detection thresholds
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium">Enable Auto-Response</p>
              <p className="text-sm text-muted-foreground">
                Automatically block IPs when thresholds are exceeded
              </p>
            </div>
            <Switch
              checked={(autoResponseConfig?.config_value as boolean) ?? true}
              onCheckedChange={(checked) => {
                updateConfig.mutate({
                  configKey: 'auto_response_enabled',
                  configValue: checked as Json,
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Brute Force Threshold */}
      <ThresholdCard
        title="Brute Force Protection"
        description="Block IPs with repeated failed login attempts for same account"
        icon={<AlertTriangle className="h-5 w-5 text-orange-500" />}
        config={bruteForceConfig?.config_value as unknown as ThresholdConfig}
        configKey="brute_force_threshold"
        onUpdate={updateConfig.mutate}
        isUpdating={updateConfig.isPending}
      />

      {/* Credential Stuffing Threshold */}
      <ThresholdCard
        title="Credential Stuffing Protection"
        description="Block IPs trying multiple different accounts"
        icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
        config={credentialStuffingConfig?.config_value as unknown as ThresholdConfig}
        configKey="credential_stuffing_threshold"
        onUpdate={updateConfig.mutate}
        isUpdating={updateConfig.isPending}
      />

      {/* Enumeration Threshold */}
      <ThresholdCard
        title="Account Enumeration Protection"
        description="Block IPs probing for valid email addresses"
        icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
        config={enumerationConfig?.config_value as unknown as ThresholdConfig}
        configKey="enumeration_threshold"
        onUpdate={updateConfig.mutate}
        isUpdating={updateConfig.isPending}
      />

      {/* IP Whitelist */}
      <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-green-500" />
            IP Whitelist
          </CardTitle>
          <CardDescription>
            IPs that will never be auto-blocked
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add IP Form */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="IP Address (e.g., 192.168.1.1)"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
                className="flex-1"
              />
              <Button
                size="sm"
                onClick={handleAddIP}
                disabled={!newIP.trim() || addToWhitelist.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Input
              placeholder="Reason (optional)"
              value={newIPReason}
              onChange={(e) => setNewIPReason(e.target.value)}
            />
          </div>

          <Separator />

          {/* Whitelist */}
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {whitelist.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No whitelisted IPs
                </p>
              ) : (
                whitelist.map((item: WhitelistedIP) => (
                  <div
                    key={item.ip}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="text-sm font-mono">{item.ip}</p>
                      <p className="text-xs text-muted-foreground">{item.reason}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => removeFromWhitelist.mutate(item.ip)}
                      disabled={removeFromWhitelist.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface ThresholdCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  config: ThresholdConfig | undefined;
  configKey: string;
  onUpdate: (params: { configKey: string; configValue: Json }) => void;
  isUpdating: boolean;
}

function ThresholdCard({ 
  title, 
  description, 
  icon, 
  config, 
  configKey,
  onUpdate,
  isUpdating 
}: ThresholdCardProps) {
  const [localConfig, setLocalConfig] = useState<ThresholdConfig>({
    attempts: config?.attempts ?? 10,
    window_minutes: config?.window_minutes ?? 15,
    block_duration_hours: config?.block_duration_hours ?? 1,
    enabled: config?.enabled ?? true,
  });

  const hasChanges = JSON.stringify(localConfig) !== JSON.stringify(config);

  const handleSave = () => {
    onUpdate({
      configKey,
      configValue: localConfig as unknown as Json,
    });
  };

  return (
    <Card className="bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border-border/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            {icon}
            {title}
          </CardTitle>
          <Switch
            checked={localConfig.enabled}
            onCheckedChange={(checked) => 
              setLocalConfig(prev => ({ ...prev, enabled: checked }))
            }
          />
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Max Attempts</Label>
            <Input
              type="number"
              min={1}
              value={localConfig.attempts}
              onChange={(e) => 
                setLocalConfig(prev => ({ ...prev, attempts: parseInt(e.target.value) || 1 }))
              }
              disabled={!localConfig.enabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Window (min)</Label>
            <Input
              type="number"
              min={1}
              value={localConfig.window_minutes}
              onChange={(e) => 
                setLocalConfig(prev => ({ ...prev, window_minutes: parseInt(e.target.value) || 1 }))
              }
              disabled={!localConfig.enabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Block (hrs)</Label>
            <Input
              type="number"
              min={1}
              value={localConfig.block_duration_hours}
              onChange={(e) => 
                setLocalConfig(prev => ({ ...prev, block_duration_hours: parseInt(e.target.value) || 1 }))
              }
              disabled={!localConfig.enabled}
            />
          </div>
        </div>

        {hasChanges && (
          <Button
            size="sm"
            className="w-full"
            onClick={handleSave}
            disabled={isUpdating}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
