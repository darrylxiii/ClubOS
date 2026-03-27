import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, X } from 'lucide-react';

interface WorkAuthorizationEditorProps {
  candidate: any;
  onChange?: (data: any) => void;
}

export function WorkAuthorizationEditor({ candidate, onChange }: WorkAuthorizationEditorProps) {
  const { t } = useTranslation('common');
  const workAuth = candidate.work_authorization || {};
  
  const [countries, setCountries] = useState<string[]>(
    Array.isArray(workAuth.countries) ? workAuth.countries : []
  );
  const [visaStatus, setVisaStatus] = useState(workAuth.visa_status || '');
  const [sponsorshipNeeded, setSponsorshipNeeded] = useState(workAuth.sponsorship_needed || 'no');
  const [rightToWork, setRightToWork] = useState(workAuth.right_to_work || '');
  const [newCountry, setNewCountry] = useState('');

  useEffect(() => {
    onChange?.({
      work_authorization: {
        countries,
        visa_status: visaStatus,
        sponsorship_needed: sponsorshipNeeded,
        right_to_work: rightToWork,
      }
    });
  }, [countries, visaStatus, sponsorshipNeeded, rightToWork]);

  const handleAddCountry = () => {
    if (newCountry.trim() && !countries.includes(newCountry.trim())) {
      setCountries([...countries, newCountry.trim()]);
      setNewCountry('');
    }
  };

  const handleRemoveCountry = (country: string) => {
    setCountries(countries.filter(c => c !== country));
  };

  return (
    <div className="space-y-6">
      {/* Countries Authorized to Work */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Countries Authorized to Work
        </Label>
        <div className="flex gap-2">
          <Input
            value={newCountry}
            onChange={(e) => setNewCountry(e.target.value)}
            placeholder={t("eg_united_states", "e.g., United States")}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCountry()}
          />
          <Button onClick={handleAddCountry} variant="outline">
            {t('common:add')}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {countries.map((country) => (
            <Badge key={country} variant="secondary" className="flex items-center gap-1">
              {country}
              <X
                className="w-3 h-3 cursor-pointer hover:text-destructive"
                onClick={() => handleRemoveCountry(country)}
              />
            </Badge>
          ))}
        </div>
      </div>

      {/* Visa Status */}
      <div className="space-y-2">
        <Label htmlFor="visa_status">{t("visa_status", "Visa Status")}</Label>
        <Input
          id="visa_status"
          value={visaStatus}
          onChange={(e) => setVisaStatus(e.target.value)}
          placeholder={t("eg_h1b_green_card", "e.g., H1B, Green Card, Citizen")}
        />
      </div>

      {/* Sponsorship Needed */}
      <div className="space-y-2">
        <Label htmlFor="sponsorship_needed">{t("sponsorship_needed", "Sponsorship Needed")}</Label>
        <Select value={sponsorshipNeeded} onValueChange={setSponsorshipNeeded}>
          <SelectTrigger id="sponsorship_needed">
            <SelectValue placeholder={t("select_sponsorship_requirement", "Select sponsorship requirement")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">{t("no_authorized_to_work", "No - Authorized to work")}</SelectItem>
            <SelectItem value="yes">{t("yes_requires_sponsorship", "Yes - Requires sponsorship")}</SelectItem>
            <SelectItem value="future">{t("not_now_but_in", "Not now, but in future")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Right to Work Details */}
      <div className="space-y-2">
        <Label htmlFor="right_to_work">{t("right_to_work_details", "Right to Work Details")}</Label>
        <Input
          id="right_to_work"
          value={rightToWork}
          onChange={(e) => setRightToWork(e.target.value)}
          placeholder={t("additional_work_authorization_details", "Additional work authorization details")}
        />
      </div>
    </div>
  );
}
