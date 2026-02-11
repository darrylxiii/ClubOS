import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DollarSign, Loader2, Calculator } from "lucide-react";
import { toast } from "sonner";

interface FreelanceRatesSectionProps {
  userId: string;
  freelanceProfile: any;
  onUpdate: () => void;
}

export function FreelanceRatesSection({ userId, freelanceProfile, onUpdate }: FreelanceRatesSectionProps) {
  const [saving, setSaving] = useState(false);
  const [hourlyRateMin, setHourlyRateMin] = useState<number>(freelanceProfile?.hourly_rate_min || 50);
  const [hourlyRateMax, setHourlyRateMax] = useState<number>(freelanceProfile?.hourly_rate_max || 150);
  const [currency, setCurrency] = useState<string>(freelanceProfile?.hourly_rate_currency || 'EUR');
  const [minProjectValue, setMinProjectValue] = useState<number>(freelanceProfile?.min_project_value || 500);
  const [ratePreference, setRatePreference] = useState<string>(freelanceProfile?.project_rate_preference || 'hourly');

  useEffect(() => {
    if (freelanceProfile) {
      setHourlyRateMin(freelanceProfile.hourly_rate_min || 50);
      setHourlyRateMax(freelanceProfile.hourly_rate_max || 150);
      setCurrency(freelanceProfile.hourly_rate_currency || 'EUR');
      setMinProjectValue(freelanceProfile.min_project_value || 500);
      setRatePreference(freelanceProfile.project_rate_preference || 'hourly');
    }
  }, [freelanceProfile]);

  const handleSave = async () => {
    if (hourlyRateMin > hourlyRateMax) {
      toast.error("Minimum rate cannot exceed maximum rate");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("freelance_profiles")
        .upsert({
          id: userId,
          hourly_rate_min: hourlyRateMin,
          hourly_rate_max: hourlyRateMax,
          hourly_rate_currency: currency,
          min_project_value: minProjectValue,
          project_rate_preference: ratePreference,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

      if (error) throw error;
      toast.success("Rate settings saved");
      onUpdate();
    } catch (error: unknown) {
      console.error("Error saving rates:", error);
      toast.error("Failed to save rate settings");
    } finally {
      setSaving(false);
    }
  };

  // Calculate estimated monthly/yearly income
  const estimatedMonthly = hourlyRateMin * (freelanceProfile?.availability_hours_per_week || 20) * 4;
  const estimatedYearly = estimatedMonthly * 12;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Rates & Pricing
        </CardTitle>
        <CardDescription>
          Set your rates and pricing preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Currency */}
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">€ EUR</SelectItem>
              <SelectItem value="USD">$ USD</SelectItem>
              <SelectItem value="GBP">£ GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Hourly Rate Range */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rate-min">Minimum Hourly Rate</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}
              </span>
              <Input
                id="rate-min"
                type="number"
                min={0}
                value={hourlyRateMin}
                onChange={(e) => setHourlyRateMin(parseInt(e.target.value) || 0)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rate-max">Maximum Hourly Rate</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}
              </span>
              <Input
                id="rate-max"
                type="number"
                min={0}
                value={hourlyRateMax}
                onChange={(e) => setHourlyRateMax(parseInt(e.target.value) || 0)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {/* Minimum Project Value */}
        <div className="space-y-2">
          <Label htmlFor="min-project">Minimum Project Value</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}
            </span>
            <Input
              id="min-project"
              type="number"
              min={0}
              value={minProjectValue}
              onChange={(e) => setMinProjectValue(parseInt(e.target.value) || 0)}
              className="pl-8"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Projects below this value won't be shown to you
          </p>
        </div>

        {/* Rate Preference */}
        <div className="space-y-3">
          <Label>Preferred Pricing Model</Label>
          <RadioGroup value={ratePreference} onValueChange={setRatePreference}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="hourly" id="hourly" />
              <Label htmlFor="hourly" className="font-normal">Hourly rate</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed" className="font-normal">Fixed project price</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="both" id="both" />
              <Label htmlFor="both" className="font-normal">Both (flexible)</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Earnings Calculator */}
        <Card className="bg-muted/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Earnings Estimate</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Monthly (at min rate)</p>
                <p className="text-xl font-bold">
                  {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}
                  {estimatedMonthly.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Yearly (at min rate)</p>
                <p className="text-xl font-bold">
                  {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}
                  {estimatedYearly.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on {freelanceProfile?.availability_hours_per_week || 20} hours/week
            </p>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Rates"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
