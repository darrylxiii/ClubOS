import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DollarSign, Briefcase, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface CompensationSettingsProps {
  employmentType: 'fulltime' | 'freelance' | 'both';
  setEmploymentType: (value: 'fulltime' | 'freelance' | 'both') => void;
  currentSalaryRange: [number, number];
  setCurrentSalaryRange: (value: [number, number]) => void;
  desiredSalaryRange: [number, number];
  setDesiredSalaryRange: (value: [number, number]) => void;
  freelanceHourlyRate: [number, number];
  setFreelanceHourlyRate: (value: [number, number]) => void;
  fulltimeHoursPerWeek: [number, number];
  setFulltimeHoursPerWeek: (value: [number, number]) => void;
  freelanceHoursPerWeek: [number, number];
  setFreelanceHoursPerWeek: (value: [number, number]) => void;
  noticePeriod: string;
  setNoticePeriod: (value: string) => void;
  contractEndDate: Date | null;
  setContractEndDate: (value: Date | null) => void;
  hasIndefiniteContract: boolean;
  setHasIndefiniteContract: (value: boolean) => void;
  onSave: () => void;
  saving: boolean;
}

export const CompensationSettings = ({
  employmentType,
  setEmploymentType,
  currentSalaryRange,
  setCurrentSalaryRange,
  desiredSalaryRange,
  setDesiredSalaryRange,
  freelanceHourlyRate,
  setFreelanceHourlyRate,
  fulltimeHoursPerWeek,
  setFulltimeHoursPerWeek,
  freelanceHoursPerWeek,
  setFreelanceHoursPerWeek,
  noticePeriod,
  setNoticePeriod,
  contractEndDate,
  setContractEndDate,
  hasIndefiniteContract,
  setHasIndefiniteContract,
  onSave,
  saving
}: CompensationSettingsProps) => {
  const formatSalary = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculateSalaryPercentile = (salary: number): number => {
    if (salary <= 20000) return 25;
    if (salary <= 35000) return 50;
    if (salary <= 50000) return 65;
    if (salary <= 75000) return 75;
    if (salary <= 100000) return 82;
    if (salary <= 125000) return 87;
    if (salary <= 150000) return 91;
    if (salary <= 175000) return 93;
    if (salary <= 200000) return 95;
    if (salary <= 250000) return 97;
    if (salary <= 300000) return 98;
    if (salary <= 400000) return 99;
    return 99.5;
  };

  const getPercentileMessage = (percentile: number): string => {
    if (percentile >= 99) return `Top ${(100 - percentile).toFixed(1)}% worldwide 🌟`;
    if (percentile >= 95) return `Top ${100 - percentile}% worldwide 🚀`;
    if (percentile >= 90) return `Top ${100 - percentile}% worldwide ⭐`;
    if (percentile >= 75) return `Higher than ${percentile}% globally 📈`;
    return `${percentile}th percentile globally`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Compensation & Salary Bands
          </CardTitle>
          <CardDescription>Help us match you with appropriate opportunities</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Employment Type Preference */}
          <div className="space-y-4">
            <Label className="text-base font-semibold">Employment Type Preference</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                type="button"
                variant={employmentType === 'fulltime' ? 'default' : 'outline'}
                onClick={() => setEmploymentType('fulltime')}
                className="w-full"
              >
                <Briefcase className="w-4 h-4 mr-2" />
                Full-Time
              </Button>
              <Button
                type="button"
                variant={employmentType === 'freelance' ? 'default' : 'outline'}
                onClick={() => setEmploymentType('freelance')}
                className="w-full"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Freelance
              </Button>
              <Button
                type="button"
                variant={employmentType === 'both' ? 'default' : 'outline'}
                onClick={() => setEmploymentType('both')}
                className="w-full"
              >
                Both
              </Button>
            </div>
          </div>

          <Separator />

          {/* Full-Time Compensation */}
          {(employmentType === 'fulltime' || employmentType === 'both') && (
            <div className="space-y-6">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary" />
                Full-Time Compensation
              </h4>
              
              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-base font-semibold">Current Salary Range (Optional)</Label>
                  <span className="text-sm font-bold">
                    {formatSalary(currentSalaryRange[0])} - {formatSalary(currentSalaryRange[1])}
                  </span>
                </div>
                <Slider
                  value={currentSalaryRange}
                  onValueChange={(value) => setCurrentSalaryRange(value as [number, number])}
                  min={50000}
                  max={500000}
                  step={5000}
                  className="mb-4"
                />
                <div className="text-sm text-muted-foreground">
                  {getPercentileMessage(calculateSalaryPercentile(currentSalaryRange[1]))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-base font-semibold">Desired Salary Range</Label>
                  <span className="text-sm font-bold">
                    {formatSalary(desiredSalaryRange[0])} - {formatSalary(desiredSalaryRange[1])}
                  </span>
                </div>
                <Slider
                  value={desiredSalaryRange}
                  onValueChange={(value) => setDesiredSalaryRange(value as [number, number])}
                  min={50000}
                  max={500000}
                  step={5000}
                  className="mb-4"
                />
                <div className="text-sm text-muted-foreground">
                  {getPercentileMessage(calculateSalaryPercentile(desiredSalaryRange[1]))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Preferred Hours Per Week</Label>
                  <span className="text-sm font-bold">
                    {fulltimeHoursPerWeek[0]} - {fulltimeHoursPerWeek[1]} hours/week
                  </span>
                </div>
                <Slider
                  value={fulltimeHoursPerWeek}
                  onValueChange={(value) => setFulltimeHoursPerWeek(value as [number, number])}
                  min={20}
                  max={60}
                  step={1}
                />
              </div>
            </div>
          )}

          {employmentType === 'both' && <Separator />}

          {/* Freelance Compensation */}
          {(employmentType === 'freelance' || employmentType === 'both') && (
            <div className="space-y-6">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Freelance Compensation
              </h4>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Hourly Rate Range</Label>
                  <span className="text-sm font-bold">
                    {formatSalary(freelanceHourlyRate[0])}/hr - {formatSalary(freelanceHourlyRate[1])}/hr
                  </span>
                </div>
                <Slider
                  value={freelanceHourlyRate}
                  onValueChange={(value) => setFreelanceHourlyRate(value as [number, number])}
                  min={25}
                  max={500}
                  step={5}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label>Available Hours Per Week</Label>
                  <span className="text-sm font-bold">
                    {freelanceHoursPerWeek[0]} - {freelanceHoursPerWeek[1]} hours/week
                  </span>
                </div>
                <Slider
                  value={freelanceHoursPerWeek}
                  onValueChange={(value) => setFreelanceHoursPerWeek(value as [number, number])}
                  min={5}
                  max={40}
                  step={1}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notice Period & Contract */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Notice Period & Contract
          </CardTitle>
          <CardDescription>
            Information about your current employment situation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Notice Period</Label>
            <Select value={noticePeriod} onValueChange={setNoticePeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="2_weeks">2 Weeks</SelectItem>
                <SelectItem value="1_month">1 Month</SelectItem>
                <SelectItem value="2_months">2 Months</SelectItem>
                <SelectItem value="3_months">3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Indefinite Contract</Label>
              <p className="text-sm text-muted-foreground">
                Do you have a permanent contract?
              </p>
            </div>
            <Switch
              checked={hasIndefiniteContract}
              onCheckedChange={setHasIndefiniteContract}
            />
          </div>

          {!hasIndefiniteContract && (
            <div className="space-y-2">
              <Label>Contract End Date</Label>
              <input
                type="date"
                value={contractEndDate?.toISOString().split('T')[0] || ''}
                onChange={(e) => setContractEndDate(e.target.value ? new Date(e.target.value) : null)}
                className="w-full p-2 border rounded-md bg-background text-foreground"
              />
            </div>
          )}

          <Button onClick={onSave} disabled={saving} className="w-full">
            {saving ? 'Saving...' : 'Save Compensation Settings'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
