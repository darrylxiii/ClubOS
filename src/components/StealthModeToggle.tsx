import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Eye, EyeOff, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface StealthModeToggleProps {
  stealthModeEnabled: boolean;
  stealthModeLevel: number;
  allowStealthColdOutreach: boolean;
  onStealthModeChange: (enabled: boolean) => void;
  onStealthLevelChange: (level: number) => void;
  onColdOutreachChange: (allowed: boolean) => void;
}

export const StealthModeToggle = ({
  stealthModeEnabled,
  stealthModeLevel,
  allowStealthColdOutreach,
  onStealthModeChange,
  onStealthLevelChange,
  onColdOutreachChange,
}: StealthModeToggleProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Stealth Mode</CardTitle>
            {stealthModeEnabled && (
              <Badge variant="secondary" className="ml-2">
                <EyeOff className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Anonymize your profile for cold outreach and blind hiring scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="stealth-mode">Enable Stealth Mode</Label>
            <p className="text-sm text-muted-foreground">
              Hide personal details from your profile
            </p>
          </div>
          <Switch
            id="stealth-mode"
            checked={stealthModeEnabled}
            onCheckedChange={onStealthModeChange}
          />
        </div>

        {stealthModeEnabled && (
          <>
            <div className="space-y-4 pt-4 border-t">
              <Label>Anonymization Level</Label>
              <RadioGroup
                value={stealthModeLevel.toString()}
                onValueChange={(value) => onStealthLevelChange(parseInt(value))}
              >
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="1" id="level-1" />
                  <div className="space-y-1">
                    <Label htmlFor="level-1" className="font-normal cursor-pointer">
                      Level 1 - Basic Stealth
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Hides: Name, email, phone, avatar
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="2" id="level-2" />
                  <div className="space-y-1">
                    <Label htmlFor="level-2" className="font-normal cursor-pointer">
                      Level 2 - Enhanced Stealth
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      + Generalizes location and job title, hides LinkedIn
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 space-y-0">
                  <RadioGroupItem value="3" id="level-3" />
                  <div className="space-y-1">
                    <Label htmlFor="level-3" className="font-normal cursor-pointer">
                      Level 3 - Full Stealth
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      + Maximum anonymization, region-only location
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="cold-outreach">Allow Cold Outreach</Label>
                <p className="text-sm text-muted-foreground">
                  Let The Quantum Club use your stealth profile for client pitches
                </p>
              </div>
              <Switch
                id="cold-outreach"
                checked={allowStealthColdOutreach}
                onCheckedChange={onColdOutreachChange}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                When stealth mode is active, your profile will appear anonymized to clients and
                recruiters. Your actual information remains secure and is only revealed upon mutual
                agreement.
              </AlertDescription>
            </Alert>
          </>
        )}
      </CardContent>
    </Card>
  );
};
