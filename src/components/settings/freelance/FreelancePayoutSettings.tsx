import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, Loader2, Zap, Calendar } from "lucide-react";
import { toast } from "sonner";

interface FreelancePayoutSettingsProps {
  userId: string;
  freelanceProfile: any;
  onUpdate: () => void;
}

export function FreelancePayoutSettings({ userId, freelanceProfile, onUpdate }: FreelancePayoutSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [payoutSchedule, setPayoutSchedule] = useState<string>(freelanceProfile?.payout_schedule || 'weekly');
  const [instantPayoutEnabled, setInstantPayoutEnabled] = useState<boolean>(freelanceProfile?.instant_payout_enabled ?? false);

  useEffect(() => {
    if (freelanceProfile) {
      setPayoutSchedule(freelanceProfile.payout_schedule || 'weekly');
      setInstantPayoutEnabled(freelanceProfile.instant_payout_enabled ?? false);
    }
  }, [freelanceProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("freelance_profiles")
        .upsert({
          id: userId,
          payout_schedule: payoutSchedule,
          instant_payout_enabled: instantPayoutEnabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      toast.success("Payout settings saved");
      onUpdate();
    } catch (error: unknown) {
      console.error("Error saving payout settings:", error);
      toast.error("Failed to save payout settings");
    } finally {
      setSaving(false);
    }
  };

  const isStripeConnected = freelanceProfile?.stripe_connect_onboarded;

  if (!isStripeConnected) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Set Up Payments First</h3>
          <p className="text-muted-foreground">
            Complete your Stripe Connect setup above to configure payout preferences.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Payout Preferences
        </CardTitle>
        <CardDescription>
          Configure how and when you receive your earnings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payout Schedule */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Payout Schedule
          </Label>
          <RadioGroup value={payoutSchedule} onValueChange={setPayoutSchedule}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                payoutSchedule === 'daily' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                <RadioGroupItem value="daily" id="daily" className="sr-only" />
                <div>
                  <p className="font-medium">Daily</p>
                  <p className="text-xs text-muted-foreground">Receive payouts every day</p>
                </div>
              </label>
              <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                payoutSchedule === 'weekly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                <RadioGroupItem value="weekly" id="weekly" className="sr-only" />
                <div>
                  <p className="font-medium">Weekly</p>
                  <p className="text-xs text-muted-foreground">Every Monday</p>
                </div>
              </label>
              <label className={`flex items-center p-4 rounded-lg border cursor-pointer transition-colors ${
                payoutSchedule === 'monthly' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}>
                <RadioGroupItem value="monthly" id="monthly" className="sr-only" />
                <div>
                  <p className="font-medium">Monthly</p>
                  <p className="text-xs text-muted-foreground">First of each month</p>
                </div>
              </label>
            </div>
          </RadioGroup>
        </div>

        {/* Instant Payout */}
        <div className="p-4 rounded-lg border bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-medium">Instant Payouts</p>
                <p className="text-sm text-muted-foreground">
                  Get your earnings within minutes (1.5% fee applies)
                </p>
              </div>
            </div>
            <Switch
              checked={instantPayoutEnabled}
              onCheckedChange={setInstantPayoutEnabled}
            />
          </div>
        </div>

        {/* Payout Summary */}
        <div className="p-4 rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">Your Payout Settings</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Regular payouts: {payoutSchedule}</li>
            <li>• Instant payouts: {instantPayoutEnabled ? 'Enabled (1.5% fee)' : 'Disabled'}</li>
            <li>• Minimum payout: €10</li>
          </ul>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Payout Settings"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
