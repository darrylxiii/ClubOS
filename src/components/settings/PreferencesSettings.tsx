import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Globe } from 'lucide-react';
import { toast } from 'sonner';

interface PreferencesSettingsProps {
  preferredCurrency: 'EUR' | 'USD' | 'GBP' | 'AED';
  onCurrencyChange: (currency: 'EUR' | 'USD' | 'GBP' | 'AED') => void;
}

export const PreferencesSettings = ({
  preferredCurrency,
  onCurrencyChange
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
            <Select defaultValue="en">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="nl">Nederlands</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select defaultValue="europe/amsterdam">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="europe/amsterdam">Europe/Amsterdam</SelectItem>
                <SelectItem value="america/new_york">America/New_York</SelectItem>
                <SelectItem value="asia/tokyo">Asia/Tokyo</SelectItem>
                <SelectItem value="europe/london">Europe/London</SelectItem>
                <SelectItem value="america/los_angeles">America/Los_Angeles</SelectItem>
              </SelectContent>
            </Select>
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
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Job salaries will be automatically converted to your preferred currency
            </p>
          </div>

          <Button 
            onClick={() => toast.success("Preferences saved")}
            className="w-full"
          >
            Save Preferences
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
            <Select defaultValue="daily">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="realtime">Real-time</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Preferred Company Size</Label>
            <Select defaultValue="any">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any size</SelectItem>
                <SelectItem value="startup">Startup (1-50)</SelectItem>
                <SelectItem value="scaleup">Scale-up (51-500)</SelectItem>
                <SelectItem value="enterprise">Enterprise (500+)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Industry Preferences</Label>
            <Select defaultValue="any">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All industries</SelectItem>
                <SelectItem value="tech">Technology</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="healthcare">Healthcare</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="consulting">Consulting</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
