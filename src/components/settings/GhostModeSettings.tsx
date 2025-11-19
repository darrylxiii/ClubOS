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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {ghostModeEnabled ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          Ghost Mode
        </CardTitle>
        <CardDescription>
          Control your visibility and search presence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Ghost Mode</Label>
            <p className="text-sm text-muted-foreground">
              Hide your profile from searches and recommendations
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
              Your profile is hidden from partner searches. You can still apply to jobs,
              but recruiters won't find you through matching algorithms.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 pt-4 border-t">
          <Label>Job Search Status</Label>
          <RadioGroup
            value={activelyLooking ? "active" : "passive"}
            onValueChange={(value) => onActivelyLookingChange(value === "active")}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="active" id="active" />
              <Label htmlFor="active" className="font-normal cursor-pointer">
                Actively Looking - Show me all opportunities
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="passive" id="passive" />
              <Label htmlFor="passive" className="font-normal cursor-pointer">
                Open to Opportunities - Only show exceptional matches
              </Label>
            </div>
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
};
