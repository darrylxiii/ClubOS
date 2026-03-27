import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Eye, EyeOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface GhostModeSettingsProps {
  ghostModeEnabled: boolean;
  activelyLooking: boolean;
  onGhostModeChange: (enabled: boolean) => void;
  onActivelyLookingChange: (looking: boolean) => void;
}

export const GhostModeSettings = ({
  ghostModeEnabled,
  activelyLooking,
  onGhostModeChange,
  onActivelyLookingChange,
}: GhostModeSettingsProps) => {
  const { t } = useTranslation('settings');
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {ghostModeEnabled ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          {t('privacy.ghostMode')}
        </CardTitle>
        <CardDescription>
          {t('privacy.ghostModeDesc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('privacy.enableGhostMode')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('privacy.hideFromSearches')}
            </p>
          </div>
          <Switch
            checked={ghostModeEnabled}
            onCheckedChange={onGhostModeChange}
          />
        </div>

        {ghostModeEnabled && (
          <Alert>
            <AlertDescription>
              {t('privacy.ghostModeAlert')}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 pt-4 border-t">
          <Label>{t('privacy.jobSearchStatus')}</Label>
          <RadioGroup
            value={activelyLooking ? "active" : "passive"}
            onValueChange={(value) => onActivelyLookingChange(value === "active")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="active" id="active" />
              <Label htmlFor="active" className="font-normal cursor-pointer">
                {t('privacy.activelyLooking')}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passive" id="passive" />
              <Label htmlFor="passive" className="font-normal cursor-pointer">
                {t('privacy.openToOpportunities')}
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};
