import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Globe } from 'lucide-react';

interface PreferencesSettingsProps {
  preferredCurrency: 'EUR' | 'USD' | 'GBP' | 'AED' | 'BTC' | 'ETH';
  onCurrencyChange: (currency: 'EUR' | 'USD' | 'GBP' | 'AED' | 'BTC' | 'ETH') => void;
  preferredLanguage: string;
  onLanguageChange: (language: string) => void;
  jobAlertFrequency: string;
  onJobAlertFrequencyChange: (frequency: string) => void;
  companySizePreference: string;
  onCompanySizeChange: (size: string) => void;
  industryPreference: string;
  onIndustryChange: (industry: string) => void;
  workTimezone: string;
  onTimezoneChange: (timezone: string) => void;
  availableHoursPerWeek: number;
  onAvailableHoursChange: (hours: number) => void;
  onSave: () => void;
  saving: boolean;
}

export const PreferencesSettings = ({
  preferredCurrency,
  onCurrencyChange,
  preferredLanguage,
  onLanguageChange,
  jobAlertFrequency,
  onJobAlertFrequencyChange,
  companySizePreference,
  onCompanySizeChange,
  industryPreference,
  onIndustryChange,
  workTimezone,
  onTimezoneChange,
  availableHoursPerWeek,
  onAvailableHoursChange,
  onSave,
  saving
}: PreferencesSettingsProps) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Display Preferences
          </CardTitle>
          <CardDescription>
            Customize how the platform looks for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={preferredLanguage} onValueChange={onLanguageChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="nl">Nederlands</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Work Timezone</Label>
            <Select value={workTimezone || 'Europe/Amsterdam'} onValueChange={onTimezoneChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Europe/Amsterdam">Europe/Amsterdam (CET/CEST)</SelectItem>
                <SelectItem value="America/New_York">America/New_York (EST/EDT)</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                <SelectItem value="Australia/Sydney">Australia/Sydney (AEDT)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your preferred timezone for meetings and work hours
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={preferredCurrency} onValueChange={onCurrencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                <SelectItem value="AED">AED (د.إ) - UAE Dirham</SelectItem>
                <SelectItem value="BTC">BTC (₿) - Bitcoin</SelectItem>
                <SelectItem value="ETH">ETH (Ξ) - Ethereum</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Job salaries will be automatically converted to your preferred currency
            </p>
          </div>

          <Button 
            onClick={onSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Display Preferences'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Career Preferences
          </CardTitle>
          <CardDescription>
            Tailor your job search experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Job Alert Frequency</Label>
            <Select value={jobAlertFrequency} onValueChange={onJobAlertFrequencyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time notifications</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
                <SelectItem value="monthly">Monthly digest</SelectItem>
                <SelectItem value="never">Never send alerts</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How often you want to receive job match notifications
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Preferred Company Size</Label>
            <Select value={companySizePreference || 'any'} onValueChange={onCompanySizeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any size</SelectItem>
                <SelectItem value="startup">Startup (1-50 employees)</SelectItem>
                <SelectItem value="scaleup">Scale-up (51-500 employees)</SelectItem>
                <SelectItem value="enterprise">Enterprise (500+ employees)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your preferred company stage and size
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Industry Preferences</Label>
            <Select value={industryPreference || 'any'} onValueChange={onIndustryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All industries</SelectItem>
                <SelectItem value="tech">Technology & Software</SelectItem>
                <SelectItem value="finance">Finance & Banking</SelectItem>
                <SelectItem value="healthcare">Healthcare & Life Sciences</SelectItem>
                <SelectItem value="ecommerce">E-commerce & Retail</SelectItem>
                <SelectItem value="consulting">Consulting & Professional Services</SelectItem>
                <SelectItem value="manufacturing">Manufacturing & Industrial</SelectItem>
                <SelectItem value="media">Media & Entertainment</SelectItem>
                <SelectItem value="education">Education & EdTech</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Your preferred industry sectors
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Available Hours Per Week</Label>
            <Input
              type="number"
              min="1"
              max="168"
              value={availableHoursPerWeek || ''}
              onChange={(e) => onAvailableHoursChange(parseInt(e.target.value) || 0)}
              placeholder="e.g., 40"
            />
            <p className="text-xs text-muted-foreground">
              How many hours per week you can commit (for freelance/contract work)
            </p>
          </div>

          <Button 
            onClick={onSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? 'Saving...' : 'Save Career Preferences'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
