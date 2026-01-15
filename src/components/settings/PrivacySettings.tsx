import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Shield, Ban, X } from 'lucide-react';
import { StealthModeToggle } from '@/components/StealthModeToggle';
import { CompanySearch } from '@/components/CompanySearch';

interface PrivacySettingsProps {
  blockedCompanies: string[];
  setBlockedCompanies: (value: string[]) => void;
  companySearchQuery: string;
  setCompanySearchQuery: (value: string) => void;
  stealthModeEnabled: boolean;
  stealthModeLevel: number;
  allowStealthColdOutreach: boolean;
  onStealthModeChange: (enabled: boolean) => void;
  onStealthLevelChange: (level: number) => void;
  onColdOutreachChange: (allowed: boolean) => void;
  privacySettings: {
    share_full_name: boolean;
    share_email: boolean;
    share_phone: boolean;
    share_location: boolean;
    share_current_title: boolean;
    share_linkedin_url: boolean;
    share_career_preferences: boolean;
    share_resume: boolean;
    share_salary_expectations: boolean;
    share_notice_period: boolean;
  };
  onPrivacyToggle: (setting: string) => void;
  onSave: () => void;
  onExportData: () => void;
  saving: boolean;
}

export const PrivacySettings = ({
  blockedCompanies,
  setBlockedCompanies,
  companySearchQuery,
  setCompanySearchQuery,
  stealthModeEnabled,
  stealthModeLevel,
  allowStealthColdOutreach,
  onStealthModeChange,
  onStealthLevelChange,
  onColdOutreachChange,
  privacySettings,
  onPrivacyToggle,
  onSave,
  onExportData,
  saving
}: PrivacySettingsProps) => {
  const handleAddBlockedCompany = (company: { name: string; domain?: string }) => {
    if (company.name && !blockedCompanies.includes(company.name)) {
      const newCompanies = [...blockedCompanies, company.name];
      setBlockedCompanies(newCompanies);
      setCompanySearchQuery("");
    }
  };

  const handleRemoveBlockedCompany = (company: string) => {
    setBlockedCompanies(blockedCompanies.filter(c => c !== company));
  };

  const countSharedFields = () => {
    return Object.values(privacySettings).filter(Boolean).length;
  };

  return (
    <div className="space-y-4">

      {/* Profile Information Sharing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Profile Information Sharing
          </CardTitle>
          <CardDescription>
            Choose what information you'd like to share with potential employers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning Banner */}
          <div className="p-4 border-2 border-amber-500/20 rounded-lg bg-amber-500/5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-amber-500 mb-1">Matching Impact</h4>
                <p className="text-sm text-muted-foreground">
                  Sharing less information reduces the likelihood of finding the perfect match. 
                  Our AI uses your complete profile to find opportunities that align with your goals and expertise.
                  Currently sharing <strong>{countSharedFields()} of 10</strong> fields.
                </p>
              </div>
            </div>
          </div>

          {/* Privacy Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Share Full Name</Label>
              <Switch
                checked={privacySettings.share_full_name}
                onCheckedChange={() => onPrivacyToggle('share_full_name')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Share Email Address</Label>
              <Switch
                checked={privacySettings.share_email}
                onCheckedChange={() => onPrivacyToggle('share_email')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Share Phone Number</Label>
              <Switch
                checked={privacySettings.share_phone}
                onCheckedChange={() => onPrivacyToggle('share_phone')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Share Location</Label>
              <Switch
                checked={privacySettings.share_location}
                onCheckedChange={() => onPrivacyToggle('share_location')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Share Current Title</Label>
              <Switch
                checked={privacySettings.share_current_title}
                onCheckedChange={() => onPrivacyToggle('share_current_title')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Share LinkedIn Profile</Label>
              <Switch
                checked={privacySettings.share_linkedin_url}
                onCheckedChange={() => onPrivacyToggle('share_linkedin_url')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Share Career Preferences</Label>
              <Switch
                checked={privacySettings.share_career_preferences}
                onCheckedChange={() => onPrivacyToggle('share_career_preferences')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Share Resume/CV</Label>
              <Switch
                checked={privacySettings.share_resume}
                onCheckedChange={() => onPrivacyToggle('share_resume')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Share Salary Expectations</Label>
              <Switch
                checked={privacySettings.share_salary_expectations}
                onCheckedChange={() => onPrivacyToggle('share_salary_expectations')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Share Notice Period</Label>
              <Switch
                checked={privacySettings.share_notice_period}
                onCheckedChange={() => onPrivacyToggle('share_notice_period')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stealth Mode */}
      <StealthModeToggle
        stealthModeEnabled={stealthModeEnabled}
        stealthModeLevel={stealthModeLevel}
        allowStealthColdOutreach={allowStealthColdOutreach}
        onStealthModeChange={onStealthModeChange}
        onStealthLevelChange={onStealthLevelChange}
        onColdOutreachChange={onColdOutreachChange}
      />

      {/* Company Blocklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5" />
            Company Blocklist
          </CardTitle>
          <CardDescription>
            Ensure complete discretion - these companies won't see your profile or opportunities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CompanySearch
            value={companySearchQuery}
            onChange={setCompanySearchQuery}
            onSelect={handleAddBlockedCompany}
          />

          {blockedCompanies.length > 0 ? (
            <div className="space-y-2 mt-4">
              <p className="text-sm font-medium mb-3">Blocked Companies:</p>
              <div className="flex flex-wrap gap-2">
                {blockedCompanies.map((company) => (
                  <div
                    key={company}
                    className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-lg group hover:bg-destructive/20 transition-colors"
                  >
                    <span className="text-sm font-medium">{company}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlockedCompany(company)}
                      className="text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
              <Ban className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No companies blocked yet. Add companies to maintain your privacy.
              </p>
            </div>
          )}

          <div className="mt-4 p-4 bg-accent/5 border border-accent/20 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Blocked companies will not be able to view your profile, contact you, 
              or see that you've applied to their opportunities. Your information remains completely confidential.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export or delete your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Data Export (GDPR)</Label>
            <p className="text-sm text-muted-foreground">
              Download all your data in a portable format
            </p>
            <Button 
              variant="outline" 
              onClick={onExportData}
            >
              Request Data Export
            </Button>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-destructive">Delete Account</Label>
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all data
            </p>
            <Button variant="ghost" className="text-destructive">
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
