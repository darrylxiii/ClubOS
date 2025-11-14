import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, MapPin, Clock, Building2, X } from 'lucide-react';

interface CareerPreferencesEditorProps {
  candidate: any;
  onChange?: (data: any) => void;
}

export function CareerPreferencesEditor({ candidate, onChange }: CareerPreferencesEditorProps) {
  const [currentSalaryMin, setCurrentSalaryMin] = useState(candidate.current_salary_min || '');
  const [currentSalaryMax, setCurrentSalaryMax] = useState(candidate.current_salary_max || '');
  const [desiredSalaryMin, setDesiredSalaryMin] = useState(candidate.desired_salary_min || '');
  const [desiredSalaryMax, setDesiredSalaryMax] = useState(candidate.desired_salary_max || '');
  const [currency, setCurrency] = useState(candidate.preferred_currency || 'USD');
  const [noticePeriod, setNoticePeriod] = useState(candidate.notice_period || '');
  const [remotePreference, setRemotePreference] = useState(candidate.remote_preference || '');
  const [remoteWorkAspiration, setRemoteWorkAspiration] = useState(candidate.remote_work_aspiration || false);
  const [availableHours, setAvailableHours] = useState(candidate.available_hours_per_week || 40);
  const [companySizePreference, setCompanySizePreference] = useState(candidate.company_size_preference || '');
  const [desiredLocations, setDesiredLocations] = useState<string[]>(
    Array.isArray(candidate.desired_locations) ? candidate.desired_locations : []
  );
  const [industries, setIndustries] = useState<string[]>(
    Array.isArray(candidate.industry_preference) ? candidate.industry_preference : []
  );
  const [newLocation, setNewLocation] = useState('');
  const [newIndustry, setNewIndustry] = useState('');

  useEffect(() => {
    onChange?.({
      current_salary_min: currentSalaryMin ? parseFloat(currentSalaryMin) : null,
      current_salary_max: currentSalaryMax ? parseFloat(currentSalaryMax) : null,
      desired_salary_min: desiredSalaryMin ? parseFloat(desiredSalaryMin) : null,
      desired_salary_max: desiredSalaryMax ? parseFloat(desiredSalaryMax) : null,
      preferred_currency: currency,
      notice_period: noticePeriod,
      desired_locations: desiredLocations,
      remote_preference: remotePreference,
      remote_work_aspiration: remoteWorkAspiration,
      available_hours_per_week: availableHours,
      company_size_preference: companySizePreference,
      industry_preference: industries,
    });
  }, [currentSalaryMin, currentSalaryMax, desiredSalaryMin, desiredSalaryMax, currency, noticePeriod, desiredLocations, remotePreference, remoteWorkAspiration, availableHours, companySizePreference, industries]);

  const handleAddLocation = () => {
    if (newLocation.trim() && !desiredLocations.includes(newLocation.trim())) {
      setDesiredLocations([...desiredLocations, newLocation.trim()]);
      setNewLocation('');
    }
  };

  const handleRemoveLocation = (location: string) => {
    setDesiredLocations(desiredLocations.filter(l => l !== location));
  };

  const handleAddIndustry = () => {
    if (newIndustry.trim() && !industries.includes(newIndustry.trim())) {
      setIndustries([...industries, newIndustry.trim()]);
      setNewIndustry('');
    }
  };

  const handleRemoveIndustry = (industry: string) => {
    setIndustries(industries.filter(i => i !== industry));
  };

  return (
    <div className="space-y-6">
      {/* Salary Information */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="current_salary_min" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Current Salary Min ({currency})
          </Label>
          <Input
            id="current_salary_min"
            type="number"
            value={currentSalaryMin}
            onChange={(e) => setCurrentSalaryMin(e.target.value)}
            placeholder="e.g., 80000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="current_salary_max">Current Salary Max ({currency})</Label>
          <Input
            id="current_salary_max"
            type="number"
            value={currentSalaryMax}
            onChange={(e) => setCurrentSalaryMax(e.target.value)}
            placeholder="e.g., 100000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desired_salary_min">Desired Salary Min ({currency})</Label>
          <Input
            id="desired_salary_min"
            type="number"
            value={desiredSalaryMin}
            onChange={(e) => setDesiredSalaryMin(e.target.value)}
            placeholder="e.g., 120000"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desired_salary_max">Desired Salary Max ({currency})</Label>
          <Input
            id="desired_salary_max"
            type="number"
            value={desiredSalaryMax}
            onChange={(e) => setDesiredSalaryMax(e.target.value)}
            placeholder="e.g., 150000"
          />
        </div>
      </div>

      {/* Currency */}
      <div className="space-y-2">
        <Label htmlFor="currency">Preferred Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger id="currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="USD">USD ($)</SelectItem>
            <SelectItem value="EUR">EUR (€)</SelectItem>
            <SelectItem value="GBP">GBP (£)</SelectItem>
            <SelectItem value="CAD">CAD ($)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notice Period */}
      <div className="space-y-2">
        <Label htmlFor="notice_period" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Notice Period
        </Label>
        <Select value={noticePeriod} onValueChange={setNoticePeriod}>
          <SelectTrigger id="notice_period">
            <SelectValue placeholder="Select notice period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="immediate">Immediate</SelectItem>
            <SelectItem value="1_week">1 Week</SelectItem>
            <SelectItem value="2_weeks">2 Weeks</SelectItem>
            <SelectItem value="1_month">1 Month</SelectItem>
            <SelectItem value="2_months">2 Months</SelectItem>
            <SelectItem value="3_months">3 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desired Locations */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Desired Locations
        </Label>
        <div className="flex gap-2">
          <Input
            value={newLocation}
            onChange={(e) => setNewLocation(e.target.value)}
            placeholder="e.g., San Francisco, CA"
            onKeyDown={(e) => e.key === 'Enter' && handleAddLocation()}
          />
          <Button onClick={handleAddLocation} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {desiredLocations.map((location) => (
            <Badge key={location} variant="secondary" className="flex items-center gap-1">
              {location}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveLocation(location)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Remote Preference */}
      <div className="space-y-2">
        <Label htmlFor="remote_preference">Remote Preference</Label>
        <Select value={remotePreference} onValueChange={setRemotePreference}>
          <SelectTrigger id="remote_preference">
            <SelectValue placeholder="Select remote preference" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="remote_only">Remote Only</SelectItem>
            <SelectItem value="hybrid">Hybrid</SelectItem>
            <SelectItem value="on_site">On-Site</SelectItem>
            <SelectItem value="flexible">Flexible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Company Size Preference */}
      <div className="space-y-2">
        <Label htmlFor="company_size" className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Company Size Preference
        </Label>
        <Select value={companySizePreference} onValueChange={setCompanySizePreference}>
          <SelectTrigger id="company_size">
            <SelectValue placeholder="Select company size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="startup">Startup (&lt;50)</SelectItem>
            <SelectItem value="scaleup">Scale-up (50-500)</SelectItem>
            <SelectItem value="enterprise">Enterprise (500+)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Industries */}
      <div className="space-y-3">
        <Label>Industry Preferences</Label>
        <div className="flex gap-2">
          <Input
            value={newIndustry}
            onChange={(e) => setNewIndustry(e.target.value)}
            placeholder="e.g., FinTech, SaaS"
            onKeyDown={(e) => e.key === 'Enter' && handleAddIndustry()}
          />
          <Button onClick={handleAddIndustry} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {industries.map((industry) => (
            <Badge key={industry} variant="secondary" className="flex items-center gap-1">
              {industry}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveIndustry(industry)}
              />
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
