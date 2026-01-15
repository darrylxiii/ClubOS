import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface CompensationTabProps {
  currentSalaryRange: [number, number];
  desiredSalaryRange: [number, number];
  preferredCurrency: 'EUR' | 'USD' | 'GBP' | 'AED';
  isSaving: boolean;
  onCurrentSalaryChange: (value: [number, number]) => void;
  onDesiredSalaryChange: (value: [number, number]) => void;
  onCurrencyChange: (value: 'EUR' | 'USD' | 'GBP' | 'AED') => void;
  onSave: () => void;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  AED: 'AED',
};

export function CompensationTab({
  currentSalaryRange,
  desiredSalaryRange,
  preferredCurrency,
  isSaving,
  onCurrentSalaryChange,
  onDesiredSalaryChange,
  onCurrencyChange,
  onSave,
}: CompensationTabProps) {
  const formatSalary = (value: number) => {
    return `${CURRENCY_SYMBOLS[preferredCurrency]}${(value / 1000).toFixed(0)}k`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Currency Preference</CardTitle>
          <CardDescription>Select your preferred currency for salary display</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={preferredCurrency}
            onValueChange={(value) => onCurrencyChange(value as 'EUR' | 'USD' | 'GBP' | 'AED')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="AED">AED (AED)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Salary</CardTitle>
          <CardDescription>
            {formatSalary(currentSalaryRange[0])} - {formatSalary(currentSalaryRange[1])} per year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Slider
            min={0}
            max={500000}
            step={5000}
            value={currentSalaryRange}
            onValueChange={(value) => onCurrentSalaryChange(value as [number, number])}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Desired Salary</CardTitle>
          <CardDescription>
            {formatSalary(desiredSalaryRange[0])} - {formatSalary(desiredSalaryRange[1])} per year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Slider
            min={0}
            max={500000}
            step={5000}
            value={desiredSalaryRange}
            onValueChange={(value) => onDesiredSalaryChange(value as [number, number])}
            className="w-full"
          />
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={isSaving}>
        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  );
}
